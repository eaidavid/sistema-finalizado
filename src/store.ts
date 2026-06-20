import { create } from "zustand";
import { Company, User } from "./types.js";
import { apiFetch } from "./lib/api.js";

interface TenantState {
  currentCompany: Company | null;
  currentUser: User | null;
  authToken: string | null;
  companies: Company[];
  users: User[];
  activeTab: string; // "dashboard" | "contracts" | "templates" | "signatures" | "obras" | "reports"
  loading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Actions
  setCompanies: (companies: Company[]) => void;
  setUsers: (users: User[]) => void;
  setCurrentCompany: (company: Company | null) => void;
  setCurrentUser: (user: User | null) => void;
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Fetch helpers
  bootstrapTenant: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  login: (email: string, passwordString: string) => Promise<void>;
  logout: () => void;
}

export const useStore = create<TenantState>((set, get) => ({
  currentCompany: null,
  currentUser: null,
  authToken: localStorage.getItem("auth_token"),
  companies: [],
  users: [],
  activeTab: "dashboard",
  loading: false,
  error: null,
  sidebarOpen: false,
  sidebarCollapsed: false,

  setCompanies: (companies) => set({ companies }),
  setUsers: (users) => set({ users }),
  
  setCurrentCompany: (company) => {
    set({ currentCompany: company });
    if (company) {
      localStorage.setItem("active_company_id", company.id);
    } else {
      localStorage.removeItem("active_company_id");
    }
  },

  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) {
      localStorage.setItem("active_user_id", user.id);
    } else {
      localStorage.removeItem("active_user_id");
    }
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  bootstrapTenant: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Fetch companies
      const resCos = await apiFetch("/api/auth/companies");
      if (!resCos.ok) throw new Error("Falha ao carregar empresas multi-tenant.");
      const cos: Company[] = await resCos.json();
      set({ companies: cos });

      if (cos.length === 0) {
        set({ loading: false });
        return;
      }

      // 2. Select pre-saved company/user
      const savedCoId = localStorage.getItem("active_company_id");
      const savedUsrId = localStorage.getItem("active_user_id");

      if (!savedCoId || !savedUsrId) {
        set({ currentCompany: null, currentUser: null });
        return;
      }

      let activeCo = cos.find(c => c.id === savedCoId);
      if (!activeCo) {
        localStorage.removeItem("active_company_id");
        localStorage.removeItem("active_user_id");
        set({ currentCompany: null, currentUser: null });
        return;
      }
      set({ currentCompany: activeCo });

      // 3. Fetch users for this active company
      const resUsers = await apiFetch(`/api/auth/users?cid=${activeCo.id}`);
      if (!resUsers.ok) throw new Error("Falha ao carregar usuários da empresa.");
      const users: User[] = await resUsers.json();
      set({ users });

      // 4. Select pre-saved user
      let activeUsr = users.find(u => u.id === savedUsrId) || null;
      set({ currentUser: activeUsr });

    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  switchCompany: async (companyId: string) => {
    set({ loading: true, error: null });
    try {
      const co = get().companies.find(c => c.id === companyId);
      if (!co) throw new Error("Empresa não encontrada.");
      
      set({ currentCompany: co });
      localStorage.setItem("active_company_id", companyId);

      const resUsers = await apiFetch(`/api/auth/users?cid=${companyId}`);
      if (!resUsers.ok) throw new Error("Erro de rede ao carregar os novos usuários.");
      const users: User[] = await resUsers.json();
      set({ users });

      const firstAdmin = users.find(u => u.role === "ADMIN") || users[0] || null;
      set({ currentUser: firstAdmin });
      if (firstAdmin) {
        localStorage.setItem("active_user_id", firstAdmin.id);
      } else {
        localStorage.removeItem("active_user_id");
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  login: async (email: string, passwordString: string) => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: passwordString }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Acesso negado. Credenciais incorretas.");
      }
      const data = await res.json();
      const { token, user, company } = data;

      localStorage.setItem("active_company_id", company.id);
      localStorage.setItem("active_user_id", user.id);
      if (token) {
        localStorage.setItem("auth_token", token);
      }

      // Load companies and users for session references
      const resCos = await apiFetch("/api/auth/companies");
      const cos = await resCos.json();
      set({ companies: cos, currentCompany: company, currentUser: user, authToken: token || null });

      const resUsers = await apiFetch(`/api/auth/users?cid=${company.id}`);
      const users = await resUsers.json();
      set({ users });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("active_company_id");
    localStorage.removeItem("active_user_id");
    localStorage.removeItem("auth_token");
    set({ currentCompany: null, currentUser: null, authToken: null, activeTab: "dashboard" });
  }
}));
