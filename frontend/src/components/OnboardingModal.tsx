import { useState, useEffect } from 'react';
import { Copy, Send, CheckCircle2, X, Command, ActivitySquare } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [patientName, setPatientName] = useState('');
  const [surgeryType, setSurgeryType] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fecha o modal ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName, surgeryType })
      });

      if (!response.ok) {
        throw new Error('Falha ao conectar no banco Supabase');
      }

      const data = await response.json();
      const telegramLink = `https://t.me/app_sana_bot?start=${data.encounter_id}`;
      setGeneratedLink(telegramLink);
    } catch (error) {
      console.error(error);
      alert("Erro ao provisionar paciente. Verifique se o Backend (FastAPI) está rodando.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedLink('');
    setPatientName('');
    setSurgeryType('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      {/* Overlay escuro */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
      />

      {/* Conteúdo do modal native */}
      <div className="relative z-10 w-full max-w-[480px] max-h-[95vh] overflow-y-auto bg-white rounded-[28px] shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header estendido */}
        <div className="p-10 pb-6 relative">
          {/* Botão fechar (Natívo, Enorme e Impossível de Falhar) */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-6 right-6 flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 active:scale-95 rounded-full transition-all cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-200/60 font-bold text-xs"
          >
            Fechar <X className="w-4 h-4 text-inherit" />
          </button>

          <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl shadow-lg shadow-sky-500/20 flex items-center justify-center mb-6">
            <ActivitySquare className="text-white w-7 h-7" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Nova Ficha Clínica
          </h2>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed pr-6 font-medium">
            Crie um vínculo de monitoramento inteligente para o sistema acompanhar o paciente via Telegram.
          </p>
        </div>

        {/* Formulário */}
        <div className="px-10 py-2 space-y-6">
          <div className="space-y-2.5 text-left">
            <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Nome do Paciente
            </label>
            <input
              id="name"
              placeholder="Ex: Clara Albuquerque"
              className="w-full h-14 px-5 border-2 rounded-2xl border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-semibold text-slate-800 placeholder-slate-300"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>
          <div className="space-y-2.5 text-left">
            <label htmlFor="surgery" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Procedimento Cirúrgico
            </label>
            <input
              id="surgery"
              placeholder="Ex: Artroscopia de Joelho"
              className="w-full h-14 px-5 border-2 rounded-2xl border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-semibold text-slate-800 placeholder-slate-300"
              value={surgeryType}
              onChange={(e) => setSurgeryType(e.target.value)}
            />
          </div>
        </div>

        {/* Ação */}
        <div className="p-10 pt-8">
          {generatedLink ? (
            <div className="flex flex-col gap-4 p-6 rounded-3xl bg-sky-50 border border-sky-100">
              <label className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-sky-500" /> Deep Link Configurado!
              </label>
              <div className="flex gap-2 relative cursor-pointer" onClick={copyToClipboard}>
                <div className="flex-1 px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-sky-800 font-bold font-mono text-xs truncate">
                  {generatedLink}
                </div>
                <button
                  type="button"
                  className={`absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${copied ? 'bg-sky-500 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  {copied ? <><CheckCircle2 className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
                </button>
              </div>
              <button
                type="button"
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 rounded-2xl h-14"
                onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(generatedLink)}&text=${encodeURIComponent(`[Clínica] Oi ${patientName}, faça o start do seu acompanhamento inteligente clicando aqui.`)}`, '_blank')}
              >
                <Send className="w-4 h-4" />
                <span>Encaminhar Convite</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={!patientName || !surgeryType || isGenerating}
              className="w-full h-16 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:grayscale text-white font-extrabold shadow-xl shadow-sky-600/20 transition-all hover:-translate-y-0.5 rounded-2xl flex items-center justify-center text-base"
            >
              {isGenerating ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                  Conectando Agente LLM...
                </div>
              ) : (
                <><Command className="w-5 h-5 mr-3" /> Gerar Sessão Criptografada</>
              )}
            </button>
          )}
          
          {/* Botão Inferior Reserva para Segurança */}
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <button 
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-800 text-sm font-bold underline underline-offset-4"
            >
              Cancelar e Voltar ao Painel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
