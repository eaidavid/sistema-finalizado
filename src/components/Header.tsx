import { useStore } from "../store.js";
import { LogOut, Menu, User, ShieldCheck } from "lucide-react";

export default function Header() {
  const {
    currentUser,
    currentCompany,
    setSidebarOpen,
    activeTab,
    logout,
  } = useStore();

  // Helper title for each tab to beautify the top bar
  const getTabTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Dashboard Principal";
      case "contracts":
        return "Gerenciamento de Contratos";
      case "templates":
        return "Biblioteca de Modelos";
      case "signatures":
        return "Gestor de Assinaturas & Contratos";
      case "obras":
        return "Acompanhamento de Obras & Custos";
      case "reports":
        return "Relatórios & Logs de Auditoria";
      case "settings":
        return "Configurações Globais (Parametrização)";
      default:
        return "Contratos & Obras";
    }
  };

  return (
    <header className="lg:hidden bg-slate-900 border-b border-slate-800 sticky top-0 z-30 h-14 flex items-center px-4 justify-between shadow-xs text-white" id="app-header">
      {/* Page Title & Mobile menu trigger button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Abrir menu lateral"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-xs font-black tracking-tight leading-tight">
            {getTabTitle()}
          </h1>
          {currentCompany && (
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block leading-none mt-0.5">
              {currentCompany.name}
            </p>
          )}
        </div>
      </div>

      {/* Profile display with custom role status, and Logout (No switching of user is allowed) */}
      {currentUser && (
        <div className="flex items-center gap-3">
          {/* Real action to cleanly exit user session */}
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-800 hover:bg-red-950/40 text-slate-305 text-slate-300 hover:text-red-400 text-xs font-semibold rounded-lg transition-all cursor-pointer border border-transparent"
            title="Sair do sistema de forma segura"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-[11px]">Sair</span>
          </button>
        </div>
      )}
    </header>
  );
}
