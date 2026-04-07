import React, { useState } from 'react'
import { OnboardingModal } from './components/OnboardingModal'
import sanaLogo from './assets/sana_logo.png'
import { LayoutDashboard, Users, Activity, Settings, Bell, Search, PlusCircle, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'

function App() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* SIDEBAR (Light Sky Blue tone requested by user) */}
      <aside className="w-72 bg-sky-100/60 text-slate-800 flex flex-col justify-between shadow-lg border-r border-sky-200/50 relative z-10 transition-colors backdrop-blur-xl">
        <div>
          <div className="p-6 flex items-center gap-4 border-b border-sky-200/60">
            <div className="bg-white p-1.5 rounded-xl border border-sky-200 shadow-sm">
              <img src={sanaLogo} alt="Sana Logo" className="w-9 h-9 object-contain hue-rotate-[200deg] contrast-125 opacity-90" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Sana</h1>
              <p className="text-sky-600 text-[10px] font-extrabold uppercase tracking-widest">Medical Ops</p>
            </div>
          </div>
          
          <nav className="p-4 space-y-1.5 mt-2">
            <button className="flex items-center gap-3 w-full px-4 py-3.5 bg-white text-sky-700 rounded-xl font-bold transition-all shadow-sm border border-sky-200/60">
              <LayoutDashboard size={20} strokeWidth={2.5} />
              Painel de Controle
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl font-medium transition-all">
              <Users size={20} strokeWidth={2.5}/>
              Prontuários Ativos
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl font-medium transition-all">
              <Activity size={20} strokeWidth={2.5}/>
              Avaliações IA
            </button>
          </nav>
        </div>
        
        <div className="p-4 border-t border-sky-200/60">
          <button className="flex items-center gap-3 w-full px-4 py-3.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl font-medium transition-all">
            <Settings size={20} strokeWidth={2.5}/>
            Configurações
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-y-auto bg-[#FAFAFA]">
        
        {/* Sky/Blue Dynamic Background Blob Glows */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-sky-100/30 via-transparent to-transparent -z-10 blur-[80px] pointer-events-none" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-tl from-blue-50/40 via-transparent to-transparent -z-10 blur-[80px] pointer-events-none rounded-full" />

        {/* TOP HEADER */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-200/50 bg-white/70 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4 bg-slate-50 px-5 py-2.5 rounded-full border border-slate-200/60 w-[450px] transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:bg-white focus-within:shadow-sm">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar paciente, cirurgia ou prontuário (Ex: ENC-A3F2)..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400 font-medium"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-sky-600 transition-colors">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white animate-bounce"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">Dr. Silva</p>
                <p className="text-xs text-slate-500">Cirurgião Chefe</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 p-0.5 shadow-md">
                <div className="w-full h-full bg-white rounded-full border-2 border-white" />
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Centro de Triage</h2>
              <p className="text-slate-500 mt-1 font-medium">Equipe Clínica está online e agentes monitorando imagens.</p>
            </div>
            
            {/* CTA PRINCIPAL DE ONBOARDING */}
            <button 
              onClick={() => setModalOpen(true)}
              className="group relative flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-7 py-3.5 rounded-2xl font-bold shadow-lg shadow-sky-600/20 transition-all hover:-translate-y-0.5 hover:shadow-sky-600/30 overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-white/10 group-hover:bg-transparent transition-colors" />
              <PlusCircle size={20} />
              Provisionar Paciente
            </button>
          </div>

          {/* MOCK STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Card 1 */}
            <div className="bg-white p-7 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-200/50 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-900/5 transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/50 rounded-bl-[100px] -z-0 transition-transform duration-500 group-hover:scale-125" />
               <div className="flex justify-between items-start relative z-10">
                 <div>
                   <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Monitoramentos Ativos</p>
                   <h3 className="text-5xl font-black text-slate-800 mt-3 tracking-tighter">124</h3>
                 </div>
                 <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl shadow-sm border border-sky-100/50">
                    <Activity size={26} strokeWidth={2.5}/>
                 </div>
               </div>
               <p className="text-sky-600 text-sm font-bold flex items-center gap-1.5 mt-5 relative z-10"><TrendingUp size={16} strokeWidth={3}/> +12% engajamento</p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-7 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-200/50 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-[100px] -z-0 transition-transform duration-500 group-hover:scale-125" />
               <div className="flex justify-between items-start relative z-10">
                 <div>
                   <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Cicatrização Ideal</p>
                   <h3 className="text-5xl font-black text-slate-800 mt-3 tracking-tighter">115</h3>
                 </div>
                 <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100/50">
                    <CheckCircle2 size={26} strokeWidth={2.5} />
                 </div>
               </div>
               <p className="text-slate-500 text-[13px] font-medium mt-5 relative z-10 font-mono tracking-tight">Validado por VisualTriageAgent</p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-7 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-200/50 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5 transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/50 rounded-bl-[100px] -z-0 transition-transform duration-500 group-hover:scale-125" />
               <div className="flex justify-between items-start relative z-10">
                 <div>
                   <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Triage Crítica</p>
                   <h3 className="text-5xl font-black text-orange-500 mt-3 tracking-tighter">9</h3>
                 </div>
                 <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl shadow-sm border border-orange-100/50">
                    <AlertCircle size={26} strokeWidth={2.5} />
                 </div>
               </div>
               <p className="text-orange-600 text-[13px] font-bold mt-5 relative z-10 bg-orange-50 inline-block px-3 py-1.5 rounded-lg border border-orange-100 text-center w-full">Atenção Médica Recomendada</p>
            </div>
          </div>

        </div>
      </main>

      {/* ONBOARDING MODAL COMPONENT */}
      <OnboardingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      
    </div>
  )
}

export default App
