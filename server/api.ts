import { createHmac, timingSafeEqual } from "crypto";
import { Router } from "express";
import { getPrisma } from "./db.js";

export const apiRouter = Router();

// Middleware to inject prism client and extract tenant context
apiRouter.use((req, res, next) => {
  let companyId = req.headers["x-company-id"] as string | undefined;
  let userId = req.headers["x-user-id"] as string | undefined;

  const authHeader = req.headers.authorization;
  if ((!companyId || !userId) && authHeader?.startsWith("Bearer ")) {
    const parsed = verifySessionToken(authHeader.slice("Bearer ".length));
    if (parsed) {
      companyId = companyId || parsed.companyId;
      userId = userId || parsed.userId;
    }
  }

  // For public / bootstrap endpoints, we don't block
  req.companyId = companyId;
  req.userId = userId;
  next();
});

// Extending request interface locally
declare global {
  namespace Express {
    interface Request {
      companyId?: string;
      userId?: string;
    }
  }
}

// Helper to log audit actions
async function logAction(companyId: string, userId: string | undefined, action: string, details: string) {
  try {
    const prisma = getPrisma();
    await prisma.auditLog.create({
      data: {
        companyId,
        userId: userId || null,
        action,
        details,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || "local-dev-session-secret";
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signSessionToken(payload: { userId: string; companyId: string; role: string }) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string): null | { userId: string; companyId: string; role: string } {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// Helper to verify if the requesting user has the "ADMIN" role
async function verifyAdmin(req: any, res: any): Promise<boolean> {
  const companyId = req.headers["x-company-id"] as string || req.companyId;
  const userId = req.headers["x-user-id"] as string || req.userId;
  if (!companyId || !userId) {
    res.status(401).json({ error: "Identificação da empresa ou do usuário ausente na requisição." });
    return false;
  }
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user || user.companyId !== companyId) {
      res.status(401).json({ error: "Credenciais inválidas ou o usuário não está associado a esta empresa." });
      return false;
    }
    if (user.role !== "ADMIN") {
      res.status(403).json({ error: "Acesso restrito. Esta funcionalidade exige privilégios de Administrador." });
      return false;
    }
    return true;
  } catch (err: any) {
    res.status(500).json({ error: "Erro de segurança ao verificar permissões: " + err.message });
    return false;
  }
}

// -------------------------------------------------------------
// SEC_AUTH: Companies & Users Management (Isolation Check)
// -------------------------------------------------------------

// Strict server-side login endpoint
apiRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios para acesso seguro." });
    }
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { company: true }
    });

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado com o e-mail informado." });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Senha inválida. Por favor, tente novamente." });
    }

    const token = signSessionToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      company: user.company
    });
  } catch (error: any) {
    res.status(500).json({ error: "Erro interno de autenticação: " + error.message });
  }
});

