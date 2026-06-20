import React, { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { Contract, ContractTemplate } from "../types.js";
import { Search, Filter, Plus, Calendar, Landmark, CheckCircle, FileText, Send, Share2, Clipboard, ChevronRight, Eye, RefreshCw, AlertTriangle, ShieldCheck, Lock, CheckCircle2, Stamp, Fingerprint } from "lucide-react";
import { apiFetch } from "../lib/api.js";

export default function ContractsView() {
  const { currentCompany, currentUser } = useStore();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // States for search and filtering
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // UI state overlays
  const [showWizard, setShowWizard] = useState(false);
  const [showDetail, setShowDetail] = useState<Contract | null>(null);
  const [showDispatch, setShowDispatch] = useState<Contract | null>(null);

  // Wizard state machine
  const [wizardStep, setWizardStep] = useState(1); // 1 = Select Template/Zero, 2 = Fill Variables, 3 = Preview & Confirm
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualType, setManualType] = useState("serviço");
  const [manualValue, setManualValue] = useState("");
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");
  const [manualRelatedPartyName, setManualRelatedPartyName] = useState("");
  const [manualRelatedPartyInfo, setManualRelatedPartyInfo] = useState("");
  const [manualContent, setManualContent] = useState("");
  
  // Storage for dynamic template-filled fields
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, string>>({});

  // Dispatch signature state
  const [dispatchReceipients, setDispatchRecipients] = useState([
    { channel: "E-mail", recipient: "" }
  ]);

  const fetchContractDetails = async (contractId: string) => {
    if (!currentCompany?.id) return null;
    const res = await apiFetch(`/api/contracts/${contractId}`, {
      headers: {
        "x-company-id": currentCompany.id,
        "x-user-id": currentUser?.id || "",
      },
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || "Falha ao carregar detalhes do contrato.");
    }

    return res.json();
  };

  // Fetch contracts
  const fetchContracts = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append("search", search);
      if (selectedType) q.append("type", selectedType);
      if (selectedStatus) q.append("status", selectedStatus);

      const res = await apiFetch(`/api/contracts?${q.toString()}`, {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setContracts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch templates for Wizard
  const fetchTemplates = async () => {
    if (!currentCompany?.id) return;
    try {
      const res = await apiFetch("/api/templates", {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchTemplates();
  }, [currentCompany?.id, currentUser?.id, selectedType, selectedStatus]);

  useEffect(() => {
    const handleTriggerWizard = () => {
      startWizard();
    };
    const handleFilterStatus = (e: Event) => {
      const status = (e as CustomEvent).detail;
      if (status !== undefined) {
        setSelectedStatus(status);
      }
    };
    window.addEventListener("trigger-contract-wizard", handleTriggerWizard);
    window.addEventListener("filter-contract-status", handleFilterStatus as EventListener);
    return () => {
      window.removeEventListener("trigger-contract-wizard", handleTriggerWizard);
      window.removeEventListener("filter-contract-status", handleFilterStatus as EventListener);
    };
  }, []);

  // Handle Search Trigger on submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContracts();
  };

  // Wizard transitions
  const startWizard = () => {
    setSelectedTemplate(null);
    setManualTitle("");
    setManualType("serviço");
    setManualValue("");
    setManualStartDate("");
    setManualEndDate("");
    setManualRelatedPartyName("");
    setManualRelatedPartyInfo("");
    setManualContent("");
    setTemplateFieldValues({});
    setWizardStep(1);
    setShowWizard(true);
  };

  const handleSelectTemplate = (tpl: ContractTemplate | null) => {
    setSelectedTemplate(tpl);
    if (tpl) {
      setManualType(tpl.category);
      setManualTitle(tpl.name + " - Novo");
      // Populate field templates empty states
      const fieldsMap: Record<string, string> = {};
      tpl.fields?.forEach(f => {
        fieldsMap[f.name] = "";
      });
      setTemplateFieldValues(fieldsMap);
    } else {
      setManualTitle("");
      setManualType("serviço");
    }
    setWizardStep(2);
  };

  const generateCompiledText = () => {
    if (!selectedTemplate) return manualContent;
    let text = selectedTemplate.baseContent;
    Object.entries(templateFieldValues).forEach(([key, val]) => {
      text = text.replace(new RegExp(`\\[${key}\\]`, "g"), val || `[${key}]`);
    });
    return text;
  };

  const submitWizard = async () => {
    if (!currentCompany?.id) return;
    const finalContent = selectedTemplate ? generateCompiledText() : manualContent;

    // Use specific filled fields or default
    const finalValue = selectedTemplate 
      ? (templateFieldValues["VALOR_TOTAL"] || templateFieldValues["VALOR_MENSAL"] || templateFieldValues["VALOR"] || "0")
      : manualValue;

    const finalStart = selectedTemplate
      ? (templateFieldValues["DATA_INICIO"] || templateFieldValues["DATA_IN"] || new Date().toISOString().split("T")[0])
      : manualStartDate;

    const finalEnd = selectedTemplate
      ? (templateFieldValues["DATA_CONCLUSAO"] || templateFieldValues["DATA_ENCERRAMENTO"] || templateFieldValues["DATA_FIM"] || templateFieldValues["DATA_OUT"] || new Date().toISOString().split("T")[0])
      : manualEndDate;

    const finalRelatedName = selectedTemplate
      ? (templateFieldValues["NOME_CONTRATADO"] || templateFieldValues["CONTRATADO_NOME"] || templateFieldValues["LOCADORA_NOME"] || templateFieldValues["NOME_LOCATARIO"] || "Parceiro")
      : manualRelatedPartyName;

    const finalRelatedInfo = selectedTemplate
      ? `CPF/CNPJ: ${templateFieldValues["DOCUMENTO_CONTRATADO"] || templateFieldValues["LOCADORA_CNPJ"] || templateFieldValues["CNPJ_LOCATARIO"] || ""}`
      : manualRelatedPartyInfo;

    try {
      const res = await apiFetch("/api/contracts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          title: manualTitle,
          type: manualType,
          value: parseFloat(finalValue) || 0,
          startDate: finalStart,
          endDate: finalEnd,
          relatedPartyName: finalRelatedName,
          relatedPartyInfo: finalRelatedInfo,
          content: finalContent,
          status: "Rascunho",
        })
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar rascunho de contrato.");
      }

      setShowWizard(false);
      fetchContracts();
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
  };

  // Submit Signature Dispatches
  const dispatchSignatureRequests = async (contract: Contract) => {
    if (!currentCompany?.id) return;
    try {
      const res = await apiFetch(`/api/contracts/${contract.id}/signature-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          requests: dispatchReceipients,
        })
      });

      if (!res.ok) throw new Error("Erro ao despachar.");
      
      setShowDispatch(null);
      setDispatchRecipients([{ channel: "E-mail", recipient: "" }]);
      await fetchContracts();
      if (showDetail?.id === contract.id) {
        const refreshed = await fetchContractDetails(contract.id);
        setShowDetail(refreshed);
      }
      alert("Contrato enviado para assinatura! Foram criados os links de teste.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Interactive Fast Renewal Action
  const extendContractGrace = async (contract: Contract) => {
    if (!currentCompany?.id) return;
    const confirmRenew = confirm(`Deseja prorrogar o prazo de vigência deste contrato (${contract.title}) por mais 6 meses?`);
    if (!confirmRenew) return;

    try {
      const oldEnd = new Date(contract.endDate);
      oldEnd.setMonth(oldEnd.getMonth() + 6);

      const res = await apiFetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          endDate: oldEnd.toISOString().split("T")[0],
          status: "Ativo", // make sure it's active again
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Não foi possível renovar o contrato.");
      }

      await fetchContracts();
      const refreshed = await fetchContractDetails(contract.id);
      if (refreshed) {
        setShowDetail(prev => prev?.id === contract.id ? refreshed : prev);
      }
      alert("Prorrogado por mais 6 meses! Vigência recalculada.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao renovar contrato.");
    }
  };

  // End contract premature termination
  const terminateContract = async (contract: Contract) => {
    if (!currentCompany?.id) return;
    const confirmClose = confirm(`Tem certeza que deseja encerrar sumariamente ${contract.title}?`);
    if (!confirmClose) return;

    try {
      const res = await apiFetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          status: "Encerrado",
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Não foi possível encerrar o contrato.");
      }

      await fetchContracts();
      const refreshed = await fetchContractDetails(contract.id);
      if (refreshed) {
        setShowDetail(prev => prev?.id === contract.id ? refreshed : prev);
      }
      alert("Contrato encerrado.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao encerrar contrato.");
    }
  };

  const generateAddendum = async (contract: Contract) => {
    if (!currentCompany?.id) return;

    const reason = prompt("Informe o motivo do aditivo:", "Prorrogação de vigência e adequação financeira.");
    if (reason === null) return;

    const suggestedDate = new Date(contract.endDate);
    suggestedDate.setMonth(suggestedDate.getMonth() + 6);
    const newEndDate = prompt(
      "Informe a nova data final do aditivo (AAAA-MM-DD):",
      suggestedDate.toISOString().split("T")[0]
    );
    if (!newEndDate) return;

    const additionalValue = prompt("Informe o acréscimo de valor do aditivo (opcional):", "0");
    if (additionalValue === null) return;

    try {
      const res = await apiFetch(`/api/contracts/${contract.id}/addendum`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          reason,
          newEndDate,
          additionalValue,
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Não foi possível gerar o aditivo.");
      }

      const addendum = await res.json();
      await fetchContracts();
      const refreshed = await fetchContractDetails(addendum.id);
      setShowDetail(refreshed);
      alert("Aditivo gerado como novo rascunho para revisão e assinatura.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao gerar aditivo.");
    }
  };

  return (
    <div className="space-y-6" id="contracts-view-container">
      {/* Upper action context */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Módulo de Contratos & Ativos</h2>
          <p className="text-xs text-slate-500 mt-1">Criação assistida por modelo, rastreabilidade técnica e vigência.</p>
        </div>
        <button
          onClick={startWizard}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs px-3.5 py-2 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Plus className="h-4 w-4" /> Novo Contrato (Guia Assistido)
        </button>
      </div>

      {/* Advanced Filters Block */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-4 items-end">
          {/* Search bar */}
          <div className="flex-1 space-y-1 w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Procurar Conteúdo</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Busca por título, parceiro ou cláusula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="space-y-1 w-full lg:w-48">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="">Todos</option>
              <option value="serviço">Prestação de Serviço</option>
              <option value="trabalho">Trabalho</option>
              <option value="locação">Locação</option>
              <option value="obra">Obra / Empreitada</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1 w-full lg:w-48">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="">Todos</option>
              <option value="Rascunho">Rascunho</option>
              <option value="Aguardando assinatura">Aguardando Assinatura</option>
              <option value="Ativo">Vigente (Ativo)</option>
              <option value="Vencendo">Vencendo (&lt; 30 dias)</option>
              <option value="Encerrado">Encerrado</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full lg:w-auto">
            <button
              type="submit"
              className="w-full lg:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedType("");
                setSelectedStatus("");
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 transition-colors"
              title="Limpar Filtros"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Contracts table list */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
            Sincronizando banco de dados...
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhum contrato encontrado com as configurações de filtros solicitadas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200/60 text-[10pt] uppercase tracking-wider cursor-default">
                  <th className="py-2.5 px-4 font-bold text-[10px] tracking-wide">Parte Relacionada</th>
                  <th className="py-2.5 px-4 font-bold text-[10px] tracking-wide">Tipo</th>
                  <th className="py-2.5 px-4 font-bold text-[10px] tracking-wide">Valor Total</th>
                  <th className="py-2.5 px-4 font-bold text-[10px] tracking-wide">Início</th>
                  <th className="py-2.5 px-4 font-bold text-[10px] tracking-wide">Fim / Vigência</th>
                  <th className="py-2.5 px-4 font-bold text-[10px] tracking-wide">Status</th>
                  <th className="py-2.5 px-4 text-right font-bold text-[10px] tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {contracts.map((c) => {
                  let badgeColor = "bg-slate-50 text-slate-700 border-slate-200";
                  if (c.status === "Ativo") {
                    badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                  } else if (c.status === "Aguardando assinatura") {
                    badgeColor = "bg-amber-50 text-amber-700 border border-amber-100";
                  } else if (c.status === "Rascunho") {
                    badgeColor = "bg-blue-50 text-blue-700 border border-blue-100";
                  } else if (c.status === "Vencendo") {
                    badgeColor = "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse";
                  } else if (c.status === "Encerrado") {
                    badgeColor = "bg-slate-50 text-slate-650 border border-slate-200";
                  }

                  const formattedVal = new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(c.value);

                  // Vigência restante calculada
                  const rDays = c.daysRemaining !== undefined ? c.daysRemaining : 0;
                  const tenureText = rDays > 30 ? `${Math.round(rDays / 30)} meses` : `${rDays} dias`;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{c.relatedPartyName}</div>
                        <div className="text-[11px] text-slate-450 mt-1 truncate max-w-xs">{c.title}</div>
                      </td>
                      <td className="py-3 px-4 text-[10px] font-bold font-mono text-slate-500 uppercase">
                        {c.type}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-900 font-mono">
                        {formattedVal}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(c.startDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="font-semibold text-slate-800">{new Date(c.endDate).toLocaleDateString("pt-BR")}</span>
                        <div className="text-slate-400 mt-0.5 text-[9px] font-mono leading-none">Restam {tenureText}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details icon */}
                          <button
                            onClick={async () => {
                              try {
                                const detailed = await fetchContractDetails(c.id);
                                setShowDetail(detailed);
                              } catch (err: any) {
                                alert(err.message || "Erro ao carregar contrato.");
                              }
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                            title="Visualizar Contrato Completo"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Signature Request Dispatch if Rascunho / Pending */}
                          {(c.status === "Rascunho" || c.status === "Aguardando assinatura") && (
                            <button
                              onClick={() => {
                                setShowDispatch(c);
                                setDispatchRecipients([{ channel: "E-mail", recipient: "" }]);
                              }}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                              title="Configurar Fluxo de Assinatura"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}

                          {/* Renewal Action if Active / Expiring */}
                          {(c.status === "Ativo" || c.status === "Vencendo") && (
                            <button
                              onClick={() => extendContractGrace(c)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors text-xs font-medium px-2"
                              title="Prorrogar Vigência por 6 meses"
                            >
                              Renovar
                            </button>
                          )}

                          {(c.status === "Ativo" || c.status === "Vencendo") && (
                            <button
                              onClick={() => generateAddendum(c)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors text-xs font-medium px-2"
                              title="Gerar Aditivo"
                            >
                              Aditivo
                            </button>
                          )}

                          {/* Encerrar prematurely */}
                          {c.status !== "Encerrado" && (
                            <button
                              onClick={() => terminateContract(c)}
                              className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-700 rounded-lg transition-colors text-xs font-medium px-2"
                              title="Cancelar ou Encerrar Contrato"
                            >
                              Encerrar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. CONTRACT WIZARD DIALOG OVERLAY */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" /> Preenchimento Guiado de Contrato
                </h3>
                <p className="text-xs text-slate-500 mt-1">Siga os passos estruturados guiados por inteligência de templates.</p>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold font-mono">
                &times;
              </button>
            </div>

            {/* Stepper Wizard Indicator */}
            <div className="bg-slate-100/50 px-6 py-3 border-b border-slate-150 flex items-center justify-between text-xs font-semibold text-slate-450">
              <span className={wizardStep >= 1 ? "text-indigo-600 font-bold" : ""}>1. Escolha do Modelo</span>
              <ChevronRight className="h-3 w-3" />
              <span className={wizardStep >= 2 ? "text-indigo-600 font-bold" : ""}>2. Campos Variáveis (Dados)</span>
              <ChevronRight className="h-3 w-3" />
              <span className={wizardStep >= 3 ? "text-indigo-600 font-bold" : ""}>3. Visualização & Gravação</span>
            </div>

            {/* Content overflow box */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* STEP 1: SELECT MODEL */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-650">Escolha uma base para autogeneração de dados:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Raw creation model Card */}
                    <div
                      onClick={() => handleSelectTemplate(null)}
                      className="border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div>
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">Livre</span>
                        <h5 className="font-bold text-slate-800 text-sm mt-2">Contrato Customizado do Zero</h5>
                        <p className="text-xs text-slate-500 mt-1">Permite digitar clausulados livres em editor aberto sem preenchimento pré-parametrizado.</p>
                      </div>
                      <span className="text-indigo-600 text-xs font-bold mt-4 flex items-center gap-1">Avançar livremente &rarr;</span>
                    </div>

                    {/* Pre-seeded list */}
                    {templates.map(tpl => (
                      <div
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl)}
                        className="border border-slate-200 hover:border-indigo-500 p-5 rounded-2xl cursor-pointer transition-all hover:bg-slate-50"
                      >
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                          {tpl.category}
                        </span>
                        <h5 className="font-bold text-slate-800 text-sm mt-2">{tpl.name}</h5>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm truncate">Total de {tpl.fields?.length || 0} campos editáveis dinâmicos.</p>
                        <span className="text-indigo-600 text-xs font-bold mt-4 flex items-center gap-1 block">Escolher este &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: FILL VARIABLES */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <span className="text-xs uppercase font-bold text-indigo-600 tracking-wider">Você está criando:</span>
                    <h5 className="text-sm font-bold text-slate-800 mt-1">
                      {selectedTemplate ? selectedTemplate.name : "Contrato Customizado do Zero"}
                    </h5>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic Meta fields required by standard controller */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Título do Contrato (Painel)</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Reforma do Forro de Drywall Alpha..."
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {selectedTemplate === null ? (
                      // FREE TEXT COMPILER
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Categoria</label>
                          <select
                            value={manualType}
                            onChange={(e) => setManualType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                          >
                            <option value="serviço">Prestação de Serviço</option>
                            <option value="trabalho">Trabalho</option>
                            <option value="locação">Locação</option>
                            <option value="obra">Obra</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Valor Total (R$)</label>
                          <input
                            type="number"
                            placeholder="Ex: 15000"
                            value={manualValue}
                            onChange={(e) => setManualValue(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data Início</label>
                          <input
                            type="date"
                            value={manualStartDate}
                            onChange={(e) => setManualStartDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data Término previsto</label>
                          <input
                            type="date"
                            value={manualEndDate}
                            onChange={(e) => setManualEndDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Razão Social / Nome do Contratado</label>
                          <input
                            type="text"
                            placeholder="Ex: Pedro de Alencar Gesso Ltda"
                            value={manualRelatedPartyName}
                            onChange={(e) => setManualRelatedPartyName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CNPJ / Dados de Contato</label>
                          <input
                            type="text"
                            placeholder="CNPJ ou Fone de contato"
                            value={manualRelatedPartyInfo}
                            onChange={(e) => setManualRelatedPartyInfo(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cláusulas e Inteiro Teor do Contrato</label>
                          <textarea
                            rows={8}
                            placeholder="Escreva aqui as cláusulas do contrato..."
                            value={manualContent}
                            onChange={(e) => setManualContent(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none font-mono"
                          />
                        </div>
                      </>
                    ) : (
                      // DYNAMIC FIELD MAP GENERATED BY TEMPLATE FIELDS IN DB
                      selectedTemplate.fields?.map(field => (
                        <div key={field.id}>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                            {field.label} <span className="text-red-500 text-[10px] font-mono">[{field.name}]</span>
                          </label>
                          <input
                            type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                            value={templateFieldValues[field.name] || ""}
                            onChange={(e) => {
                              setTemplateFieldValues({
                                ...templateFieldValues,
                                [field.name]: e.target.value,
                              });
                            }}
                            placeholder={`Insira ${field.label.toLowerCase()}`}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: PREVIEW & CONFIRM */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-800">Visualização de Cláusulas Consolidadas:</h4>
                  <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs flex gap-2 items-center">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Os locais demarcados entre chaves foram substituídos dinamicamente pelos dados inseridos. Certifique-se da validade das informações.</span>
                  </div>
                  
                  {/* Realtime document compiler window */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 font-mono text-xs max-h-96 overflow-y-auto whitespace-pre-line text-slate-750">
                    {generateCompiledText() || "(Contrato sem conteúdo clausulado)"}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-100 flex justify-between bg-slate-50 rounded-b-3xl">
              {wizardStep > 1 ? (
                <button
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="px-4 py-2 bg-slate-300 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  Voltar
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowWizard(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-sm font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Sair
                </button>

                {wizardStep < 3 ? (
                  <button
                    onClick={() => {
                      if (!manualTitle) {
                        alert("Forneça pelo menos o título do contrato para o painel de acompanhamento.");
                        return;
                      }
                      setWizardStep(3);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all cursor-pointer"
                  >
                    Avançar para Visualização
                  </button>
                ) : (
                  <button
                    onClick={submitWizard}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <CheckCircle className="h-4 w-4" /> Salvar Rascunho
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTRACT DETAILS MODAL */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white rounded-t-3xl">
              <div>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                  {showDetail.type}
                </span>
                <h3 className="text-base font-extrabold mt-1">{showDetail.title}</h3>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-white text-xl font-bold font-mono">
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Simulated Physical Legal Paper Sheet (Left Pane, 7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden flex flex-col">
                  <div className="bg-slate-50 border-b border-slate-150 px-4 py-3 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-slate-400" /> Minuta de Via Física Certificada
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border
                      ${showDetail.status === "Ativo" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    `}>
                      {showDetail.status}
                    </span>
                  </div>

                  {/* Physical mock page */}
                  <div 
                    className="p-6 md:p-8 font-serif text-slate-900 text-xs bg-[linear-gradient(#fcfcfc_95%,#f1f5f9_100%)] h-[480px] overflow-y-auto space-y-5 select-text leading-relaxed"
                    id="doc-detail-paper"
                  >
                    {/* Official stamp/header of active Company */}
                    <div className="text-center font-sans space-y-1 pb-4 border-b border-slate-200">
                      <Stamp className="h-6 w-6 text-indigo-700 mx-auto" />
                      <h4 className="font-extrabold text-slate-900 uppercase tracking-widest text-[11px] mt-1">
                        {currentCompany?.name}
                      </h4>
                      <p className="text-[9px] text-slate-500 font-semibold font-mono">
                        CNPJ: {currentCompany?.cnpj}
                      </p>
                      <p className="text-[8px] text-indigo-600 font-bold tracking-wider font-mono">
                        AUTENTICAÇÃO PROTOCOLADA NO BLOCO ICP-BRASIL, EMISSÃO DIGITAL
                      </p>
                    </div>

                    {/* Meta summary block on paper sheet */}
                    <div className="font-sans text-[10px] bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-slate-700">
                      <p><strong>Instrumento:</strong> {showDetail.title}</p>
                      <p><strong>Tipo de Ativo:</strong> {showDetail.type.toUpperCase()}</p>
                      <p><strong>Valor Global Pactuado:</strong> R$ {showDetail.value.toLocaleString("pt-BR")}</p>
                      <p><strong>Vigência Declarada:</strong> {new Date(showDetail.startDate).toLocaleDateString("pt-BR")} a {new Date(showDetail.endDate).toLocaleDateString("pt-BR")}</p>
                    </div>

                    {/* Legal text content of the contract template */}
                    <div className="font-serif text-[11px] space-y-3 pt-1 text-slate-800 text-justify leading-relaxed">
                      <p className="indent-4">
                        <strong>CLÁUSULA PRIMEIRA:</strong> O presente instrumento regula o fornecimento de serviços, insumos engenharia e auditoria técnica relativos ao ativo supra identificado, a ser executado em mútua colaboração.
                      </p>
                      
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[9px] text-slate-600 uppercase whitespace-pre-wrap leading-normal">
                        {showDetail.content || "Ficha técnica e descrição de minuta não informada ou vazia."}
                      </div>

                      <p className="indent-4">
                        <strong>CLÁUSULA SEGUNDA:</strong> Em conformidade com a MP 2.200-2/2001, todos os signatários outorgam legalidade, autenticidade e fé jurídica absoluta aos termos pactuados neste terminal.
                      </p>
                    </div>

                    {/* Signature Signatures block inside paper sheet (A "Folha" showing signatures) */}
                    <div className="pt-5 border-t border-slate-200 space-y-3 font-sans">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Chaves de Validação Eletrônica
                      </h5>
                      
                      {showDetail.signatureRequests && showDetail.signatureRequests.length > 0 ? (
                        <div className="space-y-2.5">
                          {showDetail.signatureRequests.map((req, rIdx) => {
                            const isSigned = req.status === "Assinado";

                            return (
                              <div key={req.id} className="p-2.5 bg-slate-55 bg-slate-50/50 border border-slate-150 rounded-xl space-y-1 text-[10px]">
                                <div className="flex justify-between items-center font-mono">
                                  <span className="font-bold text-slate-700">{req.recipient}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase
                                    ${isSigned ? "bg-emerald-150 text-emerald-800 bg-emerald-100" : "bg-amber-100 text-amber-800"}`}
                                  >
                                    {isSigned ? "Assinado Digitalmente" : "Pendente"}
                                  </span>
                                </div>

                                {isSigned ? (
                                  <div className="text-[9px] text-slate-500 space-y-1 font-mono pl-2 border-l-2 border-indigo-500 leading-none">
                                    <p className="flex items-center gap-1 text-slate-700 font-semibold">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                      Assinado em {req.signedAt ? new Date(req.signedAt).toLocaleDateString("pt-BR") : ""} às {req.signedAt ? new Date(req.signedAt).toLocaleTimeString("pt-BR") : ""}
                                    </p>
                                    <p className="text-[8px] text-slate-400"><strong>SHA-256 HASH:</strong> md5_sha254_{req.id.slice(0, 8)}99c</p>
                                    
                                    {/* Simulated cursive signature visual wrapper */}
                                    <div className="pt-2">
                                      {req.signatureType === "drawn" && req.signatureValue ? (
                                        <div className="bg-white/95 p-1 rounded border border-indigo-200 inline-block shadow-xs">
                                          <img 
                                            src={req.signatureValue} 
                                            alt="Assinatura" 
                                            className="max-h-12 w-auto object-contain font-sans"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                      ) : req.signatureType === "typed" && req.signatureValue ? (
                                        <div className="inline-block border-b border-indigo-400 border-dashed px-3 pb-0.5">
                                          <span 
                                            className="text-indigo-600 text-sm italic font-semibold tracking-wider block"
                                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                                          >
                                            {req.signatureValue}
                                          </span>
                                          <span className="text-[8px] text-slate-400 block mt-0.5 font-sans">(Assinado via Teclado)</span>
                                        </div>
                                      ) : (
                                        <div className="inline-block border-b border-indigo-400 border-dashed px-3 pb-0.5">
                                          <span className="font-serif italic text-indigo-600 text-[11px] tracking-wide font-semibold" style={{ fontFamily: "Georgia, serif" }}>
                                            {req.signerName || req.recipient.split("@")[0].toUpperCase()}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {(req.signerName || req.signerCpf) && (
                                      <div className="pt-1 space-y-0.5 text-[8px] text-slate-500">
                                        {req.signerName && <p><strong>Assinante:</strong> {req.signerName}</p>}
                                        {req.signerCpf && <p><strong>CPF:</strong> {req.signerCpf}</p>}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center pt-0.5 text-[9px] text-slate-400">
                                    <span>Aguardando despacho eletrônico...</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 p-4 rounded-xl text-center text-slate-400 text-[10px] font-medium font-mono">
                          Nenhum signatário associado a esta minuta de contrato corporativo. Use "Configurar Fluxo" para disparar.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info and Actions Metadata (Right Pane, 5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Executive details card */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 text-xs">
                    <h4 className="font-black text-slate-400 uppercase tracking-wider text-[9px]">Ficha Cadastral do Contrato</h4>
                    
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Subcontratado / Parte Relacionada</span>
                      <p className="font-bold text-slate-900 text-xs">{showDetail.relatedPartyName}</p>
                      {showDetail.relatedPartyInfo && (
                        <p className="text-[10px] font-mono text-slate-500 mt-1">{showDetail.relatedPartyInfo}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[9px] text-slate-400 uppercase block font-semibold">Valor Global</span>
                        <span className="font-extrabold text-slate-800 font-mono text-xs">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(showDetail.value)}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[9px] text-slate-400 uppercase block font-semibold">Status de Ativo</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-150 inline-block mt-0.5">
                          {showDetail.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-500 space-y-1">
                      <p><strong>Emissão:</strong> {new Date(showDetail.startDate).toLocaleDateString("pt-BR")}</p>
                      <p><strong>Vigência Fim:</strong> {new Date(showDetail.endDate).toLocaleDateString("pt-BR")}</p>
                      <p><strong>Prazo Restante:</strong> {showDetail.daysRemaining !== undefined ? `${showDetail.daysRemaining} dias` : "N/A"}</p>
                    </div>
                  </div>

                  {/* Connected signature requests with copy handles */}
                  <div className="p-4 bg-indigo-50/40 border border-indigo-150 rounded-2xl space-y-3 text-xs">
                    <h5 className="text-[9px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1">
                      <Fingerprint className="h-4 w-4 text-indigo-600" /> Fluxo de Canais de Transmissão
                    </h5>
                    
                    {showDetail.signatureRequests && showDetail.signatureRequests.length > 0 ? (
                      <div className="space-y-2">
                        {showDetail.signatureRequests.map(req => (
                          <div key={req.id} className="p-2.5 bg-white border border-slate-150 rounded-xl flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold text-slate-800 font-mono truncate max-w-[150px]" title={req.recipient}>{req.recipient}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${req.status === "Assinado" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"}`}>
                                {req.status}
                              </span>
                            </div>
                            
                            {req.status === "Pendente" && (
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/api/signature-requests/${req.id}/sign`;
                                  navigator.clipboard.writeText(url);
                                  alert(`Link de assinatura simulada copiado para transferência! Siga para a aba de Assinaturas Eletrônicas para assinar agora.`);
                                }}
                                className="text-left text-indigo-600 hover:text-indigo-805 font-bold flex items-center gap-1 border-b border-indigo-200/50 hover:border-indigo-500 transition-all self-start text-[10px] pb-0.5"
                                title="Copiar Link de Assinatura"
                              >
                                <Clipboard className="h-3.5 w-3.5" /> Copiar Link de Assinatura
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-indigo-750/80 font-medium">
                        Não existem pedidos de assinantes ativos para esta via de minuta. Configure ou despache para gerar chaves públicas.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end">
              <button
                onClick={() => setShowDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONFIGURE SIGNATURE DISPATCH OVERLAY */}
      {showDispatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-155">
            <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-3xl flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Disparo de Assinatura Eletrônica</h4>
                <p className="text-xs text-slate-500 mt-0.5">Encaminhar para o e-mail ou WhatsApp das partes relacionadas.</p>
              </div>
              <button onClick={() => setShowDispatch(null)} className="text-slate-400 hover:text-slate-600 font-extrabold font-mono">&times;</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl text-xs">
                <span className="font-bold text-indigo-800">Contrato: </span>
                <span className="text-slate-700">{showDispatch.title}</span>
              </div>

              {dispatchReceipients.map((rec, idx) => (
                <div key={idx} className="space-y-3.5 p-4 border border-slate-150 rounded-2xl relative bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Signatário #{idx + 1}</span>
                    {dispatchReceipients.length > 1 && (
                      <button
                        onClick={() => {
                          const copy = [...dispatchReceipients];
                          copy.splice(idx, 1);
                          setDispatchRecipients(copy);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold"
                      >
                        &times; Remover
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Canal</label>
                      <select
                        value={rec.channel}
                        onChange={(e) => {
                          const copy = [...dispatchReceipients];
                          copy[idx].channel = e.target.value;
                          setDispatchRecipients(copy);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="E-mail">E-mail</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Ambos">Ambos</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Destinatário</label>
                      <input
                        type="text"
                        required
                        placeholder={rec.channel === "WhatsApp" ? "Ex: +5511999998888" : "Ex: pedro@empresa.com"}
                        value={rec.recipient}
                        onChange={(e) => {
                          const copy = [...dispatchReceipients];
                          copy[idx].recipient = e.target.value;
                          setDispatchRecipients(copy);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setDispatchRecipients([...dispatchReceipients, { channel: "E-mail", recipient: "" }]);
                }}
                className="w-full py-2 border border-dashed border-indigo-400 hover:border-indigo-600 rounded-xl text-indigo-600 hover:text-indigo-800 text-xs font-semibold text-center transition-colors shadow-sm"
              >
                + Adicionar Outro Destinatário / Co-Signatário
              </button>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-3xl">
              <button
                onClick={() => setShowDispatch(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => dispatchSignatureRequests(showDispatch)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-semibold shadow-md flex items-center gap-1"
              >
                <Send className="h-3 w-3" /> Disparar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
