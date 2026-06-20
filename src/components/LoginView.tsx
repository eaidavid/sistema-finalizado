import React, { useState } from "react";
import { useStore } from "../store.js";
import { Sparkles, Building2, User2, ArrowRight, ShieldCheck, Plus, CheckCircle, Lock } from "lucide-react";
import { apiFetch } from "../lib/api.js";

export default function LoginView() {
  const { login } = useStore();
  const [activeSegment, setActiveSegment] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  
  // Login form states
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  
  // Registration form states
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCnpj, setNewCompanyCnpj] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [successRegister, setSuccessRegister] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setErrorLocal("Por favor, preencha o e-mail corporativo e a senha.");
      return;
    }
    setLoading(true);
    setErrorLocal(null);
    try {
      await login(emailInput.trim(), passwordInput);
    } catch (error: any) {
      console.error(error);
      setErrorLocal(error.message || "Erro de login. E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName || !newCompanyCnpj || !newAdminName || !newAdminEmail || !newAdminPassword) {
      alert("Por favor, preencha todos os campos do formulário.");
      return;
    }
    setLoading(true);
    setErrorLocal(null);
    try {
      const res = await apiFetch("/api/auth/companies/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCompanyName,
          cnpj: newCompanyCnpj,
          adminName: newAdminName,
          adminEmail: newAdminEmail,
          password: newAdminPassword
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessRegister(true);
        setTimeout(async () => {
          // Log in securely with the newly registered credentials
          await login(data.user.email, newAdminPassword);
        }, 1500);
      } else {
        const errData = await res.json();
        alert(errData.error || "Erro ao registrar nova empresa.");
      }
    } catch (err) {
      console.error(err);
      alert("Houve um imprevisto de rede ao criar a empresa.");
    } finally {
      setLoading(false);
    }
  };

  // Human friendly descriptions of demo cards for testers
  const demoUsers = [
    {
      name: "Ricardo Silva",
      role: "Diretor Geral (Admin - ACME)",
      email: "admin@acme.com.br",
      password: "senha123",
      company: "ACME Construtora & Reformas"
    },
    {
      name: "Ana Costa",
      role: "Gestora Operacional (User - ACME)",
      email: "gestor@acme.com.br",
      password: "senha123",
      company: "ACME Construtora & Reformas"
    },
    {
      name: "Marcelo Rebelo",
      role: "Diretor Comercial (Admin - INOVA)",
      email: "admin@inova.com.br",
      password: "senha123",
      company: "Inova Empreendimentos"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand visual header */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-indigo-600 h-12 w-12 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/20 mb-4 animate-bounce">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Contratos & Obras
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 font-normal leading-relaxed max-w-sm">
            Gestão inteligente de canteiros, distribuição de custos e assinatura digital de contratos. Tudo em um único ERP corporativo altamente seguro.
          </p>
        </div>

        {/* Tab Selector Segment */}
        <div className="mt-8 bg-slate-200/60 p-1 rounded-xl flex items-center justify-center">
          <button
            onClick={() => { setActiveSegment("login"); setSuccessRegister(false); setErrorLocal(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSegment === "login"
                ? "bg-white text-indigo-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Acessar Minha Conta
          </button>
          <button
            onClick={() => { setActiveSegment("register"); setErrorLocal(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSegment === "register"
                ? "bg-white text-indigo-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Registrar Nova Empresa
          </button>
        </div>

        {/* Form Container */}
        <div className="mt-4 bg-white py-6 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-8">
          {errorLocal && (
            <div className="mb-4 bg-rose-50 border border-rose-150 rounded-xl p-3 text-rose-800 text-[11px] font-semibold">
              ⚠️ {errorLocal}
            </div>
          )}

          {activeSegment === "login" ? (
            <div className="space-y-6">
              {/* Strict Authenticated Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email-input" className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    E-mail Corporativo
                  </label>
                  <div className="relative">
                    <User2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="email-input"
                      type="email"
                      required
                      placeholder="seu-nome@empresa.com.br"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password-input" className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="password-input"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 flex justify-center items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Verificando Credenciais..." : "Autenticar e Entrar"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Registration Form with password field */}
              {successRegister ? (
                <div className="py-6 text-center space-y-3 animate-in fade-in duration-350">
                  <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full animate-pulse">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Empresa Ativada com Sucesso!</h4>
                  <p className="text-xs text-slate-500 font-normal">Inicializando espaço seguro de auditorias e criptografia de senhas...</p>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-indigo-800 text-[11px] leading-relaxed font-normal">
                    <span className="font-bold">Privacidade Total:</span> Ao registrar, o sistema vincula suas informações a um banco de dados hermético. Ninguém poderá acessar seu painel sem as credenciais do diretor cadastradas abaixo.
                  </div>

                  <div>
                    <label htmlFor="reg-company-name" className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                      Nome da Construtora / Incorporadora
                    </label>
                    <input
                      id="reg-company-name"
                      type="text"
                      required
                      placeholder="Ex: Prime Empreendimentos Ltda"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-company-cnpj" className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                      CNPJ Comercial
                    </label>
                    <input
                      id="reg-company-cnpj"
                      type="text"
                      required
                      placeholder="Ex: 12.345.678/0001-00"
                      value={newCompanyCnpj}
                      onChange={(e) => setNewCompanyCnpj(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  <div className="h-px bg-slate-100 my-2"></div>

                  <div>
                    <label htmlFor="reg-admin-name" className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                      Nome do Diretor Administrativo
                    </label>
                    <input
                      id="reg-admin-name"
                      type="text"
                      required
                      placeholder="Ex: David Reis"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-admin-email" className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                      E-mail do Diretor Geral
                    </label>
                    <input
                      id="reg-admin-email"
                      type="email"
                      required
                      placeholder="Ex: david@primeconstrutora.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-admin-password" className="block text-xs font-semibold text-slate-500 uppercase mb-0.5">
                      Definir Senha de Acesso
                    </label>
                    <input
                      id="reg-admin-password"
                      type="password"
                      required
                      placeholder="Crie uma senha forte"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-4 h-10"
                  >
                    {loading ? "Criando Espaço Seguro..." : "Registrar Construtora Agora"}
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Quick Access Demo Accounts Card for Reviewers */}
        <div className="mt-6 bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-700">Contas Demonstrativas Seguro (Clique para Preencher)</h4>
          </div>
          <p className="text-[10px] text-slate-505 text-slate-500 font-normal leading-relaxed">
            Selecione uma das credenciais padrão abaixo. O ERP irá preencher o e-mail e a senha no formulário acima automaticamente para que você possa conferir a validação obrigatória.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {demoUsers.map((d, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setEmailInput(d.email);
                  setPasswordInput(d.password);
                  setActiveSegment("login");
                  setErrorLocal(null);
                }}
                className={`bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl p-2.5 text-left transition-all cursor-pointer flex justify-between items-center group ${emailInput === d.email ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-50/10' : ''}`}
              >
                <div className="truncate pr-2">
                  <span className="text-[11px] font-bold text-slate-800 block group-hover:text-indigo-700 transition-colors">
                    {d.name}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate font-normal">
                    {d.role} &bull; <span className="font-semibold text-slate-600">{d.company}</span>
                  </span>
                  <span className="text-[9.5px] font-mono text-indigo-600 font-semibold block truncate">
                    E-mail: {d.email} &bull; Senha: {d.password}
                  </span>
                </div>
                <span className="text-[10px] bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 text-slate-600 px-2 py-1 rounded-md font-bold shrink-0 transition-colors">
                  Preencher
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
