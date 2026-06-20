import { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { AuditLog, Contract } from "../types.js";
import { Download, AlertOctagon, RefreshCcw, Landmark, ShieldCheck, CheckSquare, HardDriveDownload } from "lucide-react";
import { apiFetch } from "../lib/api.js";

export default function ReportsView() {
  const { currentCompany, currentUser, bootstrapTenant } = useStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const fetchReportsData = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      // 1. Fetch Stats (audit logs)
      const resStats = await apiFetch("/api/reports/stats", {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        }
      });
      if (resStats.ok) {
        const data = await resStats.json();
        setLogs(data.auditLogs || []);
      }

      // 2. Fetch all Contracts (for export download compiling)
      const resContracts = await apiFetch("/api/contracts", {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        }
      });
      if (resContracts.ok) {
        const data = await resContracts.json();
        setContracts(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [currentCompany?.id, currentUser?.id]);

  // Click handler to re-seed the SQLite datastore (Critical safety feature)
  const handleSystemDatabaseReset = async () => {
    const isConfirmed = confirm(
      "Deseja resetar sumariamente o banco de dados? Isso apagará todas as novas adições e restaurará os dados padrões de demonstração contendo os templates guiados de obra."
    );
    if (!isConfirmed) return;

    setIsResetting(true);
    try {
      const res = await apiFetch("/api/system/reset", { method: "POST" });
      if (res.ok) {
        alert("O banco de dados SQLite foi pulverizado e repopulado com os dados do Mock!");
        // Re-run store bootstrap to select the defaulted Acme company
        await bootstrapTenant();
        fetchReportsData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  // Compiler for exporting Contracts list to raw CSV download stream
  const exportContractsCsv = () => {
    if (contracts.length === 0) return alert("Nenhum contrato ativo para faturar exportações.");
    
    // Define headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID;Titulo;Tipo;Valor;Data de Inicio;Data Encerramento;Parte Relacionada;Status\n";

    // Append rows
    contracts.forEach((c) => {
      const start = new Date(c.startDate).toLocaleDateString("pt-BR");
      const end = new Date(c.endDate).toLocaleDateString("pt-BR");
      const valStr = c.value.toFixed(2);
      const titleEsc = c.title.replace(/;/g, ",");
      const partyEsc = c.relatedPartyName.replace(/;/g, ",");
      
      csvContent += `${c.id};${titleEsc};${c.type};${valStr};${start};${end};${partyEsc};${c.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_contratos_${currentCompany?.name.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="reports-view-container">
      {/* Upper info tab */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Relatórios de Auditoria & Segurança</h2>
        <p className="text-sm text-slate-500">Rastreamento de ações institucionais e exportação de dados contábeis em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Analytical CSV Exports (5 cols) */}
        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm lg:col-span-5 flex flex-col justify-between min-h-[350px]">
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <HardDriveDownload className="h-5 w-5 text-indigo-500" /> Compilação Analítica de Arquivos
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Exportações diretas de planilhas contábeis geradas em tempo real com base nos dados filtrados de sua conta ativa.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={exportContractsCsv}
                className="w-full p-4 bg-slate-50 border border-slate-150 rounded-2xl hover:bg-indigo-50/20 hover:border-indigo-400 transition-all text-xs font-semibold text-slate-700 hover:text-indigo-900 flex justify-between items-center cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-indigo-500" /> Exportar Planilha de Contratos (.CSV)
                </span>
                <Download className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Hard DB Core Re-seed */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
            <h5 className="text-xs font-bold text-red-800 flex items-center gap-1">
              <AlertOctagon className="h-4 w-4 animate-bounce" /> Recuperação Sistêmica (Modo Reviewer)
            </h5>
            <p className="text-[11px] text-red-700 leading-relaxed font-normal">
              Está testando e bagunçou tudo? Não se preocupe! Clique abaixo para esvaziar o SQLite e reinjetar todos os dados e templates originais.
            </p>
            <button
              onClick={handleSystemDatabaseReset}
              disabled={isResetting}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold w-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCcw className={`h-3 w-3 ${isResetting && "animate-spin"}`} />
              {isResetting ? "Esvaziando e Re-semeando..." : "Limpar e Re-semear Banco de Dados"}
            </button>
          </div>
        </div>

        {/* Right Column: Complete Logs trails table (7 cols) */}
        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="h-5 w-5 text-indigo-500" /> Log de Auditoria do SaaS
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">Isolamento absoluto garantido por Tenant: {currentCompany?.name}.</p>
            </div>
            <button
              onClick={fetchReportsData}
              className="p-1 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded"
              title="Recarregar Logs de Auditoria"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 text-center py-10 animate-pulse">Sincronizando trilha sistêmica...</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">Sem ocorrências para o Tenant selecionado.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-150 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 font-mono text-[10px]">{log.action}</span>
                    <span className="text-slate-400 text-[10px] font-mono">{new Date(log.createdAt).toLocaleDateString("pt-BR")} às {new Date(log.createdAt).toLocaleTimeString("pt-BR")}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-normal">{log.details}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Realizado por: <span className="font-semibold text-slate-500">{log.user ? log.user.name : "Sistema Interno"}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
