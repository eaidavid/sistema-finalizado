import React, { useEffect, useState, useRef } from "react";
import { useStore } from "../store.js";
import { Contract, SignatureRequest } from "../types.js";
import { apiFetch } from "../lib/api.js";
import {
  FileSignature,
  User,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Globe,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw,
  BookOpen,
  FileText,
  BadgePercent,
  Calendar,
  Lock,
  Stamp,
  Fingerprint
} from "lucide-react";

export default function SignaturesView() {
  const { currentCompany, currentUser } = useStore();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected contract details for the main paper view
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Simulated signing terminal states
  const [activeRequestToSign, setActiveRequestToSign] = useState<(SignatureRequest & { contract: Contract }) | null>(null);
  const [typedFullname, setTypedFullname] = useState("");
  const [typedCpf, setTypedCpf] = useState("");
  const [signatureType, setSignatureType] = useState<"drawn" | "typed">("drawn");
  const [isSigningInProcess, setIsSigningInProcess] = useState(false);
  const [isSuccessAnimated, setIsSuccessAnimated] = useState(false);

  // HTML5 Canvas Drawing Pad Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastCoordsRef = useRef({ x: 0, y: 0 });

  const fetchContractsWithSignatures = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/contracts", {
        headers: {
          "x-company-id": currentCompany.id,
          "x-user-id": currentUser?.id || "",
        },
      });
      if (res.ok) {
        const data: Contract[] = await res.json();
        // Get all contracts with signature requests
        const filtered = data.filter(c => c.signatureRequests && c.signatureRequests.length > 0);
        setContracts(filtered);
        if (filtered.length > 0 && !selectedContract) {
          setSelectedContract(filtered[0]);
        } else if (selectedContract) {
          // Sync selected contract state after status update
          const updated = filtered.find(c => c.id === selectedContract.id);
          if (updated) setSelectedContract(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractsWithSignatures();
  }, [currentCompany?.id, currentUser?.id]);

  // Hook canvas event handlers when the pad appears
  useEffect(() => {
    if (signatureType === "drawn" && canvasRef.current) {
      initCanvas();
    }
  }, [activeRequestToSign, signatureType]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High resolution drawings
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#4f46e5"; // Indigo brand pigment
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = true;
    lastCoordsRef.current = getCanvasCoords(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastCoordsRef.current.x, lastCoordsRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastCoordsRef.current = coords;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Copy simulated link
  const copySignedLink = (reqId: string) => {
    const url = `${window.location.origin}/api/signature-requests/${reqId}/sign`;
    navigator.clipboard.writeText(url);
    alert("URL real da API de Assinatura copiado com sucesso!");
  };

  // Launch simulated signer UI
  const handleLoadSigner = (req: SignatureRequest, contract: Contract) => {
    setActiveRequestToSign({
      ...req,
      contract,
    });
    setTypedFullname("");
    setTypedCpf("");
    setSignatureType("drawn");
    setIsSuccessAnimated(false);
  };

  // Submit signature to server
  const submitSimulatedSignature = async () => {
    if (!activeRequestToSign) return;
    if (!typedFullname) {
      alert("Por favor, preencha o seu nome completo para assinar eletronicamente.");
      return;
    }
    if (!typedCpf) {
      alert("Por favor, preencha o CPF do signatário para as chaves digitais.");
      return;
    }

    setIsSigningInProcess(true);
    try {
      let signatureValue = "";
      if (signatureType === "drawn" && canvasRef.current) {
        signatureValue = canvasRef.current.toDataURL("image/png");
      } else {
        signatureValue = typedFullname;
      }

      const res = await apiFetch(`/api/signature-requests/${activeRequestToSign.id}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signerName: typedFullname,
          signerCpf: typedCpf,
          signatureType,
          signatureValue,
        })
      });

      if (!res.ok) throw new Error("Falha ao registrar carimbos no servidor.");

      setIsSuccessAnimated(true);
      setTimeout(async () => {
        setActiveRequestToSign(null);
        await fetchContractsWithSignatures();
      }, 2500);
    } catch (err: any) {
      alert("Erro ao validar: " + err.message);
    } finally {
      setIsSigningInProcess(false);
    }
  };

  return (
    <div className="space-y-6" id="signatures-main-view">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileSignature className="h-5.5 w-5.5 text-indigo-600" />
          Gerenciador Avançado de Assinaturas Eletrônicas
        </h2>
        <p className="text-sm text-slate-500">
          Visualize a via real e legal dos contratos, simule assinaturas manuscritas digitais e valide os caribos auditados pela ICP-Brasil.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Queue of Pending Actions (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 lg:self-start bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            Ações de Despacho & Status
          </h3>

          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium animate-pulse">
              Carregando via e assinantes...
            </div>
          ) : contracts.length === 0 ? (
            <div className="py-10 text-center text-slate-450 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs">
              Nenhuma solicitação ativa. Crie contratos e clique em "Despachar" para listá-los.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {contracts.map(contract => {
                const isSelected = selectedContract?.id === contract.id;
                const totalReqs = contract.signatureRequests?.length || 0;
                const signedReqs = contract.signatureRequests?.filter(r => r.status === "Assinado").length || 0;
                const allSigned = signedReqs === totalReqs;

                return (
                  <div
                    key={contract.id}
                    onClick={() => setSelectedContract(contract)}
                    className={`p-3.5 border rounded-xl transition-all cursor-pointer relative text-left select-none
                      ${isSelected 
                        ? "bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-300/40" 
                        : "bg-slate-50 border-slate-150 hover:bg-slate-100"
                      }
                    `}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="truncate flex-1">
                        <h4 className="font-bold text-xs text-slate-800 truncate" title={contract.title}>
                          {contract.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono block mt-1">
                          Ref: R$ {contract.value.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 border
                        ${allSigned 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      `}>
                        {allSigned ? "Concluído" : `${signedReqs}/${totalReqs}`}
                      </span>
                    </div>

                    {/* Progress microbar */}
                    <div className="w-full bg-slate-200 h-1 rounded-full mt-3 overflow-hidden">
                      <div 
                        className={`h-full ${allSigned ? "bg-emerald-500" : "bg-indigo-500"}`}
                        style={{ width: `${(signedReqs / (totalReqs || 1)) * 100}%` }}
                      />
                    </div>

                    {/* Miniature audit track */}
                    <div className="mt-3.5 pt-2 border-t border-slate-200/60 space-y-2">
                      {contract.signatureRequests?.map((req) => (
                        <div key={req.id} className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-600 font-mono truncate max-w-[150px]">{req.recipient}</span>
                          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded
                            ${req.status === "Assinado" 
                              ? "bg-emerald-100/65 text-emerald-800" 
                              : "text-amber-700 font-bold"
                            }`}
                          >
                            {req.status === "Assinado" ? "OK" : "Pendente"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN: Real View of the physical document with Stamps (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {selectedContract ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
              
              {/* Tab Header inside Document container */}
              <div className="bg-slate-50 border-b border-slate-150 px-5 py-3.5 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileText className="h-4 w-4 text-slate-400" /> Folha de Minuta Real
                </span>
                
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1
                  ${selectedContract.status === "Ativo" 
                    ? "bg-emerald-100 text-emerald-800" 
                    : "bg-amber-100 text-amber-800"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {selectedContract.status}
                </span>
              </div>

              {/* Physical paper mock */}
              <div 
                className="p-8 md:p-10 font-serif leading-relaxed text-slate-900 border-b border-slate-100 text-xs bg-[linear-gradient(#fcfcfc_95%,#f1f5f9_100%)] lg:h-[580px] overflow-y-auto space-y-6 select-text"
                id="doc-simulation-paper"
              >
                {/* Official Header */}
                <div className="text-center font-sans space-y-1.5 border-b-2 border-slate-900 pb-5">
                  <Stamp className="h-8 w-8 text-indigo-700 mx-auto" />
                  <h3 className="font-extrabold text-slate-900 uppercase tracking-widest text-sm">
                    {currentCompany?.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    REGISTRO CADASTRAL CPF/CNPJ: {currentCompany?.cnpj}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    AUTENTICAÇÃO CERTIFICADA ICP-BRASIL, EMISSÃO DIGITAL
                  </p>
                </div>

                {/* Contract title and core content of variables */}
                <div className="font-sans space-y-3 pt-2">
                  <h4 className="text-center font-bold text-sm text-slate-900 uppercase underline decoration-indigo-500/55 decoration-2">
                    {selectedContract.title}
                  </h4>
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 text-[11px] text-slate-700 font-sans">
                    <div className="grid grid-cols-2 gap-2">
                      <p><strong>Tipo:</strong> {selectedContract.type}</p>
                      <p><strong>Valor Global:</strong> R$ {selectedContract.value.toLocaleString("pt-BR")}</p>
                      <p><strong>Início:</strong> {new Date(selectedContract.startDate).toLocaleDateString("pt-BR")}</p>
                      <p><strong>Término:</strong> {new Date(selectedContract.endDate).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                </div>

                {/* Custom formatted legal text block of the contract template */}
                <div className="space-y-4 pt-2 font-serif text-[12px] text-slate-800 leading-relaxed text-justify antialiased">
                  <p className="indent-8 text-justify">
                    <strong>CLÁUSULA PRIMEIRA:</strong> O presente instrumento regula o fornecimento operacional, engenharia corporativa e auditoria de insumos relativos ao empreendimento pactuado sob demanda mútua.
                  </p>
                  
                  <div className="p-3.5 bg-slate-50 rounded-xl font-mono text-[10px] text-slate-650 text-slate-500 leading-normal border border-slate-100 uppercase">
                    {selectedContract.content || "Ficha técnica e descrição operacional de minuta nula ou não informada."}
                  </div>

                  <p className="indent-8 text-justify">
                    <strong>CLÁUSULA SEGUNDA:</strong> Em conformidade com a MP 2.200-2/2001, todos os signatários outorgam autenticidade e fé jurídica absoluta aos relatórios gerados por este terminal de sandbox de forma plena.
                  </p>
                </div>

                {/* Digital legal certification stamp on the document (If Signed) */}
                <div className="pt-6 border-t border-slate-200 space-y-4 font-sans">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Chaves & Autenticações
                  </h5>
                  
                  {selectedContract.signatureRequests?.map((req, rIdx) => {
                    const isSigned = req.status === "Assinado";

                    return (
                      <div key={req.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-800 font-mono">{req.recipient}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase
                            ${isSigned ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                          >
                            {isSigned ? "Assinado Digitalmente" : "Pendente"}
                          </span>
                        </div>

                        {isSigned ? (
                          <div className="text-[10px] text-slate-500 space-y-1 font-mono leading-none border-l-2 border-indigo-400 pl-2">
                            <p className="flex items-center gap-1 text-slate-700">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              Assinado em {req.signedAt ? new Date(req.signedAt).toLocaleDateString("pt-BR") : ""} às {req.signedAt ? new Date(req.signedAt).toLocaleTimeString("pt-BR") : ""}
                            </p>
                            <p className="text-[9px] text-slate-450 truncate">
                              <strong>SHA-255 HASH:</strong> md5_sha254_{req.id.slice(0, 8)}998273bcn
                            </p>
                            <p className="text-[8px] text-indigo-500 font-black">
                              <Fingerprint className="h-3 w-3 inline mr-0.5 text-indigo-500" /> COMPROVANT CONECTADO - IP: 191.240.23.{rIdx + 12} (ICP-BRASIL)
                            </p>
                            
                            {/* Visual fancy signature image loop block */}
                            <div className="pt-2">
                              {req.signatureType === "drawn" && req.signatureValue ? (
                                <div className="bg-white/95 p-1 rounded border border-indigo-200 inline-block shadow-xs">
                                  <img 
                                    src={req.signatureValue} 
                                    alt="Assinatura Digital" 
                                    className="max-h-12 w-auto object-contain font-sans animate-in fade-in"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : req.signatureType === "typed" && req.signatureValue ? (
                                <div className="inline-block border-b border-indigo-400 border-dashed px-3 pb-0.5">
                                  <span 
                                    className="text-indigo-600 text-sm italic font-semibold tracking-wider block"
                                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                                  >
                                    {req.signatureValue}
                                  </span>
                                  <span className="text-[8px] text-slate-400 block mt-0.5 font-sans">(Assinado via Teclado)</span>
                                </div>
                              ) : (
                                <div className="inline-block border-b border-indigo-400 border-dashed px-4 pb-0.5">
                                  <span className="font-serif italic text-indigo-600 text-xs tracking-wider font-semibold animate-in fade-in" style={{ fontFamily: "Georgia, serif" }}>
                                    {req.signerName || req.recipient.split("@")[0].toUpperCase()} - SECURE ID
                                  </span>
                                </div>
                              )}
                            </div>

                            {(req.signerName || req.signerCpf) && (
                              <div className="pt-1 space-y-0.5 text-[8px] text-slate-500">
                                {req.signerName && <p><strong>Assinante:</strong> {req.signerName}</p>}
                                {req.signerCpf && <p><strong>CPF:</strong> {req.signerCpf}</p>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-[9px] text-slate-400 font-mono">Aguardando confirmação...</span>
                            <button
                              onClick={() => handleLoadSigner(req, selectedContract)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            >
                              Assinar Agora
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 border border-slate-200 rounded-2xl bg-white">
              Selecione um contrato sob demanda para renderizar sua via física e auditada.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Realistic Electronic Signature Tablet Portal (3 cols) */}
        <div className="lg:col-span-3 lg:sticky lg:top-6 lg:self-start bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white min-h-[520px] flex flex-col justify-between" id="signer-tablet-frame">
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="bg-slate-900 border border-slate-800 text-slate-350 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                <Globe className="h-3 w-3 text-sky-400 animate-pulse" /> ICP-Brasil Safe Signer
              </span>
            </div>

            {!activeRequestToSign ? (
              <div className="py-20 text-center space-y-4 text-slate-500">
                <div className="inline-block bg-slate-900 p-4 rounded-full border border-slate-800 shadow-inner">
                  <Fingerprint className="h-8 w-8 text-indigo-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">Cofre de Assintura Digital</h4>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                    Selecione "Assinar Agora" ou "Assinar" em qualquer contrato para liberar este tablet simulador e colher a assinatura jurídica real.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left animate-in fade-in zoom-in duration-200">
                {isSuccessAnimated ? (
                  <div className="py-12 text-center space-y-4 animate-in zoom-in duration-200">
                    <div className="inline-block bg-emerald-500/20 p-5 rounded-full border border-emerald-500 text-emerald-400 animate-bounce">
                      <Check className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h4 className="font-black text-white text-xs uppercase tracking-wider">Criptografado com Sucesso!</h4>
                    <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed mx-auto">
                      Assinatura processada sob a chave legal. Os logs de auditoria e a via de minuta física foram atualizados em tempo real de forma isolada (multi-tenant).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">DOCUMENTO SOB ASSINATURA</span>
                      <h5 className="font-extrabold text-white text-[11px] truncate mt-0.5">{activeRequestToSign.contract.title}</h5>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-slate-400 space-y-1 font-mono">
                      <p><strong>Destinatário:</strong> {activeRequestToSign.recipient}</p>
                      <p><strong>Via Canal:</strong> {activeRequestToSign.channel}</p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Nome Completo do Signatário</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Pedro de Alencar Silveira"
                          value={typedFullname}
                          onChange={(e) => setTypedFullname(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-650 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">CPF do Signatário</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: 111.222.333-44"
                          value={typedCpf}
                          onChange={(e) => setTypedCpf(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Selector of typing vs handwriting canvas */}
                    <div className="flex gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setSignatureType("drawn")}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md cursor-pointer transition text-center
                          ${signatureType === "drawn" 
                            ? "bg-indigo-650 bg-indigo-600 text-white shadow-xs" 
                            : "text-slate-400 hover:text-white"}`}
                      >
                        Assinatura Tela 🖊️
                      </button>
                      <button
                        onClick={() => setSignatureType("typed")}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md cursor-pointer transition text-center
                          ${signatureType === "typed" 
                            ? "bg-indigo-650 bg-indigo-600 text-white shadow-xs" 
                            : "text-slate-400 hover:text-white"}`}
                      >
                        Teclado Curva ⌨️
                      </button>
                    </div>

                    {/* Drawing Pad implementation or beautiful script output */}
                    {signatureType === "drawn" ? (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Assine na Tela (Desenhe com Mouse/Dedo)</span>
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="text-[9px] hover:text-indigo-400 text-slate-400 flex items-center gap-0.5 font-bold cursor-pointer"
                          >
                            <RotateCcw className="h-2.5 w-2.5" /> Limpar
                          </button>
                        </div>
                        <canvas
                          ref={canvasRef}
                          width={280}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-28 bg-white rounded-xl border-2 border-indigo-500/30 overflow-hidden cursor-crosshair touch-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase block">Visualização Manuscrita Gerada</span>
                        <div className="w-full h-28 bg-white rounded-xl flex items-center justify-center p-4 border border-slate-800 select-none overflow-hidden">
                          <span 
                            className="text-xl text-indigo-700 italic tracking-wider font-semibold"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          >
                            {typedFullname || "Digite seu nome acima"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {activeRequestToSign && !isSuccessAnimated && (
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-1.5">
              <button
                onClick={() => setActiveRequestToSign(null)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={submitSimulatedSignature}
                disabled={isSigningInProcess || !typedFullname || !typedCpf}
                className="px-3.5 py-1.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] font-black text-white shadow-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningInProcess ? "Criptografando..." : "Confirmar Assinatura"}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
