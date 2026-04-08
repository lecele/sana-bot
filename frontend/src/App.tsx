import { useState, useEffect, useCallback } from 'react'
import { OnboardingModal } from './components/OnboardingModal'
import sanaLogo from './assets/sana_logo.png'
import {
  LayoutDashboard, Users, Activity, Settings, Bell, Search,
  PlusCircle, TrendingUp, AlertCircle, CheckCircle2, RefreshCw,
  MessageSquare, Camera, Clock, Wifi, WifiOff, ChevronRight
} from 'lucide-react'

const API_URL = ''

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Stats {
  total_patients: number
  active_encounters: number
  connected_patients: number
}

interface Encounter {
  id: string
  status: string
  reason_reference: string
  created_at: string
}

interface Patient {
  id: string
  name: string
  chat_id: string | null
  created_at: string
  sana_encounter: Encounter[]
}

interface Observation {
  id: string
  category: string
  value_string: string
  created_at: string
  encounter_id: string
  sana_encounter?: {
    patient_id: string
    reason_reference: string
    sana_patient?: { name: string }
  }
}

type View = 'dashboard' | 'patients' | 'observations'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `há ${d}d`
  if (h > 0) return `há ${h}h`
  if (m > 0) return `há ${m}min`
  return 'agora'
}

function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    'foto-ferida': 'Foto Enviada',
    'mensagem-paciente': 'Mensagem',
    'resposta-agente': 'Resposta IA',
  }
  return map[cat] || cat
}

