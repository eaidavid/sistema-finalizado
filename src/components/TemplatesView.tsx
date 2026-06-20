import React, { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { ContractTemplate } from "../types.js";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api.js";

type EditableField = {
  name: string;
  label: string;
  type: string;
};

const defaultFields: EditableField[] = [
  { name: "NOME_CONTRATADO", label: "Nome do Contratado", type: "text" },
  { name: "VALOR", label: "Valor Contratual (R$)", type: "number" },
];

export default function TemplatesView() {
  const { currentCompany, currentUser } = useStore();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("serviço");
  const [baseContent, setBaseContent] = useState("");
  const [customFields, setCustomFields] = useState<EditableField[]>(defaultFields);

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  const fetchTemplates = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/templates", {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentCompany?.id, currentUser?.id]);

  const resetForm = () => {
    setShowForm(false);
    setEditingTemplateId(null);
    setName("");
    setCategory("serviço");
    setBaseContent("");
    setCustomFields(defaultFields);
    setNewFieldName("");
    setNewFieldLabel("");
    setNewFieldType("text");
  };

  const addCustomFieldToForm = () => {
    if (!newFieldName || !newFieldLabel) return;
    const cleanVar = newFieldName.toUpperCase().replace(/[^\w]/g, "");
    setCustomFields((prev) => [...prev, { name: cleanVar, label: newFieldLabel, type: newFieldType }]);
    setNewFieldName("");
    setNewFieldLabel("");
    setNewFieldType("text");
  };

  const removeFieldFromForm = (idx: number) => {
    setCustomFields((prev) => prev.filter((_, index) => index !== idx));
  };

  const handleEditTemplate = (tpl: ContractTemplate) => {
    setEditingTemplateId(tpl.id);
    setName(tpl.name);
    setCategory(tpl.category);
    setBaseContent(tpl.baseContent);
    setCustomFields(
      tpl.fields?.map((field) => ({
        name: field.name,
        label: field.label,
        type: field.type,
      })) || []
    );
    setShowForm(true);
  };

  const handleDeleteTemplate = async (tpl: ContractTemplate) => {
    if (!currentCompany?.id) return;
    if (!confirm(`Deseja excluir o template "${tpl.name}"?`)) return;

    try {
      const res = await apiFetch(`/api/templates/${tpl.id}`, {
        method: "DELETE",
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Falha ao excluir template.");
      }

      if (editingTemplateId === tpl.id) {
        resetForm();
      }
      await fetchTemplates();
      alert("Template excluído com sucesso.");
    } catch (err: any) {
      alert(err.message || "Erro ao excluir template.");
    }
  };

  const handleCreateOrUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id || !name || !baseContent) return;

    const isEditing = Boolean(editingTemplateId);

    try {
      const res = await apiFetch(isEditing ? `/api/templates/${editingTemplateId}` : "/api/templates/new", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          name,
          category,
          baseContent,
          fields: customFields,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || (isEditing ? "Erro ao atualizar." : "Erro ao criar."));
      }

      resetForm();
      await fetchTemplates();
      alert(isEditing ? "Template atualizado com sucesso!" : "Template salvo com sucesso! Já está disponível no preenchimento guiado.");
    } catch (err: any) {
      alert("Falha: " + err.message);
    }
  };

  return (
    <div className="space-y-6" id="templates-view-wrapper">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Biblioteca de Modelos (Base)</h2>
          <p className="text-xs text-slate-500 mt-1">Mapeamento de variáveis estruturais e teor de minutas.</p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs px-3.5 py-2 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
        >
          {showForm ? "Fechar Criador" : "Registrar Novo Modelo Customizado"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateOrUpdateTemplate} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5 animate-in slide-in-from-top-4 duration-200">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-sm">{editingTemplateId ? "Editar Modelo Contratual" : "Modelador Dinâmico de Contratos"}</h4>
            <p className="text-xs text-slate-500 mt-0.5">Defina clausulados base usando demarcações em colchetes de variáveis correspondentes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Nome do Modelo</label>
              <input
                type="text"
                required
                placeholder="Ex: Contrato de Fornecimento de Gesso Sanca..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Categoria de Minuta</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
              >
                <option value="serviço">Prestação de Serviço</option>
                <option value="trabalho">Trabalho / Colaborador</option>
                <option value="locação">Locação de Bens</option>
                <option value="obra">Obra / Empreitada</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Conteúdo com Demarcadores</label>
              <textarea
                required
                rows={8}
                placeholder="Escreva a minuta geral colocando demarcações entre colchetes em correspondência com as variáveis listadas ao lado. Ex: Eu, [NOME_CONTRATADO], aceito faturar [VALOR] reais..."
                value={baseContent}
                onChange={(e) => setBaseContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-mono focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-150 space-y-4">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mapeador de Parâmetros Variáveis (Campos)</h5>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Variável (Sem espaços)</label>
                <input
                  type="text"
                  placeholder="Ex: ENDERECO_OBRA"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-xs text-slate-800 uppercase focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Legenda Humana (Label)</label>
                <input
                  type="text"
                  placeholder="Ex: Local da Obra"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Campo</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="text">Texto livre</option>
                  <option value="number">Número / Monetário</option>
                  <option value="date">Data de Calendário</option>
                </select>
              </div>
              <button
                type="button"
                onClick={addCustomFieldToForm}
                className="py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold shadow-sm cursor-pointer border border-indigo-200"
              >
                + Variável
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-205">
              {customFields.map((field, fsIdx) => (
                <div key={`${field.name}-${fsIdx}`} className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded text-[9px] font-bold font-mono">[{field.name}]</span>
                  <span>{field.label} ({field.type})</span>
                  <button
                    type="button"
                    onClick={() => removeFieldFromForm(fsIdx)}
                    className="text-red-400 hover:text-red-600 font-bold ml-1 text-sm font-mono text-center cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
            >
              {editingTemplateId ? "Salvar Atualização" : "Confirmar Gravação de Modelo"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-10 text-center text-slate-500 font-medium animate-pulse text-xs">
          Buscando minutas de acervo catalogadas...
        </div>
      ) : templates.length === 0 ? (
        <div className="p-12 text-center text-slate-450 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-xs">
          Nenhum modelo cadastrado nesta organização ainda. Use o criador acima.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="templates-grid">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-sm hover:border-slate-350 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="bg-slate-50 text-slate-500 border border-slate-150 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded">
                    {tpl.category}
                  </span>
                  <BookOpen className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm tracking-tight">{tpl.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 max-h-16 overflow-hidden line-clamp-2 leading-relaxed">
                    {tpl.baseContent}
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleEditTemplate(tpl)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tpl)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 mt-4 pt-3.5 space-y-2">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Mapeamento de Variáveis obrigatórias</span>
                <div className="flex flex-wrap gap-1.5">
                  {tpl.fields && tpl.fields.length > 0 ? (
                    tpl.fields.map((field) => (
                      <span key={field.id} className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-100 font-mono">
                        {field.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Sem variáveis especiais</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
