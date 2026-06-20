import { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { DashboardStats } from "../types.js";
import { FileText, TrendingUp, Landmark, ShieldCheck, Activity, Users, Layers, MapPin, AlertCircle } from "lucide-react";
import { apiFetch } from "../lib/api.js";

export default function DashboardView() {
  const { currentCompany, currentUser } = useStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/reports/stats", {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
      });
      if (!res.ok) throw new Error("Falha ao puxar estatísticas.");
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentCompany?.id, currentUser?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-slate-600 font-medium">Carregando métricas reais...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl max-w-xl mx-auto my-10">
        <h4 className="font-bold flex items-center gap-2 text-base">⚠️ Falha ao carregar métricas</h4>
        <p className="text-sm mt-1">{error || "Não foi possível consolidar as estatísticas."}</p>
      </div>
    );
  }

  const { summary, auditLogs } = stats;

  const formattedContractValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(summary.totalContractValue);

  const formattedPlanned = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(summary.totalBudgetPlanned);

  const formattedSpent = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(summary.totalBudgetSpent);

  // Health budget color coding
  const healthPercent = summary.budgetHealthPercent;
  let healthColor = "bg-emerald-500";
  let healthText = "Dentro do planejado";
  let healthBorder = "border-emerald-200 bg-emerald-50/50";
  let healthTextColor = "text-emerald-700";

  if (healthPercent > 100) {
    healthColor = "bg-red-500 animate-pulse";
    healthText = "ACIMA DO ORÇAMENTO ESTIPULADO!";
    healthBorder = "border-red-300 bg-red-50/80";
    healthTextColor = "text-red-700 font-bold";
  } else if (healthPercent > 80) {
    healthColor = "bg-amber-500";
    healthText = "Atenção: Limite crítico";
    healthBorder = "border-amber-200 bg-amber-50/50";
    healthTextColor = "text-amber-700";
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300" id="dashboard-view-wrapper">
      {/* Dynamic Header Information */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Painel Executivo Real</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Dados sincronizados em tempo real para <span className="font-semibold text-slate-800">{currentCompany?.name}</span>
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Activity className="h-4 w-4 text-slate-500" /> Atualizar Indicadores
        </button>
      </div>

      {/* Alerta de Contratos Prestes a Vencer nos Próximos 30 dias */}
      {stats.expiringContracts && stats.expiringContracts.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 md:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Atenção: Contratos prestes a vencer (Próximos 30 dias)</h4>
            <p className="text-xs text-amber-700 leading-relaxed font-normal">
              Detectamos <span className="font-bold text-slate-900">{stats.expiringContracts.length}</span> contrato(s) ativo(s) com término próximo. Recomendamos planejar termos aditivos de prazo ou reajuste financeiro.
            </p>
            <div className="flex flex-wrap gap-2 mt-2 pt-1 border-t border-amber-150/50">
              {stats.expiringContracts.map(c => {
                const diffTime = new Date(c.endDate).getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <div key={c.id} className="bg-white/90 border border-amber-150 rounded px-2.5 py-1 text-[11px] flex items-center gap-1.5 font-normal text-amber-900 shadow-3xs">
                    <span className="font-semibold">{c.title}</span> 
                    <span className="text-amber-600 font-mono">({diffDays <= 0 ? "Vence hoje" : `Vence em ${diffDays} dias`})</span>
                    <span className="text-[10px] text-slate-500 font-medium">| {c.relatedPartyName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid of Key KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 - Contracts Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="bg-sky-50 p-2.5 rounded-lg text-sky-600 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Contratos Celebrados</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{summary.contractsCount}</h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 leading-none font-medium">
              <span className="font-semibold text-amber-600">{summary.contractsByStatus.Aguardando}</span> pendentes
            </p>
          </div>
        </div>

        {/* KPI 2 - Total Contract Values */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Volume Financeiro Pactuado</p>
            <h3 className="text-lg font-bold text-slate-900 mt-1 truncate">{formattedContractValue}</h3>
            <p className="text-[11px] text-slate-450 mt-1 leading-none font-medium">
              Contratos ativos & rascunhos
            </p>
          </div>
        </div>

        {/* KPI 3 - Active Construction Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Canteiros de Obra Ativos</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{summary.obrasCount}</h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 leading-none font-medium">
              <span className="text-emerald-600 font-semibold">{summary.obrasByStatus.Execucao}</span> em execução
            </p>
          </div>
        </div>

        {/* KPI 4 - Realized Budget Total */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="bg-violet-50 p-2.5 rounded-lg text-violet-600 shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Custos Executados</p>
            <h3 className="text-lg font-bold text-slate-900 mt-1 truncate">{formattedSpent}</h3>
            <p className="text-[11px] text-slate-450 mt-1 leading-none font-medium">
              Orçado: <span className="font-semibold text-slate-600">{formattedPlanned}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Budget Health and Categorical Allocation Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Budget Health Meter */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-7 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Saúde Orçamentária das Obras</h4>
            <p className="text-xs text-slate-500 mt-1">Comparativo simplificado entre o orçamento planejado e custos reais contabilizados.</p>

            {/* Micro comparison row */}
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block">Orçado Planejado</span>
                <p className="text-sm font-bold text-slate-800 mt-1 font-mono">{formattedPlanned}</p>
              </div>
              <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100/60">
                <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block">Realizado Gasto</span>
                <p className="text-sm font-bold text-indigo-700 mt-1 font-mono">{formattedSpent}</p>
              </div>
            </div>

            {/* Custom Interactive Progress Bar */}
            <div className="mt-5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Gargalo de Absorção Orçamentária</span>
                <span className={`font-semibold font-mono ${healthTextColor}`}>{healthPercent}% executado</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${healthColor}`}
                  style={{ width: `${Math.min(100, healthPercent)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className={`mt-5 p-3 rounded-lg border text-xs flex items-center gap-2 ${healthBorder}`}>
            <span className="h-2 w-2 rounded-full block shrink-0" style={{ backgroundColor: "currentColor" }}></span>
            <span className={`font-medium ${healthTextColor}`}>{healthText}</span>
          </div>
        </div>

        {/* Right Side: Categorical Allocation */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-5">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Custos Operacionais por Categoria</h4>
          <p className="text-xs text-slate-500 mt-1">Destinação dos gastos acumulados na empresa.</p>

          <div className="mt-5 space-y-4">
            {Object.entries(summary.categoryExpenseAmounts as Record<string, number>).map(([cat, amt]) => {
              const maxVal = summary.totalBudgetSpent || 1;
              const pct = Math.round((amt / maxVal) * 100);
              const formattedAmt = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL"
              }).format(amt);

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{cat}</span>
                    <span className="text-slate-500 font-mono font-medium">{formattedAmt} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-105 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audit Trail & Tracking Logs (SaaS Requirement) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm" id="audit-trail-card">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-indigo-500" /> Histórico de Pistas e Auditorias (Audit Log)
            </h4>
            <p className="text-xs text-slate-500 mt-1">Rastreamento sistêmico obrigatório para conformidade de Tenant.</p>
          </div>
          <span className="bg-slate-50 border border-slate-200 text-slate-650 text-[10px] px-2.5 py-1 rounded-lg font-bold font-mono flex items-center gap-1">
            <Activity className="h-3 w-3 text-indigo-505" /> {auditLogs.length} eventos
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 text-[10px]">
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3">Ação</th>
                  <th className="py-2.5 px-3">Detalhamento Técnico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {auditLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {log.user ? log.user.name : "Sistema Automático"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/70 px-2 py-0.5 rounded font-bold font-mono text-[9px] uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-sm truncate text-slate-500" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
