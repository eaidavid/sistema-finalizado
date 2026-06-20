import React, { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { User, Company } from "../types.js";
import { apiFetch } from "../lib/api.js";
import {
  Settings,
  Users,
  Plus,
  Building2,
  Lock,
  RefreshCcw,
  AlertOctagon,
  CheckCircle,
  Mail,
  Smartphone,
  ShieldAlert,
  FolderLock
} from "lucide-react";

export default function SettingsView() {
  const { currentCompany, currentUser, bootstrapTenant, logout, setCurrentCompany } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Registration States for New Users
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "USER">("USER");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userError, setUserError] = useState("");
  const [userSuccessMessage, setUserSuccessMessage] = useState("");

  // Company parametrizations
  const [companyName, setCompanyName] = useState(currentCompany?.name || "");
  const [companyCnpj, setCompanyCnpj] = useState(currentCompany?.cnpj || "");
  const [companyContact, setCompanyContact] = useState("(11) 98888-7766");
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);
  const [companySuccess, setCompanySuccess] = useState(false);

  // System Database Reset
  const [isResetting, setIsResetting] = useState(false);

  const fetchUsers = async () => {
    if (!currentCompany?.id) return;
    setLoadingUsers(true);
    try {
      const res = await apiFetch(`/api/auth/users?cid=${currentCompany.id}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Falha ao buscar usuários do Tenant:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentCompany?.id]);

  useEffect(() => {
    setCompanyName(currentCompany?.name || "");
    setCompanyCnpj(currentCompany?.cnpj || "");
  }, [currentCompany?.id, currentCompany?.name, currentCompany?.cnpj]);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id || !currentUser?.id) return;
    setIsUpdatingCompany(true);
    try {
      const res = await apiFetch("/api/auth/company", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({
          name: companyName,
          cnpj: companyCnpj,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Falha ao salvar parâmetros da empresa.");
      }

      const updatedCompany: Company = await res.json();
      setCurrentCompany(updatedCompany);
      setCompanySuccess(true);
      setTimeout(() => setCompanySuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar empresa.");
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    setUserSuccessMessage("");

    if (currentUser?.role !== "ADMIN") {
      setUserError("Erro: Apenas administradores podem criar novos colaboradores.");
      return;
    }

    if (!newUserName || !newUserEmail || !newUserPassword) {
      setUserError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsCreatingUser(true);
    try {
      // Create user endpoint manually compiled or proxy API using the mock-creation system inside company new logic
      // We can mock create user since we are in local/sandbox, or we can write a dedicated endpoint if we want, or do local state simulations.
      // Wait, let's create it on the server if possible or fake-create it on memory?
      // Better: let's build a real user creation API endpoint in /api/auth/users/new to keep it strictly high fidelity! 
      // Let's create the user in the backend!
      const res = await apiFetch("/api/auth/users/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany?.id || "",
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail.trim().toLowerCase(),
          password: newUserPassword,
          role: newUserRole,
          companyId: currentCompany?.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro de rede ao criar usuário.");
      }

      const created = await res.json();
      setUserSuccessMessage(`Funcionário ${created.name} cadastrado com sucesso!`);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      await fetchUsers();
      setTimeout(() => {
        setShowAddUser(false);
        setUserSuccessMessage("");
      }, 1500);
    } catch (err: any) {
      setUserError(err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSystemDatabaseReset = async () => {
    const isConfirmed = confirm(
      "Deseja esvaziar totalmente o banco de dados? Todas as novos contratos, vistorias e lançamentos de custos serão redefinidos."
    );
    if (!isConfirmed) return;

    setIsResetting(true);
    try {
      const res = await apiFetch("/api/system/reset", { method: "POST" });
      if (res.ok) {
        alert("O banco de dados SQLite/PostgreSQL foi totalmente re-semeado!");
        await bootstrapTenant();
        logout(); // force login again
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-600" />
          Parametrização & Configurações do Sistema
        </h2>
        <p className="text-sm text-slate-500">
          Gerenciamento operacional de sua organização, usuários multi-tenant e segurança global.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Company Settings Section (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="h-5 w-5 text-indigo-500" /> Ativos do Tenant Corporativo
            </h4>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Nome Empresarial
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                    CNPJ Comercial
                  </label>
                  <input
                    type="text"
                    required
                    value={companyCnpj}
                    onChange={(e) => setCompanyCnpj(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Telefone Geral / SAC / WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={companyContact}
                  onChange={(e) => setCompanyContact(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {companySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 duration-200 select-none">
                  <CheckCircle className="h-4 w-4" /> Parâmetros atualizados no banco de dados local!
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingCompany}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 border border-indigo-700/30 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0"
              >
                {isUpdatingCompany ? "Processando..." : "Salvar Configurações"}
              </button>
            </form>
          </div>

          {/* Hard reset system parameters */}
          <div className="bg-red-50/60 p-6 border border-red-200/80 rounded-2xl shadow-sm space-y-4">
            <h4 className="font-bold text-red-800 text-sm flex items-center gap-2 border-b border-red-150 pb-3">
              <AlertOctagon className="h-5 w-5 text-red-650 animate-bounce" /> Zona de Segurança / Purificação do Banco
            </h4>
            <p className="text-xs text-red-750 font-normal leading-relaxed">
              Deseja redefinir os dados para o padrão de demonstração de auditoria? Esta ação excluirá todos os dados existentes no Prisma, recarregando os tenants iniciais, novos cadastros e vistorias modelo.
            </p>
            <button
              onClick={handleSystemDatabaseReset}
              disabled={isResetting}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 border border-red-700/40 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2 transition-colors"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${isResetting && "animate-spin"}`} />
              {isResetting ? "Limpando registros..." : "Limpar e Re-semear Banco de Dados"}
            </button>
          </div>
        </div>

        {/* User Management Section (5 cols) */}
        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm lg:col-span-5 space-y-5 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" /> Gestão de Usuários
              </h4>
              <p className="text-[11px] text-slate-500">Contas de acesso para o Tenant: {currentCompany?.name}</p>
            </div>
            
            {currentUser?.role === "ADMIN" && (
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-150 rounded-lg flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            )}
          </div>

          {/* Block user switching if not admin. Only showcase company users */}
          {currentUser?.role !== "ADMIN" && (
            <div className="p-3 bg-amber-50 border border-amber-250/60 rounded-xl text-amber-900 text-[11px] font-normal leading-relaxed flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Acesso Operacional Restrito (USER)</p>
                <p className="mt-0.5">Sua conta é de nível colaborador. Apenas diretores administradores de sua empresa podem gerenciar usuários ou criar credenciais corporativas.</p>
              </div>
            </div>
          )}

          {/* Toggle Add User Form */}
          {showAddUser && currentUser?.role === "ADMIN" && (
            <form onSubmit={handleCreateNewUser} className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 animate-in slide-in-from-top-3 duration-200">
              <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Novo Usuário Co-autônomo</h5>
              
              <div className="space-y-2.5">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Nome Completo"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    required
                    placeholder="E-mail Corporativo"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    required
                    placeholder="Senha de Acesso"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-500">Nível / Role:</span>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="userRole"
                      checked={newUserRole === "USER"}
                      onChange={() => setNewUserRole("USER")}
                    />
                    USER (Operacional)
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="userRole"
                      checked={newUserRole === "ADMIN"}
                      onChange={() => setNewUserRole("ADMIN")}
                    />
                    ADMIN (Administrativo)
                  </label>
                </div>
              </div>

              {userError && <p className="text-[10px] text-red-655 text-red-600 font-bold">{userError}</p>}
              {userSuccessMessage && <p className="text-[10px] text-emerald-650 font-bold">{userSuccessMessage}</p>}

              <div className="flex justify-end gap-1.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-600 hover:text-slate-800 text-[10px] font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                >
                  {isCreatingUser ? "Salvando..." : "Cadastrar Usuário"}
                </button>
              </div>
            </form>
          )}

          {/* Live users of this company */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px]">
            {loadingUsers ? (
              <p className="text-xs text-slate-400 text-center py-5 animate-pulse">Sincronizando banco corporativo...</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-5">Nenhum usuário catalogado para esta empresa.</p>
            ) : (
              users.map((usr) => (
                <div
                  key={usr.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors
                    ${usr.id === currentUser?.id ? "bg-indigo-50/40 border-indigo-200" : "bg-slate-50 border-slate-150"}
                  `}
                >
                  <div>
                    <p className="font-bold text-slate-850 flex items-center gap-1.5">
                      {usr.name}
                      {usr.id === currentUser?.id && (
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full select-none uppercase">Ativo</span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{usr.email}</p>
                    <p className="text-[9px] text-slate-450 uppercase tracking-wider font-extrabold flex items-center gap-1 mt-1 font-mono">
                      {usr.role === "ADMIN" ? (
                        <span className="text-indigo-600">🛡️ Diretor (ADMIN)</span>
                      ) : (
                        <span className="text-emerald-600">🏗️ Operador (USER)</span>
                      )}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1 select-none">
                    <span className="text-[10px] text-slate-405 text-slate-450 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                      ID: {usr.id.slice(0, 4)}
                    </span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 font-bold font-mono">
                      <Lock className="h-3 w-3 inline text-slate-300" /> {(usr as any).password ? (usr as any).password.replace(/./g, "•") : "••••••••"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
