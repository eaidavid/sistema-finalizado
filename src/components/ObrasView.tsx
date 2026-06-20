import React, { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { Obra, Contract, ObraStep, ObraVistoria, ObraCusto, PurchaseOrder } from "../types.js";
import { Layers, MapPin, Landmark, ClipboardList, Camera, ShoppingBag, Plus, Percent, Check, Trash2, ArrowUpRight, TrendingUp, AlertCircle, FileText, Calendar, Wallet } from "lucide-react";
import { apiFetch } from "../lib/api.js";

export default function ObrasView() {
  const { currentCompany, currentUser } = useStore();
  const [obras, setObras] = useState<(Obra & { progressPercent: number })[]>([]);
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Focus Obra detail states
  const [selectedObra, setSelectedObra] = useState<(Obra & { progressPercent: number }) | null>(null);
  const [obraDetails, setObraDetails] = useState<any>(null); // holds checklist, costs, purchase orders, vistorias
  const [detailLoading, setDetailLoading] = useState(false);

  // Create Obra modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newObraName, setNewObraName] = useState("");
  const [newObraBudget, setNewObraBudget] = useState("");
  const [newObraAddress, setNewObraAddress] = useState("");
  const [newObraContractId, setNewObraContractId] = useState("");

  // Sub-forms inside detail panel
  const [showCostForm, setShowCostForm] = useState(false);
  const [costDesc, setCostDesc] = useState("");
  const [costAmt, setCostAmt] = useState("");
  const [costCat, setCostCat] = useState("Materiais");

  const [showVistoriaForm, setShowVistoriaForm] = useState(false);
  const [vistoriaType, setVistoriaType] = useState("Inicial");
  const [vistoriaDesc, setVistoriaDesc] = useState("");
  const [vistoriaImg, setVistoriaImg] = useState("https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600");

  const [showOcForm, setShowOcForm] = useState(false);
  const [ocDesc, setOcDesc] = useState("");
  const [ocAmt, setOcAmt] = useState("");
  const [ocPayerCnpj, setOcPayerCnpj] = useState("");

  // Tabs inside specific Obra details view
  const [detailTab, setDetailTab] = useState("checklist"); // "checklist" | "costs" | "vistorias" | "orders"

  // Edit Obra states for running inline and quick updates
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingObra, setEditingObra] = useState<(Obra & { progressPercent: number }) | null>(null);
  const [editObraName, setEditObraName] = useState("");
  const [editObraStatus, setEditObraStatus] = useState("");
  const [editObraAddress, setEditObraAddress] = useState("");
  const [editObraBudget, setEditObraBudget] = useState("");

  const fetchObrasList = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/obras", {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setObras(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveContracts = async () => {
    if (!currentCompany?.id) return;
    try {
      const res = await apiFetch("/api/contracts", {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
      });
      if (res.ok) {
        const data: Contract[] = await res.json();
        // Get active or expiring contracts that we can link our projects to
        setActiveContracts(data.filter(c => c.status === "Ativo" || c.status === "Vencendo"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchObraFullDetails = async (id: string) => {
    if (!currentCompany?.id) return;
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/obras/${id}`, {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setObraDetails(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchObrasList();
    fetchActiveContracts();
  }, [currentCompany?.id, currentUser?.id]);

  useEffect(() => {
    const handleTriggerOc = () => {
      // If there are works/obras, open the first one and show the purchase orders (orders) tab
      if (obras && obras.length > 0) {
        const firstObra = obras[0];
        setSelectedObra(firstObra);
        setDetailTab("orders");
        fetchObraFullDetails(firstObra.id);
      }
    };
    window.addEventListener("trigger-obras-oc", handleTriggerOc);
    return () => {
      window.removeEventListener("trigger-obras-oc", handleTriggerOc);
    };
  }, [obras]);

  // Click handler to open details
  const handleOpenDetails = (o: Obra & { progressPercent: number }) => {
    setSelectedObra(o);
    setDetailTab("checklist");
    fetchObraFullDetails(o.id);
  };

  // Create Obra
  const handleCreateObra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id) return;
    if (!newObraName || !newObraBudget || !newObraAddress) return;

    try {
      const res = await apiFetch("/api/obras", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          name: newObraName,
          budgetPlanned: parseFloat(newObraBudget),
          address: newObraAddress,
          contractId: newObraContractId || undefined,
        })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewObraName("");
        setNewObraBudget("");
        setNewObraAddress("");
        setNewObraContractId("");
        fetchObrasList();
        alert("Canteiro de obras inaugurado! Os roteiros iniciais de conformidade foram gerados automaticamente.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle checklist step
  const handleToggleStep = async (step: ObraStep) => {
    if (!currentCompany?.id || !selectedObra) return;
    try {
      const res = await apiFetch(`/api/obras/${selectedObra.id}/steps/${step.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          isCompleted: !step.isCompleted,
        })
      });

      if (res.ok) {
        // Refresh local details and parent count
        await fetchObraFullDetails(selectedObra.id);
        fetchObrasList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Launch cost
  const handleSubmitCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id || !selectedObra || !costDesc || !costAmt) return;

    try {
      const res = await apiFetch(`/api/obras/${selectedObra.id}/costs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          description: costDesc,
          amount: costAmt,
          category: costCat,
        })
      });

      if (res.ok) {
        setCostDesc("");
        setCostAmt("");
        setShowCostForm(false);
        await fetchObraFullDetails(selectedObra.id);
        fetchObrasList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Launch inspection/vistoria (photo-safari)
  const handleSubmitVistoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id || !selectedObra || !vistoriaDesc) return;

    try {
      const res = await apiFetch(`/api/obras/${selectedObra.id}/vistorias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          type: vistoriaType,
          description: vistoriaDesc,
          imageUrl: vistoriaImg,
        })
      });

      if (res.ok) {
        setVistoriaDesc("");
        setShowVistoriaForm(false);
        await fetchObraFullDetails(selectedObra.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Emit Purchase Order
  const handleSubmitPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id || !selectedObra || !ocDesc || !ocAmt || !ocPayerCnpj) return;

    try {
      const res = await apiFetch(`/api/obras/${selectedObra.id}/purchase-orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          description: ocDesc,
          amount: ocAmt,
          payerCnpj: ocPayerCnpj,
        })
      });

      if (res.ok) {
        setOcDesc("");
        setOcAmt("");
        setOcPayerCnpj("");
        setShowOcForm(false);
        await fetchObraFullDetails(selectedObra.id);
        alert("Ordem de Compra faturada com sucesso!");
      } else {
        const errData = await res.json();
        alert(errData.error || "Erro ao faturar Ordem de Compra.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick switch of Purchase Order Status
  const handleToggleOrderStatus = async (orderId: string, currentStatus: string) => {
    if (!currentCompany?.id || !selectedObra) return;
    const nextStatus = currentStatus === "Pendente" ? "Aprovada" : "Pendente";
    try {
      const res = await apiFetch(`/api/purchase-orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        await fetchObraFullDetails(selectedObra.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Obra attributes (name, status, address, budget) inline
  const handleUpdateObra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id || !editingObra) return;
    try {
      const res = await apiFetch(`/api/obras/${editingObra.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          name: editObraName,
          status: editObraStatus,
          address: editObraAddress,
          budgetPlanned: parseFloat(editObraBudget),
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingObra(null);
        fetchObrasList();
        if (selectedObra && selectedObra.id === editingObra.id) {
          await fetchObraFullDetails(selectedObra.id);
          // Sync selectedObra state local data
          setSelectedObra(prev => prev ? {
            ...prev,
            name: editObraName,
            status: editObraStatus,
            address: editObraAddress,
            budgetPlanned: parseFloat(editObraBudget),
          } : null);
        }
        alert("Canteiro de obras atualizado!");
      } else {
        alert("Erro ao atualizar canteiro de obras.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const preBakedImages = [
    { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600", desc: "Abertura / Terreno Vazio" },
    { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600", desc: "Estruturação de Concreto" },
    { url: "https://images.unsplash.com/photo-1581094288338-2314dddb7eed?auto=format&fit=crop&q=80&w=600", desc: "Tubulações de Gás e Fibras" },
    { url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600", desc: "Edifício Quase Concluído" },
  ];

  return (
    <div className="space-y-6" id="obras-operational-console">
      {/* Upper bar context */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Operações em Canteiros de Obra</h2>
          <p className="text-xs text-slate-505 text-slate-500 mt-1">Roteamento de fases, auditoria de vistorias técnicas e limites orçamentários.</p>
        </div>
        {!selectedObra && (
          currentUser?.role === "ADMIN" ? (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setOcPayerCnpj(currentCompany?.cnpj || "");
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs px-3.5 py-2 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" /> Cadastrar Novo Canteiro
            </button>
          ) : (
            <span className="bg-amber-55 bg-amber-50 text-amber-700 border border-amber-200 font-semibold rounded-lg text-[10px] uppercase tracking-wide px-3 py-1.5 flex items-center gap-1">
              🔑 Modo Leitura (Colaborador)
            </span>
          )
        )}
      </div>

      {!selectedObra ? (
        // RENDER GENERAL LIST OF OBRAS
        loading ? (
          <div className="py-20 text-center text-slate-500 animate-pulse font-medium text-xs">Buscando canteiros ativos...</div>
        ) : obras.length === 0 ? (
          <div className="py-16 text-center text-slate-450 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-xs">
            Nenhuma obra estruturada sob esta organização. Clique em "Cadastrar Novo Canteiro" para iniciar o rastreamento!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="obras-deck">
            {obras.map(o => {
              const formattedPlanned = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(o.budgetPlanned);
              const formattedSpent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(o.budgetSpent);
              const pctSpent = o.budgetPlanned > 0 ? Math.round((o.budgetSpent / o.budgetPlanned) * 100) : 0;
              
              let budgetColor = "bg-indigo-600";
              let textBudget = "text-indigo-600";
              if (pctSpent > 100) {
                budgetColor = "bg-red-500 animate-pulse";
                textBudget = "text-red-650 font-bold";
              } else if (pctSpent > 80) {
                budgetColor = "bg-amber-500";
                textBudget = "text-amber-600";
              }

              return (
                <div
                  key={o.id}
                  onClick={() => handleOpenDetails(o)}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-sm hover:border-slate-350 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                      <span className="bg-slate-50 text-slate-500 border border-slate-150 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded">
                        {o.status}
                      </span>
                      {currentUser?.role === "ADMIN" && (
                        <button
                          onClick={() => {
                            setEditingObra(o);
                            setEditObraName(o.name);
                            setEditObraStatus(o.status);
                            setEditObraAddress(o.address);
                            setEditObraBudget(o.budgetPlanned.toString());
                            setShowEditModal(true);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-850 font-bold bg-indigo-50 border border-indigo-150/60 hover:bg-indigo-100/80 px-2 py-0.5 rounded transition-all cursor-pointer"
                        >
                          Editar
                        </button>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm tracking-tight">{o.name}</h4>
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-1.5 font-normal">
                        <MapPin className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                        <span className="truncate">{o.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Budget comparison graphics */}
                  <div className="border-t border-slate-100 mt-5 pt-4 space-y-3">
                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Custo Realizado</span>
                        <span className="font-semibold text-slate-850 font-mono text-[11px]">{formattedSpent}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Orçado</span>
                        <span className="font-medium text-slate-500 font-mono text-[11px]">{formattedPlanned}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${budgetColor}`}
                          style={{ width: `${Math.min(100, pctSpent)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-medium">
                        <span className="text-slate-400">{o.progressPercent}% das etapas concluídas</span>
                        <span className={`${textBudget}`}>{pctSpent}% do caixa estocado</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // RENDER SELECTED OBRA DETAILS CONSOLE (Checklist, Inspections, Expenses, orders)
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Detailed Back To List Row Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-slate-550 bg-slate-50 border border-slate-150 text-slate-600 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded">
                  Canteiro em {selectedObra.status}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center font-mono">
                  ID: {selectedObra.id.slice(0, 8)}...
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">{selectedObra.name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 font-normal">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" /> {selectedObra.address}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingObra(selectedObra);
                  setEditObraName(selectedObra.name);
                  setEditObraStatus(selectedObra.status);
                  setEditObraAddress(selectedObra.address);
                  setEditObraBudget(selectedObra.budgetPlanned.toString());
                  setShowEditModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-55 bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                Alterar Status / Dados
              </button>
              <button
                onClick={() => setSelectedObra(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                &larr; Voltar para Obras
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="py-16 text-center text-slate-500 font-medium">Extraindo roteiros, relatórios de medição e ordens...</div>
          ) : !obraDetails ? (
            <div className="p-12 text-slate-400 text-center">Nenhum detalhe extraído. Sincronize o banco.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column of focus: Details navigation and tabular screens (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Secondary navigation for columns */}
                <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex overflow-x-auto gap-1">
                  <button
                    onClick={() => setDetailTab("checklist")}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${detailTab === "checklist" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    <ClipboardList className="h-4 w-4" /> Roteiro de Obra ({obraDetails.steps?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab("costs")}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${detailTab === "costs" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    <Landmark className="h-4 w-4" /> Controle de Custos ({obraDetails.costs?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab("vistorias")}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${detailTab === "vistorias" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    <Camera className="h-4 w-4" /> Vistorias & Fotos ({obraDetails.vistorias?.length || 0})
                  </button>
                  <button
                    onClick={() => setDetailTab("orders")}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${detailTab === "orders" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    <ShoppingBag className="h-4 w-4" /> Ordens de Compra ({obraDetails.purchaseOrders?.length || 0})
                  </button>
                </div>

                {/* TAB 1: OPERATIONAL CHECKLIST */}
                {detailTab === "checklist" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Roteiro de Obra (Checklist e Marcos)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Clique nas etapas concluídas para recalcular o andamento físico da obra.</p>
                    </div>

                    <div className="space-y-6">
                      {["planejamento", "execução", "entrega"].map(phase => {
                        const phaseSteps = obraDetails.steps?.filter((s: any) => s.phase === phase) || [];
                        if (phaseSteps.length === 0) return null;

                        return (
                          <div key={phase} className="space-y-2">
                            <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-widest font-mono bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                              Fase de {phase}
                            </span>

                            <div className="divide-y divide-slate-100 border border-slate-150 rounded-2xl bg-slate-50/10">
                              {phaseSteps.map((step: any) => (
                                <div key={step.id} className="p-3 flex items-start gap-3 text-xs hover:bg-slate-50/50 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={step.isCompleted}
                                    onChange={() => handleToggleStep(step)}
                                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                                  />
                                  <div className="flex-1 space-y-1.5">
                                    <span className={`font-medium ${step.isCompleted ? "line-through text-slate-400" : "text-slate-800"}`}>
                                      {step.title}
                                    </span>
                                    {step.isCompleted && step.completedAt && (
                                      <div className="text-[10px] text-slate-400 font-mono font-medium">
                                        Medição validada em: {new Date(step.completedAt).toLocaleString("pt-BR")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: COSTS MANAGER */}
                {detailTab === "costs" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Histórico de Lançamentos Orçamentários</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Entradas cronológicas de faturamento operacional e insumos.</p>
                      </div>

                      <button
                        onClick={() => setShowCostForm(!showCostForm)}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        {showCostForm ? "Fechar Lançamento" : "+ Lançar Despesa Directa"}
                      </button>
                    </div>

                    {showCostForm && (
                      <form onSubmit={handleSubmitCost} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in slide-in-from-top-3 duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descrição do Custo</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Compra de saco de areia fina quartzolit..."
                              value={costDesc}
                              onChange={(e) => setCostDesc(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 animate-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Categoria</label>
                            <select
                              value={costCat}
                              onChange={(e) => setCostCat(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="Materiais">Materiais</option>
                              <option value="Mão de Obra">Mão de Obra / Mediç.</option>
                              <option value="Locação">Locação</option>
                              <option value="Outros">Outros Extras</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Contábil (R$)</label>
                            <input
                              type="number"
                              required
                              placeholder="Ex: 8400.00"
                              value={costAmt}
                              onChange={(e) => setCostAmt(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setShowCostForm(false)}
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm"
                          >
                            Lançar e Somar
                          </button>
                        </div>
                      </form>
                    )}

                    {obraDetails.costs?.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">Nenhuma despesa lançada nesta localidade ainda.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                              <th className="py-2 px-3">Data</th>
                              <th className="py-2 px-3">Categoria</th>
                              <th className="py-2 px-3">Histórico / Descrição</th>
                              <th className="py-2 px-3 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {obraDetails.costs?.map((c: ObraCusto) => {
                              return (
                                <tr key={c.id} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 text-slate-400 font-mono">
                                    {new Date(c.date).toLocaleDateString("pt-BR")}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold text-[9px]">
                                      {c.category}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-705 font-medium">{c.description}</td>
                                  <td className="py-2.5 px-3 text-right font-semibold font-mono text-slate-900">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.amount)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: PHOTO SAFARI INSPECTIONS */}
                {detailTab === "vistorias" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Registros Fotográficos de Inspeção (Vistoria)</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Laudos obrigatórios de antes/depois exigidos por engenharia técnica.</p>
                      </div>

                      <button
                        onClick={() => setShowVistoriaForm(!showVistoriaForm)}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        {showVistoriaForm ? "Fechar Formulário" : "+ Adicionar Laudo / Foto"}
                      </button>
                    </div>

                    {showVistoriaForm && (
                      <form onSubmit={handleSubmitVistoria} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in slide-in-from-top-3 duration-250">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Registro</label>
                            <select
                              value={vistoriaType}
                              onChange={(e) => setVistoriaType(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
                            >
                              <option value="Inicial">Vistoria de Canteiro (Inicial)</option>
                              <option value="Final">Encerramento / Recebimento (Final)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Foto Simulada (Selecione)</label>
                            <select
                              value={vistoriaImg}
                              onChange={(e) => setVistoriaImg(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs"
                            >
                              {preBakedImages.map((img, imIdx) => (
                                <option key={imIdx} value={img.url}>{img.desc}</option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Observações Descritivas Complementares</label>
                            <textarea
                              required
                              rows={3}
                              placeholder="Fatos e anomalias do canteiro como rachaduras, limpeza estrutural, etc."
                              value={vistoriaDesc}
                              onChange={(e) => setVistoriaDesc(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setShowVistoriaForm(false)}
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow"
                          >
                            Registrar Laudo
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Vistorias List Grid */}
                    {obraDetails.vistorias?.length === 0 ? (
                      <p className="text-xs text-slate-405 text-center py-6">Nenhum laudo fotográfico adicionado.</p>
                    ) : (
                      <div className="space-y-4">
                        {obraDetails.vistorias?.map((v: ObraVistoria) => (
                          <div key={v.id} className="p-4 border border-slate-150 rounded-2xl flex flex-col sm:flex-row gap-4 items-start bg-slate-50/20">
                            {v.imageUrl && (
                              <img
                                src={v.imageUrl}
                                alt={v.type}
                                referrerPolicy="no-referrer"
                                className="w-full sm:w-32 h-24 object-cover rounded-xl border border-slate-150 shrink-0"
                              />
                            )}
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${v.type === "Inicial" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                  {v.type}
                                </span>
                                <span className="text-slate-400 font-mono font-medium">{new Date(v.createdAt).toLocaleDateString("pt-BR")}</span>
                              </div>
                              <p className="text-slate-700 leading-relaxed font-normal">{v.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: PURCHASE ORDERS (O.C.) */}
                {detailTab === "orders" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Emissão e Rastreio de Ordens de Compra (O.C.)</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Siga as regras de CNPJ pagador obrigatório por obras fiscais brasileiras.</p>
                      </div>

                      <button
                        onClick={() => setShowOcForm(!showOcForm)}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        {showOcForm ? "Fechar Emissor" : "+ Emitir Nova O.C."}
                      </button>
                    </div>

                    {showOcForm && (
                      <form onSubmit={handleSubmitPurchaseOrder} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in slide-in-from-top-3 duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CNPJ Pagador Faturador</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: 12.345.678/0001-99"
                              value={ocPayerCnpj}
                              onChange={(e) => setOcPayerCnpj(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            />
                            <p className="text-[9px] text-slate-400 mt-0.5">Note: Requer exatos 14 dígitos numéricos.</p>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor do Faturamento (R$)</label>
                            <input
                              type="number"
                              required
                              placeholder="Ex: 4500"
                              value={ocAmt}
                              onChange={(e) => setOcAmt(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descrição / Objeto da Compra</label>
                            <textarea
                              required
                              rows={2}
                              placeholder="Ex: Fornecimento de 20 toneladas de concreto asfáltico tipo C..."
                              value={ocDesc}
                              onChange={(e) => setOcDesc(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setShowOcForm(false)}
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow"
                          >
                            Autorizar Faturamento
                          </button>
                        </div>
                      </form>
                    )}

                    {obraDetails.purchaseOrders?.length === 0 ? (
                      <p className="text-xs text-slate-405 text-center py-6">Nenhuma ordem emitida vinculada a este projeto.</p>
                    ) : (
                      <div className="space-y-4">
                        {obraDetails.purchaseOrders?.map((order: PurchaseOrder) => {
                          const formattedVal = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.amount);
                          
                          return (
                            <div key={order.id} className="p-4 border border-slate-150 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/10">
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 font-mono text-[11px]">{order.orderNumber}</span>
                                  <span className="text-slate-400 font-mono text-[10px]">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
                                </div>
                                <p className="text-slate-600 font-medium">{order.description}</p>
                                <div className="text-[10px] text-slate-405 font-mono">
                                  Pagador CNPJ: <span className="font-semibold">{order.payerCnpj}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-semibold text-slate-900 font-mono text-sm">{formattedVal}</span>
                                <button
                                  onClick={() => handleToggleOrderStatus(order.id, order.status)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors shrink-0 cursor-pointer ${order.status === "Aprovada" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-amber-50 text-amber-700 border border-amber-150 animate-pulse"}`}
                                  title="Clique para alternar aprovação"
                                >
                                  {order.status}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column of focus: Linked contracts context (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Linked Contract Panel Card */}
                <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-md">
                  <h4 className="text-xs uppercase font-extrabold text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Vínculo de Origem
                  </h4>
                  
                  {obraDetails.contract ? (
                    <div className="mt-4 space-y-4 text-xs">
                      <div>
                        <span className="text-slate-405 block text-[10px]">Título do Contrato Base</span>
                        <p className="font-bold text-white text-sm mt-0.5">{obraDetails.contract.title}</p>
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold mt-1 inline-block capitalize">
                          {obraDetails.contract.type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                        <div>
                          <span className="text-slate-405 block text-[10px]">Valor Máximo Alocado</span>
                          <span className="font-bold text-white text-xs font-mono">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(obraDetails.contract.value)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-450 block text-[10px]">Status do Contrato</span>
                          <span className="text-indigo-400 font-bold uppercase text-[10px]">{obraDetails.contract.status}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 space-y-1 text-slate-300">
                        <span className="text-slate-405 block text-[10px]">Parte Relacionada</span>
                        <p className="font-semibold">{obraDetails.contract.relatedPartyName}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{obraDetails.contract.relatedPartyInfo}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-slate-400 text-xs py-2 text-center text-left">
                      Sem contrato de locação ou serviços vinculado por origem.
                    </div>
                  )}
                </div>

                {/* Local Operational Health Analysis Card */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-slate-500" /> Balanço de Execução do Projeto
                  </h4>

                  <div className="bg-slate-50 p-3.5 border border-slate-150 rounded-2xl text-xs space-y-3">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Estoque Orçado</span>
                      <span className="font-semibold text-slate-800">R$ {obraDetails.budgetPlanned?.toLocaleString("pt-BR")}</span>
                    </div>

                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Total Liquidado</span>
                      <span className="font-semibold text-indigo-700">R$ {obraDetails.budgetSpent?.toLocaleString("pt-BR")}</span>
                    </div>

                    <div className="h-px bg-slate-200"></div>

                    {/* Margin computation */}
                    {(() => {
                      const diff = (obraDetails.budgetPlanned || 0) - (obraDetails.budgetSpent || 0);
                      const isDeficit = diff < 0;

                      return (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Margem Restante</span>
                          <span className={`font-bold font-mono text-xs ${isDeficit ? "text-red-600" : "text-emerald-700"}`}>
                            R$ {diff.toLocaleString("pt-BR")} {isDeficit && "⚠️"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW OBRA OVERLAY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-150 rounded-t-3xl flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Cadastrar Novo Canteiro (Abertura)</h4>
                <p className="text-xs text-slate-500 mt-0.5">Registre o escopo operacional inicial e de medição.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-405 font-bold font-mono text-lg">&times;</button>
            </div>

            <form onSubmit={handleCreateObra} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Fantasia do Projeto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reforma Prédio Principal Paulista"
                  value={newObraName}
                  onChange={(e) => setNewObraName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Endereço Técnico da Obra</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                  value={newObraAddress}
                  onChange={(e) => setNewObraAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Verba Máxima / Orçamento Projetado (R$)</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 85000"
                  value={newObraBudget}
                  onChange={(e) => setNewObraBudget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contrato de Origem Relacionado (Opcional)</label>
                <select
                  value={newObraContractId}
                  onChange={(e) => setNewObraContractId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="">Nenhum - Sem contrato vinculado de origem</option>
                  {activeContracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.relatedPartyName} - R$ {c.value.toLocaleString("pt-BR")})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-450 mt-1 font-mono">Associa o projeto diretamente ao caixa estipulado no contrato.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-xs font-semibold text-white shadow-md"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OBRA MODAL (Rapid updates of schedule and status) */}
      {showEditModal && editingObra && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-150 rounded-t-2xl flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Atualizar Canteiro de Obras</h4>
                <p className="text-xs text-slate-500 mt-0.5">Atualize de forma rápida os status, nome, endereço ou verba do projeto.</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditingObra(null); }} className="text-slate-400 hover:text-slate-600 font-bold font-mono text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleUpdateObra} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome Fantasia do Projeto</label>
                <input
                  type="text"
                  required
                  value={editObraName}
                  onChange={(e) => setEditObraName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status Operacional atual</label>
                <select
                  value={editObraStatus}
                  onChange={(e) => setEditObraStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-sm text-slate-850 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Planejamento">Planejamento</option>
                  <option value="Execução">Execução</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Endereço Técnico</label>
                <input
                  type="text"
                  required
                  value={editObraAddress}
                  onChange={(e) => setEditObraAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Verba Máxima / Orçamento Projetado (R$)</label>
                <input
                  type="number"
                  required
                  value={editObraBudget}
                  onChange={(e) => setEditObraBudget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingObra(null); }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
