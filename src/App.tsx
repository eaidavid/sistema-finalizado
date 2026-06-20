import { useEffect } from "react";
import { useStore } from "./store.js";
import Header from "./components/Header.js";
import Sidebar from "./components/Sidebar.js";
import DashboardView from "./components/DashboardView.js";
import ContractsView from "./components/ContractsView.js";
import TemplatesView from "./components/TemplatesView.js";
import SignaturesView from "./components/SignaturesView.js";
import ObrasView from "./components/ObrasView.js";
import ReportsView from "./components/ReportsView.js";
import SettingsView from "./components/SettingsView.js";
import LoginView from "./components/LoginView.js";
import { Loader2 } from "lucide-react";

export default function App() {
  const { activeTab, bootstrapTenant, loading, error, currentUser, sidebarCollapsed } = useStore();

  // Bootstrap tenant database connections and default multi-tenant settings on mount
  useEffect(() => {
    bootstrapTenant();
  }, []);

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-700 mt-3 animate-pulse">
          Carregando plataforma de forma segura...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        {error && (
          <div className="max-w-md mx-auto mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider">⚠️ Alerta</h4>
            <p className="text-xs mt-1">{error}</p>
          </div>
        )}
        <LoginView />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans relative" id="app-root">
      {/* Collapsible Sidebar Navigation */}
      <Sidebar />

      {/* Main Container Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        {/* SaaS Global Header */}
        <Header />

        {/* Main Core View Area */}
        <main className="flex-1 w-full mx-auto p-4 md:p-6 lg:p-8 max-w-7xl" id="view-viewport">
          {loading && (
            <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700 mt-3 animate-pulse">
                Carregando dados seguros do canteiro... Por favor, aguarde.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6 relative shadow-sm">
              <h4 className="font-bold text-base">⚠️ Alerta do Servidor</h4>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Tab Routing Router */}
          <div className="animate-in fade-in duration-200" key={activeTab}>
            {activeTab === "dashboard" && <DashboardView />}
            {activeTab === "contracts" && <ContractsView />}
            {activeTab === "templates" && <TemplatesView />}
            {activeTab === "signatures" && <SignaturesView />}
            {activeTab === "obras" && <ObrasView />}
            {activeTab === "reports" && <ReportsView />}
            {activeTab === "settings" && <SettingsView />}
          </div>
        </main>

        {/* Human Footing */}
        <footer className="py-6 border-t border-slate-200 text-center text-slate-400 text-xs bg-white">
          <p className="font-normal">
            &copy; 2026 Contratos & Obras. Todos os direitos reservados. Ambiente Seguro e Protegido.
          </p>
        </footer>
      </div>
    </div>
  );
}
