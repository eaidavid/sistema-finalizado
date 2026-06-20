import { getPrisma } from "./db.js";

export async function seedDatabase() {
  const prisma = getPrisma();

  // Check if companies already exist
  const companyCount = await prisma.company.count();
  if (companyCount > 0) {
    console.log("Database already seeded.");
    return;
  }

  console.log("Seeding Database...");

  // 1. Create Companies (Multi-Tenant isolation)
  const acme = await prisma.company.create({
    data: {
      name: "ACME Construtora & Reformas Ltda",
      cnpj: "12.345.678/0001-99",
    },
  });

  const inova = await prisma.company.create({
    data: {
      name: "Inova Empreendimentos Imobiliários",
      cnpj: "98.765.432/0001-11",
    },
  });

  // 2. Create Users
  const userAcmeAdmin = await prisma.user.create({
    data: {
      email: "admin@acme.com.br",
      password: "senha123",
      name: "Ricardo Silva (Admin)",
      role: "ADMIN",
      companyId: acme.id,
    },
  });

  const userAcmeUser = await prisma.user.create({
    data: {
      email: "gestor@acme.com.br",
      password: "senha123",
      name: "Ana Costa",
      role: "USER",
      companyId: acme.id,
    },
  });

  const userInovaAdmin = await prisma.user.create({
    data: {
      email: "admin@inova.com.br",
      password: "senha123",
      name: "Marcelo Rebelo (Admin)",
      role: "ADMIN",
      companyId: inova.id,
    },
  });

  // 3. Create Templates for ACME
  const templatesAcme = [
    {
      name: "Contrato de Prestação de Serviços (Mão de Obra)",
      category: "serviço",
      baseContent: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSTRUÇÃO CIVIL

CONTRATANTE: ACME Construtora & Reformas Ltda, inscrita no CNPJ/MF sob o nº 12.345.678/0001-99.
CONTRATADO: [NOME_CONTRATADO], portador do documento [DOCUMENTO_CONTRATADO], residente em [ENDERECO_CONTRATADO].

CLÁUSULA PRIMEIRA - DO OBJETO:
O objeto deste contrato é a execução de serviços de reforma/alvenaria descritos no Cronograma de Obras da localidade: [ENDERECO_OBRA].

CLÁUSULA SEGUNDA - DOS VALORES E FORMA DE PAGAMENTO:
Como contraprestação pelos serviços, a CONTRATANTE pagará o valor fixo total de R$ [VALOR_TOTAL], sob as seguintes medições e cronogramas.

CLÁUSULA TERCEIRA - DO PRAZO:
Os serviços terão início em [DATA_INICIO] e seu término estimado é para [DATA_CONCLUSAO].

Rio de Janeiro, [DATA_CONTRATO].

_______________________________
CONTRATANTE

_______________________________
CONTRATADO`,
      fields: [
        { name: "NOME_CONTRATADO", label: "Nome do Contratado", type: "text" },
        { name: "DOCUMENTO_CONTRATADO", label: "CPF/CNPJ do Contratado", type: "text" },
        { name: "ENDERECO_CONTRATADO", label: "Endereço do Contratado", type: "text" },
        { name: "ENDERECO_OBRA", label: "Local de Execução da Obra", type: "text" },
        { name: "VALOR_TOTAL", label: "Valor Total do Contrato (R$)", type: "number" },
        { name: "DATA_INICIO", label: "Data de Início", type: "date" },
        { name: "DATA_CONCLUSAO", label: "Data de Conclusão", type: "date" },
        { name: "DATA_CONTRATO", label: "Data do Contrato", type: "date" },
      ],
    },
    {
      name: "Contrato de Locação de Equipamentos e Máquinas",
      category: "locação",
      baseContent: `CONTRATO DE LOCAÇÃO DE EQUIPAMENTOS E BENS MÓVEIS

LOCATÁRIA: ACME Construtora & Reformas Ltda, CNPJ 12.345.678/0001-99.
LOCADORA: [LOCADORA_NOME], inscrita no CNPJ [LOCADORA_CNPJ].

OBJETO: A locadora cede para uso temporário o equipamento: [DESCRIÇÃO_EQUIPAMENTO] na obra localizada em [ENDERECO_OBRA].

VALORES: O valor mensal estipulado é de R$ [VALOR_MENSAL], com pagamento todo dia 10 de cada mês.
VIGÊNCIA: O contrato entra em vigor em [DATA_INICIO] e expira em [DATA_FIM].

São Paulo, [DATA_CONTRATO].

_______________________________
LOCATÁRIA

_______________________________
LOCADORA`,
      fields: [
        { name: "LOCADORA_NOME", label: "Razão Social Locadora", type: "text" },
        { name: "LOCADORA_CNPJ", label: "CNPJ da Locadora", type: "text" },
        { name: "DESCRIÇÃO_EQUIPAMENTO", label: "Descrição do Equipamento", type: "text" },
        { name: "ENDERECO_OBRA", label: "Local da Obra", type: "text" },
        { name: "VALOR_MENSAL", label: "Valor Mensal (R$)", type: "number" },
        { name: "DATA_INICIO", label: "Vigência Inicial", type: "date" },
        { name: "DATA_FIM", label: "Vigência Final", type: "date" },
        { name: "DATA_CONTRATO", label: "Data do Contrato", type: "date" },
      ],
    },
    {
      name: "Contrato de Trabalho Individual de Engenharia",
      category: "trabalho",
      baseContent: `CONTRATO DE TRABALHO POR PRAZO DETERMINADO

EMPREGADOR: ACME Construtora & Reformas Ltda, inscrita no CNPJ 12.345.678/0001-99.
EMPREGADO: [CONTRATADO_NOME], nacionalidade brasileira, engenheiro(a) civil.

CLÁUSULA PRIMEIRA - CARGO E SALÁRIO:
O empregado é contratado sob a função de Engenheiro Supervisor de Obra, percebendo o salário mensal de R$ [SALARIO_MENSAL].

CLÁUSULA SEGUNDA - VIGÊNCIA:
O presente contrato inicia em [DATA_INICIO] e estender-se-á por tempo determinado até [DATA_ENCERRAMENTO].

Belo Horizonte, [DATA_CONTRATO].

_______________________________
EMPREGADOR

_______________________________
EMPREGADO`,
      fields: [
        { name: "CONTRATADO_NOME", label: "Nome do Engenheiro", type: "text" },
        { name: "SALARIO_MENSAL", label: "Salário Mensal (R$)", type: "number" },
        { name: "DATA_INICIO", label: "Data de Admissão", type: "date" },
        { name: "DATA_ENCERRAMENTO", label: "Data de Encerramento", type: "date" },
        { name: "DATA_CONTRATO", label: "Data de Assinatura", type: "date" },
      ],
    }
  ];

  for (const t of templatesAcme) {
    const createdTemplate = await prisma.contractTemplate.create({
      data: {
        name: t.name,
        category: t.category,
        baseContent: t.baseContent,
        companyId: acme.id,
      },
    });

    for (const f of t.fields) {
      await prisma.contractTemplateField.create({
        data: {
          name: f.name,
          label: f.label,
          type: f.type,
          templateId: createdTemplate.id,
        },
      });
    }
  }

  // Seeding Template for Inova
  const rentTemplateInova = await prisma.contractTemplate.create({
    data: {
      name: "Contrato de Locação Comercial Base",
      category: "locação",
      baseContent: `CONTRATO DE LOCAÇÃO COMERCIAL INOVA

LOCADOR: Inova Empreendimentos Imobiliários, CNPJ 98.765.432/0001-11.
LOCATÁRIO: [NOME_LOCATARIO], CNPJ [CNPJ_LOCATARIO].

OBJETO: Aluguel do imóvel localizado em [END_IMOVEL] pelo valor de R$ [VALOR] mensais.
PRAZO: Início em [DATA_IN] e fim em [DATA_OUT].
`,
      companyId: inova.id,
    },
  });

  await prisma.contractTemplateField.createMany({
    data: [
      { name: "NOME_LOCATARIO", label: "Nome do Locatário", type: "text", templateId: rentTemplateInova.id },
      { name: "CNPJ_LOCATARIO", label: "CNPJ do Locatário", type: "text", templateId: rentTemplateInova.id },
      { name: "END_IMOVEL", label: "Endereço do Imóvel", type: "text", templateId: rentTemplateInova.id },
      { name: "VALOR", label: "Valor de Aluguel (R$)", type: "number", templateId: rentTemplateInova.id },
      { name: "DATA_IN", label: "Data de Início", type: "date", templateId: rentTemplateInova.id },
      { name: "DATA_OUT", label: "Data de Término", type: "date", templateId: rentTemplateInova.id },
    ],
  });

  // 4. Create Contracts for ACME
  // Contract 1: Signed (Ativo)
  const c1 = await prisma.contract.create({
    data: {
      title: "Construção de Galpão Industrial Zona Norte",
      type: "obra",
      status: "Ativo",
      value: 180000.00,
      startDate: new Date("2026-05-01T00:00:00Z"),
      endDate: new Date("2026-12-30T00:00:00Z"),
      relatedPartyName: "Cimento Forte Distribuidores S.A.",
      relatedPartyInfo: "CNPJ 44.555.666/0001-22, Fone (11) 98888-7777",
      content: "Contrato firmado para fornecimento de mão de obra de edificação de galpão na Av. das Nações Unidas, 4500.\nValor total pactuado de R$ 180.000,00.",
      companyId: acme.id,
    },
  });

  // Contract 2: Waiting signature
  const c2 = await prisma.contract.create({
    data: {
      title: "Serviços de Acabamento e Gesso - Residencial Alpha",
      type: "serviço",
      status: "Aguardando assinatura",
      value: 45000.00,
      startDate: new Date("2026-06-25T00:00:00Z"),
      endDate: new Date("2026-08-15T00:00:00Z"),
      relatedPartyName: "Gesso Rápido Decor Co.",
      relatedPartyInfo: "CNPJ 55.444.333/0001-11",
      content: "Instalação de forro de drywall rebaixado com sanca de gesso e molduras decorativas.",
      companyId: acme.id,
    },
  });

  // Signature Requests for Contract 2
  await prisma.signatureRequest.createMany({
    data: [
      {
        contractId: c2.id,
        channel: "E-mail",
        recipient: "parceiro@gessorapido.com.br",
        status: "Pendente",
      },
      {
        contractId: c2.id,
        channel: "WhatsApp",
        recipient: "+5511999998888",
        status: "Pendente",
      },
    ],
  });

  // Contract 3: Expired/Encerrado
  const c3 = await prisma.contract.create({
    data: {
      title: "Locação de Andaimes Tubulares Flexíveis",
      type: "locação",
      status: "Encerrado",
      value: 12000.00,
      startDate: new Date("2026-01-10T00:00:00Z"),
      endDate: new Date("2026-05-10T00:00:00Z"),
      relatedPartyName: "Aluga Andaimes S/A",
      relatedPartyInfo: "CNPJ 99.888.777/0001-11",
      content: "Locação de andaimes de ferro tubular para a fachada externa de reforma predial.",
      companyId: acme.id,
    },
  });

  // Contract 4: Vencendo Logo
  const c4 = await prisma.contract.create({
    data: {
      title: "Locação de Retroescavadeira CAT-320",
      type: "locação",
      status: "Vencendo",
      value: 28000.00,
      startDate: new Date("2026-04-10T00:00:00Z"),
      endDate: new Date("2026-07-15T00:00:00Z"), // Vencendo in < 30 days
      relatedPartyName: "RentaMaq Brasil Reservas",
      relatedPartyInfo: "CNPJ 88.777.666/0001-55",
      content: "Aluguel mensal por diárias corridas de veículo pesado retroescavadeira com operador.",
      companyId: acme.id,
    },
  });

  // 5. Create Obras for ACME
  // Obra 1 linked to Contract 1 (Ativo)
  const o1 = await prisma.obra.create({
    data: {
      name: "Galpão Industrial - Zona Norte",
      budgetPlanned: 150000.00,
      budgetSpent: 52400.00,
      status: "Execução",
      address: "Av. Marginal Direta do Tietê, 1200 - São Paulo, SP",
      companyId: acme.id,
      contractId: c1.id,
    },
  });

  // Checklist steps
  await prisma.obraStep.createMany({
    data: [
      { obraId: o1.id, phase: "planejamento", title: "Definição do escopo e projeto arquitetônico", isCompleted: true, completedAt: new Date("2026-05-02T00:00:00Z") },
      { obraId: o1.id, phase: "planejamento", title: "Licença de obras e aprovação da Prefeitura", isCompleted: true, completedAt: new Date("2026-05-10T00:00:00Z") },
      { obraId: o1.id, phase: "planejamento", title: "Vistoria técnica de Solo (Locação de Equipamento)", isCompleted: true, completedAt: new Date("2026-05-12T00:00:00Z") },
      { obraId: o1.id, phase: "execução", title: "Limpeza de terreno e Terraplenagem", isCompleted: true, completedAt: new Date("2026-05-20T00:00:00Z") },
      { obraId: o1.id, phase: "execução", title: "Fundações e vigas de fixação", isCompleted: true, completedAt: new Date("2026-06-05T00:00:00Z") },
      { obraId: o1.id, phase: "execução", title: "Ereção de estruturas metálicas e paredes", isCompleted: false },
      { obraId: o1.id, phase: "entrega", title: "Ligação elétrica industrial e telhas sanduíche", isCompleted: false },
      { obraId: o1.id, phase: "entrega", title: "Vistoria Final de Obra e emissão do Habite-se", isCompleted: false },
    ],
  });

  // Costs for Obra 1
  await prisma.obraCusto.createMany({
    data: [
      { obraId: o1.id, description: "Compra de vergalhões de aço Gerdau CA50", amount: 24500.00, category: "Materiais", date: new Date("2026-05-15T00:00:00Z") },
      { obraId: o1.id, description: "Locação de Caminhão Betoneira de Concreto Extra", amount: 8900.00, category: "Locação", date: new Date("2026-05-22T00:00:00Z") },
      { obraId: o1.id, description: "Pagamento de Diária de Equipe de Fundações", amount: 19000.00, category: "Mão de Obra", date: new Date("2026-06-01T00:00:00Z") },
    ],
  });

  // Purchase Order for Obra 1
  await prisma.purchaseOrder.create({
    data: {
      obraId: o1.id,
      orderNumber: "OC-2026-0001",
      payerCnpj: "12.345.678/0001-99", // ACME CNPJ
      description: "Fornecimento de vergalhões de aço estrutural de 10mm e 12mm",
      amount: 24500.00,
      status: "Aprovada",
      createdAt: new Date("2026-05-14T00:00:00Z"),
    },
  });

  // Initial Vistoria for Obra 1
  await prisma.obraVistoria.create({
    data: {
      obraId: o1.id,
      type: "Inicial",
      description: "Local do galpão limpo, com poucas plantas rasteiras, firmeza do solo razoável. Sem edificações vizinhas próximas.",
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600",
    },
  });

  // Obra 2
  const o2 = await prisma.obra.create({
    data: {
      name: "Reforma Hall de Entrada - Centro Empresarial Alpha",
      budgetPlanned: 60000.00,
      budgetSpent: 5000.00,
      status: "Planejamento",
      address: "Al. Rio Negro, 450 - Barueri, SP",
      companyId: acme.id,
    },
  });

  await prisma.obraStep.createMany({
    data: [
      { obraId: o2.id, phase: "planejamento", title: "Vistoria inicial e avaliação estrutural", isCompleted: true, completedAt: new Date("2026-06-10T00:00:00Z") },
      { obraId: o2.id, phase: "planejamento", title: "Confecção de Mockup 3D e design de interiores", isCompleted: false },
      { obraId: o2.id, phase: "execução", title: "Demolição de paredes de drywall antigas", isCompleted: false },
      { obraId: o2.id, phase: "execução", title: "Colocação de pisos de mármore e sanca de LED", isCompleted: false },
      { obraId: o2.id, phase: "entrega", title: "Mobiliário e Vistoria final", isCompleted: false },
    ],
  });

  await prisma.obraCusto.create({
    data: {
      obraId: o2.id,
      description: "Serviço de Design Gráfico Tridimensional",
      amount: 5000.00,
      category: "Outros",
      date: new Date("2026-06-11T00:00:00Z"),
    },
  });

  await prisma.obraVistoria.create({
    data: {
      obraId: o2.id,
      type: "Inicial",
      description: "Hall de entrada atual com carpetes antigos e rachaduras leves nas paredes do poço de elevador.",
      imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600",
    },
  });

  // 6. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { companyId: acme.id, userId: userAcmeAdmin.id, action: "Criação de Contrato", details: "Contrato 'Construção de Galpão Industrial Zona Norte' adicionado com status Ativo." },
      { companyId: acme.id, userId: userAcmeAdmin.id, action: "Criação de Obra", details: "Obra 'Galpão Industrial - Zona Norte' vinculada ao contrato." },
      { companyId: acme.id, userId: userAcmeUser.id, action: "Upload de Vistoria", details: "Adicionado registro fotográfico de vistoria inicial para 'Galpão Industrial - Zona Norte'." },
      { companyId: acme.id, userId: userAcmeUser.id, action: "Solicitação de Assinatura", details: "Solicitação gerada para o contrato 'Serviços de Acabamento e Gesso - Residencial Alpha'." },
    ],
  });

  console.log("Seeding Database completed successfully.");
}