function categoryColor(cat: string) {
  if (cat === 'foto-ferida') return 'bg-purple-100 text-purple-700'
  if (cat === 'mensagem-paciente') return 'bg-sky-100 text-sky-700'
  if (cat === 'resposta-agente') return 'bg-green-100 text-green-700'
  return 'bg-slate-100 text-slate-600'
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [observations, setObservations] = useState<Observation[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [backendOnline, setBackendOnline] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats`)
      if (res.ok) {
        setStats(await res.json())
        setBackendOnline(true)
      }
    } catch { setBackendOnline(false) }
  }, [])

  const fetchPatients = useCallback(async (q = '') => {
    try {
      const url = q ? `${API_URL}/api/patients?search=${encodeURIComponent(q)}` : `${API_URL}/api/patients`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || [])
      }
    } catch (e) { console.error(e) }
  }, [])

  const fetchObservations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/observations`)
      if (res.ok) {
        const data = await res.json()
        setObservations(data.observations || [])
      }
    } catch (e) { console.error(e) }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchStats(), fetchPatients(search), fetchObservations()])
    setLastRefresh(new Date())
    setLoading(false)
  }, [fetchStats, fetchPatients, fetchObservations, search])

  useEffect(() => { refreshAll() }, [])

  // Auto-refresh a cada 30s
  useEffect(() => {
    const interval = setInterval(refreshAll, 30000)
    return () => clearInterval(interval)
  }, [refreshAll])

  // Busca ao digitar
  useEffect(() => {
    const t = setTimeout(() => fetchPatients(search), 400)
    return () => clearTimeout(t)
  }, [search, fetchPatients])

  // Refresh quando onboarding fechar com sucesso
  const handleModalClose = () => {
    setModalOpen(false)
    setTimeout(refreshAll, 500)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-72 bg-sky-100/60 text-slate-800 flex flex-col justify-between shadow-lg border-r border-sky-200/50 relative z-10 backdrop-blur-xl">
        <div>
          <div className="pt-4 pb-2 px-6 flex justify-center border-b border-sky-200/60">
            <img 
              src={sanaLogo} 
              alt="Sana Pós Operatório" 
              className="w-36 h-auto object-contain" 
            />
          </div>

          {/* Status do backend */}
          <div className={`mx-4 mt-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold ${backendOnline ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {backendOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {backendOnline ? 'Backend Online' : 'Backend Offline'}
          </div>

          <nav className="p-4 space-y-1.5 mt-2">
            <button
              onClick={() => setView('dashboard')}
              className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'dashboard' ? 'bg-white text-sky-700 shadow-sm border border-sky-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}
            >
              <LayoutDashboard size={20} strokeWidth={2.5} />
              Painel de Controle
            </button>
            <button
              onClick={() => { setView('patients'); fetchPatients(search) }}
              className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'patients' ? 'bg-white text-sky-700 shadow-sm border border-sky-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}
            >
              <Users size={20} strokeWidth={2.5} />
              Prontuários Ativos
              {stats && (
                <span className="ml-auto bg-sky-100 text-sky-700 rounded-full px-2 py-0.5 text-xs font-black">
                  {stats.total_patients}
                </span>
              )}
            </button>
            <button
              onClick={() => { setView('observations'); fetchObservations() }}
              className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-bold transition-all ${view === 'observations' ? 'bg-white text-sky-700 shadow-sm border border-sky-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}
            >
              <Activity size={20} strokeWidth={2.5} />
              Avaliações IA
              {observations.length > 0 && (
                <span className="ml-auto bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs font-black">
                  {observations.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-sky-200/60">
          <p className="text-center text-xs text-slate-400 font-medium px-2">
            Atualizado {timeAgo(lastRefresh.toISOString())}
          </p>
          <button
            onClick={refreshAll}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-sky-700 hover:bg-white/50 rounded-xl font-medium transition-all mt-1"
          >
            <Settings size={18} strokeWidth={2.5} />
            Configurações
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative overflow-y-auto bg-[#FAFAFA]">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-sky-100/30 via-transparent to-transparent -z-10 blur-[80px] pointer-events-none" />

        {/* HEADER */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-200/50 bg-white/70 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4 bg-slate-50 px-5 py-2.5 rounded-full border border-slate-200/60 w-[450px] focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:bg-white transition-all">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); if (view !== 'patients') setView('patients') }}
              placeholder="Buscar paciente por nome..."
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400 font-medium"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refreshAll}
              className={`p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all ${loading ? 'animate-spin text-sky-500' : ''}`}
              title="Atualizar dados"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </header>

        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <div className="p-8 w-full space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Centro de Triage</h2>
                <p className="text-slate-500 mt-1 font-medium">
                  {backendOnline ? 'Agentes online e monitorando pacientes.' : 'Backend offline — verifique o servidor.'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="group relative flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-7 py-3.5 rounded-2xl font-bold shadow-lg shadow-sky-600/20 transition-all hover:-translate-y-0.5 overflow-hidden"
              >
                <PlusCircle size={20} />
                Provisionar Paciente
              </button>
            </div>

            {/* STATS CARDS — dados reais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 — Monitoramentos Ativos */}
              <div className="bg-white p-7 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-200/50 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-900/5 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/50 rounded-bl-[100px] -z-0 transition-transform duration-500 group-hover:scale-125" />
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Monitoramentos Ativos</p>
                    <h3 className="text-5xl font-black text-slate-800 mt-3 tracking-tighter">
                      {loading ? <span className="text-3xl text-slate-300 animate-pulse">···</span> : stats?.active_encounters ?? 0}
                    </h3>
                  </div>
                  <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl shadow-sm border border-sky-100/50">
                    <Activity size={26} strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-sky-600 text-sm font-bold flex items-center gap-1.5 mt-5 relative z-10">
                  <TrendingUp size={16} strokeWidth={3} />
                  encontros em andamento
                </p>
              </div>

              {/* Card 2 — Pacientes Conectados */}
              <div className="bg-white p-7 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-200/50 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-[100px] -z-0 transition-transform duration-500 group-hover:scale-125" />
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Conectados ao Bot</p>
                    <h3 className="text-5xl font-black text-slate-800 mt-3 tracking-tighter">
                      {loading ? <span className="text-3xl text-slate-300 animate-pulse">···</span> : stats?.connected_patients ?? 0}
                    </h3>
                  </div>
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100/50">
                    <CheckCircle2 size={26} strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-slate-500 text-[13px] font-medium mt-5 relative z-10">
                  pacientes com Telegram vinculado
                </p>
              </div>

              {/* Card 3 — Avaliações por IA */}
              <div className="bg-white p-7 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-200/50 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/50 rounded-bl-[100px] -z-0 transition-transform duration-500 group-hover:scale-125" />
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Avaliações Registradas</p>
                    <h3 className="text-5xl font-black text-orange-500 mt-3 tracking-tighter">
                      {loading ? <span className="text-3xl text-slate-300 animate-pulse">···</span> : observations.length}
                    </h3>
                  </div>
                  <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl shadow-sm border border-orange-100/50">
                    <AlertCircle size={26} strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-orange-600 text-[13px] font-bold mt-5 relative z-10 bg-orange-50 inline-block px-3 py-1.5 rounded-lg border border-orange-100 text-center w-full">
                  {observations.filter(o => o.category === 'foto-ferida').length} fotos analisadas pela IA
                </p>
              </div>
            </div>

            {/* LISTA RÁPIDA — últimos pacientes */}
            <div className="bg-white rounded-[24px] border border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
              <div className="px-7 py-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-900">Pacientes Recentes</h3>
                <button onClick={() => setView('patients')} className="text-sky-600 text-sm font-bold hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight size={14} />
                </button>
              </div>
              {patients.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-medium">
                  Nenhum paciente cadastrado ainda.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {patients.slice(0, 5).map(p => (
                    <div key={p.id} className="px-7 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-500 truncate">{p.sana_encounter?.[0]?.reason_reference || 'Sem cirurgia'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.chat_id ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                            <Wifi size={10} /> Conectado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                            <WifiOff size={10} /> Aguardando
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{timeAgo(p.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PRONTUÁRIOS ATIVOS ── */}
        {view === 'patients' && (
          <div className="p-8 w-full space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Prontuários Ativos</h2>
                <p className="text-slate-500 mt-1 font-medium">{patients.length} paciente{patients.length !== 1 ? 's' : ''} encontrado{patients.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-sky-600/20 transition-all"
              >
                <PlusCircle size={18} /> Novo Paciente
              </button>
            </div>

            {patients.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-slate-200/50 p-16 text-center">
                <Users size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">Nenhum paciente cadastrado ainda.</p>
                <button onClick={() => setModalOpen(true)} className="mt-4 text-sky-600 font-bold hover:underline">
                  Provisionar primeiro paciente
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {patients.map(p => {
                  const enc = p.sana_encounter?.[0]
                  return (
                    <div key={p.id} className="bg-white rounded-[20px] border border-slate-200/50 shadow-sm hover:shadow-md hover:border-sky-200 transition-all p-6 flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-black text-xl shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-lg">{p.name}</h3>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">{enc?.reason_reference || 'Procedimento não informado'}</p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock size={11} /> Cadastrado {timeAgo(p.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {p.chat_id ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                            <Wifi size={12} /> Bot Conectado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                            <WifiOff size={12} /> Aguardando Link
                          </span>
                        )}
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${enc?.status === 'in-progress' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                          {enc?.status === 'in-progress' ? 'Em Monitoramento' : 'Concluído'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AVALIAÇÕES IA ── */}
        {view === 'observations' && (
          <div className="p-8 w-full space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Avaliações IA</h2>
              <p className="text-slate-500 mt-1 font-medium">{observations.length} registro{observations.length !== 1 ? 's' : ''} no prontuário</p>
            </div>

            {observations.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-slate-200/50 p-16 text-center">
                <Activity size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">Nenhuma avaliação registrada ainda.</p>
                <p className="text-slate-400 text-sm mt-1">Aguardando interações dos pacientes pelo Telegram.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {observations.map(obs => {
                  const patientName = obs.sana_encounter?.sana_patient?.name || 'Paciente desconhecido'
                  const surgery = obs.sana_encounter?.reason_reference || ''
                  return (
                    <div key={obs.id} className="bg-white rounded-[20px] border border-slate-200/50 shadow-sm hover:shadow-md transition-all p-5 flex gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${obs.category === 'foto-ferida' ? 'bg-purple-100' : obs.category === 'resposta-agente' ? 'bg-green-100' : 'bg-sky-100'}`}>
                        {obs.category === 'foto-ferida' ? <Camera size={18} className="text-purple-600" /> :
                         obs.category === 'resposta-agente' ? <Activity size={18} className="text-green-600" /> :
                         <MessageSquare size={18} className="text-sky-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900">{patientName}</span>
                          {surgery && <span className="text-xs text-slate-400 font-medium">· {surgery}</span>}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${categoryColor(obs.category)}`}>
                            {categoryLabel(obs.category)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed line-clamp-3">{obs.value_string}</p>
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                          <Clock size={11} /> {timeAgo(obs.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <OnboardingModal isOpen={modalOpen} onClose={handleModalClose} />
    </div>
  )
}
