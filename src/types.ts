export interface Company {
  id: string;
  name: string;
  cnpj: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string; // "ADMIN" | "USER"
  companyId: string;
  createdAt: string;
}

export interface SignatureRequest {
  id: string;
  contractId: string;
  channel: string;
  recipient: string;
  status: string; // "Pendente" | "Assinado" | "Expirado"
  sentAt: string;
  signedAt?: string;
  signerName?: string;
  signerCpf?: string;
  signatureType?: string; // "drawn" | "typed"
  signatureValue?: string; // Holds base64 DataURL or typed value
}

export interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  value: number;
  startDate: string;
  endDate: string;
  relatedPartyName: string;
  relatedPartyInfo: string;
  content: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  daysRemaining?: number;
  signatureRequests?: SignatureRequest[];
}

export interface ContractTemplateField {
  id: string;
  name: string;
  label: string;
  type: string;
  templateId: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  baseContent: string;
  companyId: string;
  createdAt: string;
  fields?: ContractTemplateField[];
}

export interface Obra {
  id: string;
  name: string;
  budgetPlanned: number;
  budgetSpent: number;
  status: string; // "Planejamento" | "Execução" | "Concluído"
  address: string;
  companyId: string;
  contractId?: string;
  createdAt: string;
}

export interface ObraStep {
  id: string;
  obraId: string;
  phase: string; // "planejamento" | "execução" | "entrega"
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ObraVistoria {
  id: string;
  obraId: string;
  type: string; // "Inicial" | "Final"
  description: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ObraCusto {
  id: string;
  obraId: string;
  description: string;
  amount: number;
  category: string; // "Materiais" | "Mão de Obra" | "Locação" | "Outros"
  date: string;
}

export interface PurchaseOrder {
  id: string;
  obraId: string;
  orderNumber: string;
  payerCnpj: string;
  description: string;
  amount: number;
  status: string; // "Pendente" | "Aprovada" | "Cancelada"
  createdAt: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId?: string;
  user?: User;
  action: string;
  details: string;
  createdAt: string;
}

export interface DashboardStats {
  summary: {
    contractsCount: number;
    totalContractValue: number;
    contractsByStatus: {
      Rascunho: number;
      Aguardando: number;
      Ativo: number;
      Encerrado: number;
    };
    obrasCount: number;
    obrasByStatus: {
      Planejamento: number;
      Execucao: number;
      Concluido: number;
    };
    totalBudgetPlanned: number;
    totalBudgetSpent: number;
    budgetHealthPercent: number;
    categoryExpenseAmounts: Record<string, number>;
  };
  auditLogs: AuditLog[];
  expiringContracts?: Array<{
    id: string;
    title: string;
    endDate: string;
    value: number;
    relatedPartyName: string;
    status: string;
  }>;
}
