import React, { useState } from 'react';
import { Copy, Plus, Send, CheckCircle2, X, Command, ActivitySquare } from "lucide-react";

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

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      // Chamada real para o Backend FastAPI
      const response = await fetch('http://129.121.33.171:8001/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientName,
          surgeryType
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao conectar no banco Supabase (sana_schema)');
      }

      const data = await response.json();
      
      // Recebemos o UUID verdadeiro gravado no banco!
      const realEncounterId = data.encounter_id;
      
      // Link puro focado no BOT DO TELEGRAM
      const telegramLink = `https://t.me/app_sana_bot?start=${realEncounterId}`;
      setGeneratedLink(telegramLink);
    } catch (error) {
      console.error(error);
      alert("Erro ao provisionar paciente. Verifique se o Backend (FastAPI) está rodando na porta 8000.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all">
      <div 
        className="w-full sm:max-w-[480px] bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)] border border-white/60 overflow-hidden relative animate-in fade-in zoom-in-95 duration-300"
      >
        
        {/* Soft Clinical Blue Glow Effects */}
        <div className="absolute -top-32 -right-32 w-72 h-72 bg-sky-300/20 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-blue-300/20 rounded-full blur-[60px] pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all z-10 backdrop-blur-md bg-white/50"
        >
            <X className="w-5 h-5"/>
        </button>

        {/* Header Section */}
        <div className="p-10 pb-6 relative z-10">
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

        {/* Form Inputs */}
        <div className="px-10 py-2 space-y-6 relative z-10">
          <div className="space-y-2.5 text-left group">
            <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-sky-600 transition-colors">
              Nome do Paciente
            </label>
            <input 
              id="name" 
              placeholder="Ex: Clara Albuquerque" 
              className="w-full h-14 px-5 border-2 rounded-2xl border-slate-200/70 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-semibold text-slate-800 placeholder-slate-300 shadow-sm" 
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>
          <div className="space-y-2.5 text-left group">
            <label htmlFor="surgery" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-sky-600 transition-colors">
              Procedimento Cirúrgico
            </label>
            <input 
              id="surgery" 
              placeholder="Ex: Artroscopia de Joelho" 
              className="w-full h-14 px-5 border-2 rounded-2xl border-slate-200/70 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-semibold text-slate-800 placeholder-slate-300 shadow-sm"
              value={surgeryType}
              onChange={(e) => setSurgeryType(e.target.value)}
            />
          </div>
        </div>

        {/* Action Area */}
        <div className="p-10 pt-8 relative z-10">
          {generatedLink ? (
            <div className="flex flex-col gap-4 p-6 rounded-3xl bg-sky-50 border border-sky-100 shadow-inner animate-in fade-in slide-in-from-bottom-2">
              <label className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-sky-500" /> Deep Link Configurado!
              </label>
              
              <div className="flex gap-2 relative group cursor-pointer" onClick={copyToClipboard}>
                <div 
                  className="flex-1 px-4 py-3.5 rounded-xl bg-white border border-slate-200/80 text-sky-800 font-bold font-mono text-xs shadow-sm truncate" 
                >
                  {generatedLink}
                </div>
                <button 
                  className={`absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${copied ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  {copied ? <><CheckCircle2 className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
                </button>
              </div>
              
              <button 
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-0.5 flex flex-col items-center justify-center gap-1 rounded-2xl h-14"
                onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(generatedLink)}&text=${encodeURIComponent(`[Clínica] Oi ${patientName}, faça o start do seu acompanhamento inteligente clicando aqui.`)}`, '_blank')}
              >
                <div className="flex items-center gap-2 text-[15px]">
                  <Send className="w-4 h-4" /> 
                  <span>Encaminhar Convite pelo Telegram</span>
                </div>
              </button>
            </div>
          ) : (
             <button 
                onClick={handleGenerateLink} 
                disabled={!patientName || !surgeryType || isGenerating}
                className="w-full h-16 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:grayscale text-white font-extrabold shadow-xl shadow-sky-600/20 transition-all hover:-translate-y-0.5 hover:shadow-sky-500/40 rounded-2xl flex items-center justify-center text-base tracking-wide"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin"/> 
                    Conectando Agente LLM...
                  </div>
                ) : (
                  <><Command className="w-5 h-5 mr-3" /> Gerar Sessão Criptografada</>
                )}
              </button>
          )}
        </div>
      </div>
    </div>
  );
}
