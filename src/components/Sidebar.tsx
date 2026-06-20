import React from "react";
import { useStore } from "../store.js";
import {
  LayoutDashboard,
  FileText,
  Library,
  FilePlus,
  Clock,
  FolderCheck,
  HardHat,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Building2,
  UserCircle,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    currentCompany,
    currentUser,
    companies,
    switchCompany,
    logout
  } = useStore();

  // Navigation handlers with auto-closing on mobile viewport
  const handleNavigate = (tab: string, callback?: () => void) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    if (callback) {
      setTimeout(callback, 100);
    }
  };

  // Sidebar item helper layout
  const sidebarSections = [
    {
      title: "Contratos & Assinaturas",
      items: [
        {
          id: "dashboard",
          label: "Dashboard Principal",
          icon: LayoutDashboard,
          action: () => handleNavigate("dashboard")
        },
        {
          id: "contracts-all",
          label: "Contratos",
          icon: FileText,
          isActive: activeTab === "contracts",
          action: () => handleNavigate("contracts", () => {
            window.dispatchEvent(new CustomEvent("filter-contract-status", { detail: "" }));
          })
        },
        {
          id: "templates",
          label: "Templates",
          icon: Library,
          action: () => handleNavigate("templates")
        },
        {
          id: "new-contract",
          label: "Novo Contrato",
          icon: FilePlus,
          isActionBtn: true,
          action: () => handleNavigate("contracts", () => {
            window.dispatchEvent(new Event("trigger-contract-wizard"));
          })
        },
        {
          id: "signatures",
          label: "Assinaturas",
          icon: Clock,
          action: () => handleNavigate("signatures")
        },
        {
          id: "contracts-active",
          label: "Gerenciador",
          icon: FolderCheck,
          action: () => handleNavigate("contracts", () => {
            window.dispatchEvent(new CustomEvent("filter-contract-status", { detail: "Ativo" }));
          })
        }
      ]
    },
    {
      title: "Obras & Configurações",
      items: [
        {
          id: "obras",
          label: "Obras",
          icon: HardHat,
          action: () => handleNavigate("obras")
        },
        {
          id: "reports",
          label: "Relatórios",
          icon: BarChart3,
          action: () => handleNavigate("reports")
        },
        {
          id: "settings",
          label: "Configurações",
          icon: Settings,
          action: () => handleNavigate("settings")
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Box Shell */}
      <aside
        id="sidebar-navigation"
        className={`fixed inset-y-0 left-0 bg-slate-900 text-slate-100 z-50 flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Sidebar Header Brand / Title */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="bg-indigo-600 h-9 w-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-650/40">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="animate-in fade-in duration-200">
                <h2 className="text-sm font-black tracking-tight text-white leading-none">
                  Contratos & Obras
                </h2>
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-1 block">
                  ERP Corporativo
                </p>
              </div>
            )}
          </div>

          {/* Close button inside mobile menu */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg lg:hidden"
            title="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Partner Logo Segment (Current Tenant display) */}
        {!sidebarCollapsed && currentCompany && (
          <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800 animate-in fade-in duration-150">
            <div className="flex flex-col items-stretch">
              <span className="text-[10px] text-slate-500 font-bold block uppercase leading-none mb-1.5 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-indigo-400 shrink-0" /> Empresa Ativa
              </span>
              {currentUser?.role === "ADMIN" ? (
                <select
                  value={currentCompany.id}
                  onChange={(e) => switchCompany(e.target.value)}
                  className="bg-slate-900 text-xs font-bold text-slate-200 block w-full truncate border border-slate-700/60 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer text-ellipsis text-left"
                >
                  {companies.map((co) => (
                    <option key={co.id} value={co.id} className="bg-slate-900 text-slate-200">
                      {co.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  <span className="text-xs font-bold truncate block w-full" title={currentCompany.name}>
                    {currentCompany.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sidebar Middle Navigation Core */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">
          {sidebarSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {/* Category Header Title */}
              {!sidebarCollapsed ? (
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block px-5 mb-1 animate-in fade-in">
                  {section.title}
                </span>
              ) : (
                <div className="h-px bg-slate-800 my-2 mx-4" />
              )}

              {/* Action items inside category */}
              <div className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  const IconComponent = item.icon;
                  const itemIsActive = item.isActive !== undefined ? item.isActive : (activeTab === item.id);
                  
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className={`w-full group rounded-xl px-3 py-2 flex items-center transition-all cursor-pointer relative
                        ${sidebarCollapsed ? "justify-center" : "gap-3"}
                        ${itemIsActive
                          ? "bg-indigo-600 text-white font-semibold"
                          : item.isActionBtn
                            ? "bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 hover:bg-indigo-900/40 hover:text-indigo-200 font-semibold"
                            : "text-slate-400 hover:text-slate-150 hover:bg-slate-800/60"
                        }
                      `}
                      title={`${item.label} (${section.title})`}
                    >
                      <IconComponent className={`h-4.5 w-4.5 shrink-0 ${itemIsActive ? "text-white" : item.isActionBtn ? "text-indigo-405 text-indigo-400" : "text-slate-400 group-hover:text-slate-100"}`} />
                      
                      {!sidebarCollapsed && (
                        <span className="text-xs tracking-wide animate-in slide-in-from-left-1.5 duration-200">
                          {item.label}
                        </span>
                      )}

                      {/* Small notification-like accent indicator */}
                      {itemIsActive && sidebarCollapsed && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Profie / Dock Toggle */}
        <div className="border-t border-slate-800 bg-slate-950/20 p-3 space-y-3 shrink-0">
          {/* User profile identifier block */}
          {currentUser && (
            <div className={`flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-900/50 ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
              <div className="flex items-center gap-2 min-w-0">
                <UserCircle className="h-8 w-8 text-emerald-500 shrink-0" />
                {!sidebarCollapsed && (
                  <div className="truncate animate-in fade-in duration-200">
                    <p className="text-xs font-bold text-white leading-tight truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 block leading-none">
                      {currentUser.role === "ADMIN" ? "Diretor Administ." : "Operador Geral"}
                    </p>
                  </div>
                )}
              </div>

              {!sidebarCollapsed && (
                <button
                  onClick={() => logout()}
                  className="p-1 px-1.5 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                  title="Sair do ERP (Desconectar)"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Collapsing switcher (Desktop Only) */}
          <div className="hidden lg:block">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-800/60 cursor-pointer"
              title={sidebarCollapsed ? "Expandir Painel" : "Recolher Painel"}
            >
              {sidebarCollapsed ? (
                <>
                  <ChevronRight className="h-4 w-4 text-indigo-400 animate-pulse" />
                </>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 text-indigo-400" />
                  <span>Recolher Menu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
