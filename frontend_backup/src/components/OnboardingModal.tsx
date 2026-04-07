import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Copy, Plus, Send, CheckCircle2 } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * OnboardingModal - Componente focado na geração e distribuição 
 * da chave de acesso ao SanaBot via Deep Linking (Telegram API)
 */
export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [patientName, setPatientName] = useState('');
  const [surgeryType, setSurgeryType] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    // TODO: Integrar com a API do FastAPI (Endpoint que cria o Encounter no sana_schema)
    setTimeout(() => {
      // Mock do Encounter ID providenciado pelo Backend
      const mockEncounterId = "ENC-" + Math.random().toString(36).substring(2, 9).toUpperCase();
      
      // Construção do Deep Link que acionará o texto '/start ENC-ABCD' no bot.
      const telegramLink = `https://t.me/SanaClinBot?start=${mockEncounterId}`;
      setGeneratedLink(telegramLink);
      setIsGenerating(false);
    }, 800);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl shadow-xl border-0 overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Iniciar Acompanhamento
          </DialogTitle>
          <DialogDescription className="text-slate-500 mt-2 text-sm leading-relaxed">
            Cadastre os dados da cirurgia. O Sana configurará o ConciergeAgent e criará um acesso seguro via Telegram.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          <div className="space-y-2">
            <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nome do Paciente
            </label>
            <Input 
              id="name" 
              placeholder="Ex: João da Silva" 
              className="h-11 border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all" 
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="surgery" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Procedimento Realizado
            </label>
            <Input 
              id="surgery" 
              placeholder="Ex: Apendicectomia Vidrolaparoscópica" 
              className="h-11 border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all"
              value={surgeryType}
              onChange={(e) => setSurgeryType(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          {generatedLink ? (
            <div className="flex flex-col gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
              <label className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Vínculo Gerado com Sucesso!
              </label>
              
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={generatedLink} 
                  className="bg-white/80 border-indigo-200 text-indigo-800 font-medium font-mono text-xs focus-visible:ring-0" 
                />
                <Button 
                  size="icon" 
                  variant="outline" 
                  className={`shrink-0 border-indigo-200 hover:bg-white hover:text-indigo-600 transition-colors ${copied ? 'bg-green-50 border-green-200 text-green-600' : ''}`}
                  onClick={copyToClipboard}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2 rounded-lg h-11"
                onClick={() => window.open(`https://wa.me/?text=Olá ${patientName}, aqui está o link do seu acompanhamento pós-operatório digital da Clínica: ${generatedLink}`, '_blank')}
              >
                <Send className="w-4 h-4" /> Enviar Convite pelo WhatsApp
              </Button>
            </div>
          ) : (
             <Button 
                onClick={handleGenerateLink} 
                disabled={!patientName || !surgeryType || isGenerating}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all rounded-lg"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Mapeando...
                  </div>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" /> Gerar Acesso Seguro</>
                )}
              </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