// List All Companies for tenant selector
apiRouter.get("/auth/companies", async (req, res) => {
  try {
    const prisma = getPrisma();
    const cos = await prisma.company.findMany({
      orderBy: { name: "asc" },
    });
    res.json(cos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List Users for selected company
apiRouter.get("/auth/users", async (req, res) => {
  try {
    const { cid } = req.query;
    const targetCompanyId = (cid as string) || req.companyId;
    if (!targetCompanyId) {
      return res.status(400).json({ error: "Company ID query parameter required." });
    }
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: { companyId: targetCompanyId },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.patch("/auth/company", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;
    const { name, cnpj } = req.body;

    if (!name || !cnpj) {
      return res.status(400).json({ error: "Nome empresarial e CNPJ sÃ£o obrigatÃ³rios." });
    }

    const prisma = getPrisma();
    const existingByCnpj = await prisma.company.findFirst({
      where: {
        cnpj,
        NOT: { id: companyId },
      },
    });

    if (existingByCnpj) {
      return res.status(400).json({ error: "JÃ¡ existe outra empresa com este CNPJ cadastrado." });
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { name, cnpj },
    });

    await logAction(companyId, userId, "AtualizaÃ§Ã£o de Empresa", `Empresa atualizada para '${name}' (${cnpj}).`);
    res.json(updatedCompany);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new client tenant (Diferencial)
apiRouter.post("/auth/companies/new", async (req, res) => {
  try {
    const { name, cnpj, adminEmail, adminName, password } = req.body;
    if (!name || !cnpj) {
      return res.status(400).json({ error: "Name and CNPJ are required." });
    }
    const prisma = getPrisma();

    // Check if the request is made by a logged-in user inside the app.
    // If so, only permit ADMIN users to call it.
    const initiatingUserId = req.headers["x-user-id"] as string;
    if (initiatingUserId) {
      const dbUser = await prisma.user.findUnique({ where: { id: initiatingUserId } });
      if (!dbUser || dbUser.role !== "ADMIN") {
        return res.status(403).json({ error: "Permissão negada. Apenas administradores podem criar novas empresas de dentro do painel." });
      }
    }

    const exists = await prisma.company.findFirst({ where: { cnpj } });
    if (exists) {
      return res.status(400).json({ error: "Company CNPJ already registered." });
    }

    const newCompany = await prisma.company.create({
      data: { name, cnpj },
    });

    // Create an associated Admin user
    const newUser = await prisma.user.create({
      data: {
        email: (adminEmail || `admin@${name.toLowerCase().replace(/\s+/g, "")}.com`).trim().toLowerCase(),
        password: password || "senha123",
        name: adminName || "Administrador",
        role: "ADMIN",
        companyId: newCompany.id,
      },
    });

    await logAction(newCompany.id, newUser.id, "Início SaaS", `Tenant registrado: ${name} com CNPJ ${cnpj}`);

    res.json({ company: newCompany, user: newUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new corporate user under the current active company tenant
apiRouter.post("/auth/users/new", async (req, res) => {
  try {
    const companyId = req.headers["x-company-id"] as string;
    const userId = req.headers["x-user-id"] as string;

    if (!companyId || !userId) {
      return res.status(401).json({ error: "Contexto de empresa ou usuário não fornecido." });
    }

    const prisma = getPrisma();
    
    // Authorize initiator user
    const initiator = await prisma.user.findUnique({ where: { id: userId } });
    if (!initiator || initiator.companyId !== companyId || initiator.role !== "ADMIN") {
      return res.status(403).json({ error: "Permissão insuficiente. Apenas administradores do tenant podem criar usuários." });
    }

    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Nome, e-mail, senha e nível são obrigatórios." });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailExists = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (emailExists) {
      return res.status(400).json({ error: "Este e-mail já está sendo utilizado no sistema." });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email: trimmedEmail,
        password,
        role: role as any,
        companyId,
      },
    });

    await logAction(companyId, userId, "Cadastro de Usuário", `Criado novo usuário '${name}' com nível de acesso '${role}'`);
    res.json(newUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// -------------------------------------------------------------
// SEC_CONTRACTS: Templates & Builder
// -------------------------------------------------------------

// List Templates
apiRouter.get("/templates", async (req, res) => {
  try {
    const { companyId } = req;
    if (!companyId) return res.status(401).json({ error: "Tenant header x-company-id required." });

    const prisma = getPrisma();
    const templates = await prisma.contractTemplate.findMany({
      where: { companyId },
      include: { fields: true },
      orderBy: { name: "asc" },
    });
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new base template
apiRouter.post("/templates/new", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;

    const { name, category, baseContent, fields } = req.body;
    if (!name || !category || !baseContent) {
      return res.status(400).json({ error: "Missing required template fields (name, category, baseContent)." });
    }

    const prisma = getPrisma();
    const newTemplate = await prisma.contractTemplate.create({
      data: {
        name,
        category,
        baseContent,
        companyId,
      },
    });

    if (fields && Array.isArray(fields)) {
      for (const field of fields) {
        await prisma.contractTemplateField.create({
          data: {
            name: field.name,
            label: field.label,
            type: field.type || "text",
            templateId: newTemplate.id,
          },
        });
      }
    }

    await logAction(companyId, userId, "Criação de Template", `Criado modelo '${name}' de categoria '${category}'`);

    const result = await prisma.contractTemplate.findUnique({
      where: { id: newTemplate.id },
      include: { fields: true },
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.patch("/templates/:id", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;
    const { id } = req.params;
    const { name, category, baseContent, fields } = req.body;

    if (!name || !category || !baseContent) {
      return res.status(400).json({ error: "Missing required template fields (name, category, baseContent)." });
    }

    const prisma = getPrisma();
    const existing = await prisma.contractTemplate.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Template nÃ£o encontrado." });
    }

    await prisma.contractTemplate.update({
      where: { id },
      data: {
        name,
        category,
        baseContent,
      },
    });

    await prisma.contractTemplateField.deleteMany({
      where: { templateId: id },
    });

    if (fields && Array.isArray(fields)) {
      for (const field of fields) {
        await prisma.contractTemplateField.create({
          data: {
            name: field.name,
            label: field.label,
            type: field.type || "text",
            templateId: id,
          },
        });
      }
    }

    await logAction(companyId, userId, "AtualizaÃ§Ã£o de Template", `Template '${name}' atualizado.`);

    const result = await prisma.contractTemplate.findUnique({
      where: { id },
      include: { fields: true },
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete("/templates/:id", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;
    const { id } = req.params;

    const prisma = getPrisma();
    const existing = await prisma.contractTemplate.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Template nÃ£o encontrado." });
    }

    await prisma.contractTemplate.delete({
      where: { id },
    });

    await logAction(companyId, userId, "ExclusÃ£o de Template", `Template '${existing.name}' removido.`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// -------------------------------------------------------------
// SEC_CONTRACTS: Core Lifecycle (Contracts)
// -------------------------------------------------------------

// List contracts (with filtering & search)
apiRouter.get("/contracts", async (req, res) => {
  try {
    const { companyId } = req;
    if (!companyId) return res.status(401).json({ error: "Tenant header x-company-id required." });

    const { search, type, status } = req.query;
    const prisma = getPrisma();

    // Setup filter queries
    const whereClause: any = { companyId };

    if (type) {
      whereClause.type = type as string;
    }

    if (status) {
      whereClause.status = status as string;
    }

    if (search) {
      const qs = search as string;
      whereClause.OR = [
        { title: { contains: qs } },
        { relatedPartyName: { contains: qs } },
        { content: { contains: qs } },
      ];
    }

    // Dynamic calculating of 'Vigência Restante' on runtime state
    const contracts = await prisma.contract.findMany({
      where: whereClause,
      include: {
        signatureRequests: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const now = new Date();

    // Enforce dynamic status and calculations
    const processed = contracts.map(c => {
      const end = new Date(c.endDate);
      const start = new Date(c.startDate);
      const totalTime = end.getTime() - start.getTime();
      const timeLeft = end.getTime() - now.getTime();
      
      const daysRemaining = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
      const isExpired = timeLeft < 0;

      let computedStatus = c.status;
      if (computedStatus === "Ativo" && isExpired) {
        computedStatus = "Encerrado";
      } else if (computedStatus === "Ativo" && daysRemaining <= 30 && daysRemaining > 0) {
        computedStatus = "Vencendo";
      }

      return {
        ...c,
        status: computedStatus,
        daysRemaining,
      };
    });

    res.json(processed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// View specific Contract
apiRouter.get("/contracts/:id", async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    if (!companyId) return res.status(401).json({ error: "Tenant required." });

    const prisma = getPrisma();
    const contract = await prisma.contract.findFirst({
      where: { id, companyId },
      include: {
        signatureRequests: true,
        obras: true,
        uploads: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ error: "Contract not found or unauthorized." });
    }

    // Days remaining
    const end = new Date(contract.endDate);
    const daysRemaining = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    res.json({ ...contract, daysRemaining: Math.max(0, daysRemaining) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create single contract (Draft)
apiRouter.post("/contracts", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;

    const { title, type, value, startDate, endDate, relatedPartyName, relatedPartyInfo, content, status } = req.body;

    if (!title || !type || !value || !startDate || !endDate || !relatedPartyName) {
      return res.status(400).json({ error: "Missing required contract properties." });
    }

    const prisma = getPrisma();
    const contract = await prisma.contract.create({
      data: {
        title,
        type,
        value: parseFloat(value),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        relatedPartyName,
        relatedPartyInfo: relatedPartyInfo || "",
        content: content || "",
        status: status || "Rascunho",
        companyId,
      },
    });

    await logAction(companyId, userId, "Criação de Contrato", `Contrato '${title}' criado como '${status || "Rascunho"}' no valor de R$ ${value}`);

    res.json(contract);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update/Edit Contract
apiRouter.patch("/contracts/:id", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;
    const { id } = req.params;

    const prisma = getPrisma();
    const updateData: any = {};
    const possibleFields = ["title", "type", "value", "startDate", "endDate", "relatedPartyName", "relatedPartyInfo", "content", "status"];
    
    for (const f of possibleFields) {
      if (req.body[f] !== undefined) {
        if (f === "value") {
          updateData[f] = parseFloat(req.body[f]);
        } else if (f === "startDate" || f === "endDate") {
          updateData[f] = new Date(req.body[f]);
        } else {
          updateData[f] = req.body[f];
        }
      }
    }

    const updated = await prisma.contract.updateMany({
      where: { id, companyId },
      data: updateData,
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: "Contract not found or unauthorized." });
    }

    await logAction(companyId, userId, "Atualização de Contrato", `Contrato ID ${id} atualizado.`);
    const result = await prisma.contract.findUnique({ where: { id } });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/contracts/:id/addendum", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;
    const { id } = req.params;
    const { reason, newEndDate, additionalValue } = req.body;

    const prisma = getPrisma();
    const baseContract = await prisma.contract.findFirst({
      where: { id, companyId },
    });

    if (!baseContract) {
      return res.status(404).json({ error: "Contrato base nÃ£o encontrado." });
    }

    const parsedAdditionalValue = Number(additionalValue || 0);
    const nextEndDate = newEndDate ? new Date(newEndDate) : new Date(baseContract.endDate);
    if (Number.isNaN(nextEndDate.getTime())) {
      return res.status(400).json({ error: "Nova data de vigÃªncia invÃ¡lida." });
    }

    const addendumContent = [
      `ADITIVO CONTRATUAL REFERENTE AO CONTRATO: ${baseContract.title}`,
      "",
      `Motivo / objeto do aditivo: ${reason || "ProrrogaÃ§Ã£o e adequaÃ§Ã£o operacional."}`,
      `VigÃªncia original: ${new Date(baseContract.startDate).toLocaleDateString("pt-BR")} atÃ© ${new Date(baseContract.endDate).toLocaleDateString("pt-BR")}`,
      `Nova vigÃªncia proposta: ${nextEndDate.toLocaleDateString("pt-BR")}`,
      `AcrÃ©scimo financeiro: R$ ${parsedAdditionalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      "",
      "ClÃ¡usulas originais mantidas, exceto pelos ajustes descritos neste aditivo.",
      "",
      "Resumo do contrato de origem:",
      baseContract.content || "(Sem conteÃºdo base informado)",
    ].join("\n");

    const addendum = await prisma.contract.create({
      data: {
        title: `Aditivo - ${baseContract.title}`,
        type: baseContract.type,
        status: "Rascunho",
        value: baseContract.value + parsedAdditionalValue,
        startDate: new Date(baseContract.startDate),
        endDate: nextEndDate,
        relatedPartyName: baseContract.relatedPartyName,
        relatedPartyInfo: baseContract.relatedPartyInfo,
        content: addendumContent,
        companyId,
      },
    });

    await logAction(
      companyId,
      userId,
      "GeraÃ§Ã£o de Aditivo",
      `Aditivo criado a partir do contrato '${baseContract.title}' com novo vencimento em ${nextEndDate.toLocaleDateString("pt-BR")}.`
    );

    res.json(addendum);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// -------------------------------------------------------------
// SEC_SIGN: Electronic Signature Flows
// -------------------------------------------------------------

// Submit Contract for Signatures
apiRouter.post("/contracts/:id/signature-requests", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;
    const { id } = req.params;
    const { requests } = req.body; // Array of { channel: 'E-mail'|'WhatsApp'|'Ambos', recipient: string }

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: "At least one signature recipient is required." });
    }

    const prisma = getPrisma();
    const contract = await prisma.contract.findFirst({
      where: { id, companyId },
    });

    if (!contract) {
      return res.status(404).json({ error: "Contract not found." });
    }

    // Delete existing signature requests for clean resend
    await prisma.signatureRequest.deleteMany({
      where: { contractId: id },
    });

    // Create new requests
    const createdRequests = [];
    for (const r of requests) {
      const channelsToCreate = r.channel === "Ambos" ? ["E-mail", "WhatsApp"] : [r.channel];
      
      for (const chan of channelsToCreate) {
        const reqItem = await prisma.signatureRequest.create({
          data: {
            contractId: id,
            channel: chan,
            recipient: r.recipient,
            status: "Pendente",
          },
        });
        createdRequests.push(reqItem);
      }
    }

    // Update contract status
    await prisma.contract.update({
      where: { id },
      data: { status: "Aguardando assinatura" },
    });

    await logAction(
      companyId,
      userId,
      "Envio para Assinatura",
      `Encaminhado contrato '${contract.title}' com ${createdRequests.length} solicitações de assinatura.`
    );

    res.json({
      message: "Contrato encaminhado para assinatura.",
      requests: createdRequests,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Simulate Sign Action (Triggered when recipient clicks on the generated test link)
apiRouter.post("/signature-requests/:id/sign", async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();

    // Find the signature request
    const sigReq = await prisma.signatureRequest.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            signatureRequests: true,
          }
        }
      }
    });

    if (!sigReq) {
      return res.status(404).json({ error: "Signature request not found." });
    }

    if (sigReq.status === "Assinado") {
      return res.json({ message: "Já assinado anteriormente.", contract: sigReq.contract });
    }

    const { signerName, signerCpf, signatureType, signatureValue } = req.body;

    // Sign this request
    const updatedSig = await prisma.signatureRequest.update({
      where: { id },
      data: {
        status: "Assinado",
        signedAt: new Date(),
        signerName: signerName || null,
        signerCpf: signerCpf || null,
        signatureType: signatureType || null,
        signatureValue: signatureValue || null,
      },
    });

    // Check if ALL signature requests for this contract are now signed
    const allRequests = await prisma.signatureRequest.findMany({
      where: { contractId: sigReq.contractId },
    });

    const pendingCount = allRequests.filter(r => r.status !== "Assinado").length;

    let updatedContract = sigReq.contract;
    if (pendingCount === 0) {
      // Contract fully signed! Change status to "Ativo" and record log
      updatedContract = await prisma.contract.update({
        where: { id: sigReq.contractId },
        data: { status: "Ativo" },
        include: { signatureRequests: true, obras: true, uploads: true },
      });

      await logAction(
        sigReq.contract.companyId,
        undefined,
        "Assinatura Completa",
        `O contrato '${sigReq.contract.title}' foi assinado por todas as partes e está Ativo.`
      );
    } else {
      await logAction(
        sigReq.contract.companyId,
        undefined,
        "Parcialmente Assinado",
        `Destinatário [${sigReq.recipient}] assinou via ${sigReq.channel}. Restam ${pendingCount} assinaturas.`
      );
    }

    res.json({
      message: pendingCount === 0 ? "Contrato assinado em absoluto e arquivado como Ativo!" : "Assinatura registrada com sucesso.",
      request: updatedSig,
      contract: updatedContract,
      completed: pendingCount === 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// -------------------------------------------------------------
// SEC_OBRAS: Construction Projects & Budgets
// -------------------------------------------------------------

// List all Obras
apiRouter.get("/obras", async (req, res) => {
  try {
    const { companyId } = req;
    if (!companyId) return res.status(401).json({ error: "Tenant required." });

    const prisma = getPrisma();
    const obras = await prisma.obra.findMany({
      where: { companyId },
      include: {
        contract: true,
        steps: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute steps completion percent
    const processed = obras.map(o => {
      const totalSteps = o.steps.length;
      const completedSteps = o.steps.filter(s => s.isCompleted).length;
      const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      return {
        ...o,
        progressPercent,
      };
    });

    res.json(processed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Obra (optionally linking to contracts)
apiRouter.post("/obras", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;

    const { name, budgetPlanned, address, contractId } = req.body;
    if (!name || !budgetPlanned || !address) {
      return res.status(400).json({ error: "Name, planned budget and address are required." });
    }

    const prisma = getPrisma();
    const newObra = await prisma.obra.create({
      data: {
        name,
        budgetPlanned: parseFloat(budgetPlanned),
        address,
        status: "Planejamento",
        contractId: contractId || null,
        companyId,
      },
    });

    // Initialize Default steps following market best-practices (Diferencial de Pesquisa)
    const defaultSteps = [
      { phase: "planejamento", title: "Definição de escopo, briefing inicial e arquitetura", isCompleted: true, completedAt: new Date() },
      { phase: "planejamento", title: "Vistoria inicial descritiva e fotográfica (Obrigatória)", isCompleted: false },
      { phase: "planejamento", title: "Aprovação do orçamento executivo detalhado", isCompleted: false },
      { phase: "execução", title: "Mobilização de equipe, tapumes e ferramentas", isCompleted: false },
      { phase: "execução", title: "Lançamento de despesas e inspeções operacionais periódicas", isCompleted: false },
      { phase: "execução", title: "Instalação de gesso, fiações, revestimentos", isCompleted: false },
      { phase: "entrega", title: "Pós-limpeza profunda e finalização estética", isCompleted: false },
      { phase: "entrega", title: "Vistoria de qualidade e entrega das chaves", isCompleted: false },
    ];

    for (const step of defaultSteps) {
      await prisma.obraStep.create({
        data: {
          obraId: newObra.id,
          phase: step.phase,
          title: step.title,
          isCompleted: step.isCompleted,
          completedAt: step.completedAt,
        },
      });
    }

    // Automatically create initial photo-safari log structure if requested or default
    await prisma.obraVistoria.create({
      data: {
        obraId: newObra.id,
        type: "Inicial",
        description: "Vistoria de abertura do canteiro. Obra registrada aguardando checklist.",
      }
    });

    await logAction(companyId, userId, "Criação de Obra", `Canteiro de Obra '${name}' registrado. Orçamento: R$ ${budgetPlanned}`);

    const populated = await prisma.obra.findUnique({
      where: { id: newObra.id },
      include: { steps: true, contract: true },
    });

    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// View specific Obra details (Checklists, Vistorias, Costs, Purchase Orders)
apiRouter.get("/obras/:id", async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    if (!companyId) return res.status(401).json({ error: "Tenant required." });

    const prisma = getPrisma();
    const obra = await prisma.obra.findFirst({
      where: { id, companyId },
      include: {
        contract: true,
        steps: true,
        vistorias: true,
        costs: true,
        purchaseOrders: true,
        uploads: true,
      }
    });

    if (!obra) {
      return res.status(404).json({ error: "Obra not found." });
    }

    // Calculate percent progress
    const totalSteps = obra.steps.length;
    const completedSteps = obra.steps.filter(s => s.isCompleted).length;
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    res.json({
      ...obra,
      progressPercent,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Edit Obra (e.g. status)
apiRouter.patch("/obras/:id", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const { companyId, userId } = req;
    const { id } = req.params;
    const { status, name, address, budgetPlanned } = req.body;

    const prisma = getPrisma();
    
    const updateData: any = {};
    if (status) updateData.status = status;
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (budgetPlanned) updateData.budgetPlanned = parseFloat(budgetPlanned);

    await prisma.obra.update({
      where: { id },
      data: updateData,
    });

    await logAction(companyId, userId, "Alteração de Obra", `Obra ID ${id} atualizada.`);
    res.json({ message: "Obra atualizada." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Steps checklist
apiRouter.patch("/obras/:id/steps/:stepId", async (req, res) => {
  try {
    const { companyId, userId } = req;
    const { id, stepId } = req.params;
    const { isCompleted } = req.body;

    if (!companyId) return res.status(401).json({ error: "Tenant required." });

    const prisma = getPrisma();
    const step = await prisma.obraStep.update({
      where: { id: stepId, obraId: id },
      data: {
        isCompleted: !!isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    // Auto-update Obra status depending on completion states
    const allSteps = await prisma.obraStep.findMany({ where: { obraId: id } });
    const completedCount = allSteps.filter(s => s.isCompleted).length;
    
    let computedStatus = "Execução";
    if (completedCount === allSteps.length) {
      computedStatus = "Concluído";
    } else if (completedCount <= 1) {
      computedStatus = "Planejamento";
    }

    await prisma.obra.update({
      where: { id },
      data: { status: computedStatus },
    });

    await logAction(companyId, userId, "Modificação de Tarefa", `Tarefa '${step.title}' alterada para ${isCompleted ? "Concluída" : "Pendente"}. Novo status da obra: ${computedStatus}.`);

    res.json(step);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Launch Costs (Instantly incrementing budgetSpent)
apiRouter.post("/obras/:id/costs", async (req, res) => {
  try {
    const { companyId, userId } = req;
    const { id } = req.params;
    const { description, amount, category } = req.body;

    if (!companyId) return res.status(401).json({ error: "Tenant required." });
    if (!description || !amount || !category) {
      return res.status(400).json({ error: "Description, amount and category are required." });
    }

    const val = parseFloat(amount);
    const prisma = getPrisma();

    // Create cost
    const newCost = await prisma.obraCusto.create({
      data: {
        obraId: id,
        description,
        amount: val,
        category,
        date: new Date(),
      }
    });

    // Increment budgetSpent
    const currentObra = await prisma.obra.findUnique({ where: { id } });
    if (currentObra) {
      const newSpent = (currentObra.budgetSpent || 0) + val;
      await prisma.obra.update({
        where: { id },
        data: { budgetSpent: newSpent },
      });
    }

    await logAction(companyId, userId, "Lançamento de Despesa", `Custo lançado na Obra '${currentObra?.name}': R$ ${val} (${category} - ${description})`);

    res.json(newCost);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Log Inspection/Vistoria (initial/final record, photo capture)
apiRouter.post("/obras/:id/vistorias", async (req, res) => {
  try {
    const { companyId, userId } = req;
    const { id } = req.params;
    const { type, description, imageUrl } = req.body;

    if (!companyId) return res.status(401).json({ error: "Tenant required." });
    if (!type || !description) {
      return res.status(400).json({ error: "Vistoria type (Inicial/Final) and description are required." });
    }

    const prisma = getPrisma();
    const vist = await prisma.obraVistoria.create({
      data: {
        obraId: id,
        type,
        description,
        imageUrl: imageUrl || null,
      },
    });

    // Check if it is final-test and update Obra checklists/status
    if (type === "Final") {
      // Suggesting obra completion
      await logAction(companyId, userId, "Vistoria Final", `Realizada a vistoria final de conclusão da Obra ID ${id}. Descritivo: ${description}`);
    } else {
      await logAction(companyId, userId, "Vistoria Inicial", `Realizada a vistoria técnica inicial da Obra ID ${id}. Descritivo: ${description}`);
    }

    res.json(vist);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Emitting Purchase Order (Linked to Obra and payor CNPJ)
apiRouter.post("/obras/:id/purchase-orders", async (req, res) => {
  try {
    const { companyId, userId } = req;
    const { id } = req.params;
    const { description, amount, payerCnpj } = req.body;

    if (!companyId) return res.status(401).json({ error: "Tenant required." });
    if (!description || !amount || !payerCnpj) {
      return res.status(400).json({ error: "Description, amount and payer CNPJ are required." });
    }

    const val = parseFloat(amount);
    const prisma = getPrisma();

    // Verify payer CNPJ format
    const cleanedCnpj = payerCnpj.replace(/[^\d]/g, "");
    if (cleanedCnpj.length !== 14) {
      return res.status(400).json({ error: "CNPJ pagador inválido. Deve conter 14 dígitos numéricos." });
    }

    // Generate consecutive Order Number
    const count = await prisma.purchaseOrder.count();
    const serial = String(count + 1).padStart(4, "0");
    const year = new Date().getFullYear();
    const orderNumber = `OC-${year}-${serial}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        obraId: id,
        orderNumber,
        payerCnpj,
        description,
        amount: val,
        status: "Pendente",
      },
    });

    await logAction(companyId, userId, "Geração de O.C.", `Autorizada Ordem de Compra ${orderNumber} de R$ ${val} faturada para o CNPJ ${payerCnpj}`);

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Toggle Purchase Order Status (Aprovar / Cancelar)
apiRouter.patch("/purchase-orders/:id", async (req, res) => {
  try {
    const { companyId, userId } = req;
    const { id } = req.params;
    const { status } = req.body; // "Aprovada", "Cancelada"

    if (!companyId) return res.status(401).json({ error: "Tenant required." });

    const prisma = getPrisma();
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: "Ordem de compra não encontrada." });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
    });

    await logAction(companyId, userId, "Alteração de O.C.", `Ordem de Compra ${order.orderNumber} alterada para status '${status}'.`);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// -------------------------------------------------------------
// SEC_REPORTS: Analytical Consolidation (Dashboard & Exports)
// -------------------------------------------------------------

apiRouter.get("/reports/stats", async (req, res) => {
  try {
    const { companyId } = req;
    if (!companyId) return res.status(401).json({ error: "Tenant required." });

    const prisma = getPrisma();

    // Gather active raw items
    const [contracts, obras, auditLogs] = await Promise.all([
      prisma.contract.findMany({ where: { companyId }, include: { signatureRequests: true } }),
      prisma.obra.findMany({ where: { companyId }, include: { costs: true, steps: true } }),
      prisma.auditLog.findMany({ where: { companyId }, include: { user: true }, take: 15, orderBy: { createdAt: "desc" } }),
    ]);

    // Compute KPIs
    const totalContractValue = contracts.reduce((sum, c) => sum + c.value, 0);
    const contractsByStatus = {
      Rascunho: contracts.filter(c => c.status === "Rascunho").length,
      Aguardando: contracts.filter(c => c.status === "Aguardando assinatura").length,
      Ativo: contracts.filter(c => c.status === "Ativo" || c.status === "Vencendo").length,
      Encerrado: contracts.filter(c => c.status === "Encerrado" || c.status === "Expirado").length,
    };

    const obrasByStatus = {
      Planejamento: obras.filter(o => o.status === "Planejamento").length,
      Execucao: obras.filter(o => o.status === "Execução").length,
      Concluido: obras.filter(o => o.status === "Concluído").length,
    };

    const totalBudgetPlanned = obras.reduce((sum, o) => sum + o.budgetPlanned, 0);
    const totalBudgetSpent = obras.reduce((sum, o) => sum + o.budgetSpent, 0);

    // Distribution of expenses by category across all company projects
    const categoryDistribution: Record<string, number> = {
      "Materiais": 0,
      "Mão de Obra": 0,
      "Locação": 0,
      "Outros": 0,
    };

    obras.forEach(o => {
      o.costs.forEach(c => {
        if (categoryDistribution[c.category] !== undefined) {
          categoryDistribution[c.category] += c.amount;
        } else {
          categoryDistribution[c.category] = (categoryDistribution[c.category] || 0) + c.amount;
        }
      });
    });

    // Filter contracts about to expire in next 30 days
    const nowLocal = new Date();
    const thirtyDaysFromNow = new Date(nowLocal.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringContracts = contracts.filter(c => {
      if (c.status !== "Ativo" && c.status !== "Vencendo" && c.status !== "Aguardando assinatura") return false;
      const end = new Date(c.endDate);
      return end >= nowLocal && end <= thirtyDaysFromNow;
    }).map(c => ({
      id: c.id,
      title: c.title,
      endDate: c.endDate,
      value: c.value,
      relatedPartyName: c.relatedPartyName,
      status: c.status,
    }));

    res.json({
      summary: {
        contractsCount: contracts.length,
        totalContractValue,
        contractsByStatus,
        obrasCount: obras.length,
        obrasByStatus,
        totalBudgetPlanned,
        totalBudgetSpent,
        budgetHealthPercent: totalBudgetPlanned > 0 ? Math.round((totalBudgetSpent / totalBudgetPlanned) * 100) : 0,
        categoryExpenseAmounts: categoryDistribution,
      },
      auditLogs,
      expiringContracts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Seed-helper reset endpoint
apiRouter.post("/system/reset", async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;
    const prisma = getPrisma();
    // Perform cascading deletions in correct order
    await prisma.auditLog.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
    await prisma.obraCusto.deleteMany({});
    await prisma.obraVistoria.deleteMany({});
    await prisma.obraStep.deleteMany({});
    await prisma.upload.deleteMany({});
    await prisma.signatureRequest.deleteMany({});
    await prisma.contractTemplateField.deleteMany({});
    await prisma.contractTemplate.deleteMany({});
    await prisma.obra.deleteMany({});
    await prisma.contract.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});

    // Import and trigger seed Database from scratch
    const { seedDatabase } = await import("./seed.js");
    await seedDatabase();

    res.json({ success: true, message: "Banco de dados limpo e re-populado com os dados originais!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
