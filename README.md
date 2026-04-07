# Sana — Monitoramento Clínico Pós-Operatório 🏥

Sistema SaaS de monitoramento de pacientes pós-operatórios via **Telegram + IA (Gemini 2.5 Flash)**.

## 📋 Estrutura

```
Sana/
├── frontend/   # React + Vite + TypeScript (Painel Clínico)
└── backend/    # Python FastAPI + LangGraph + LangChain
```

## 🚀 Como rodar localmente

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # preencha as chaves
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## ⚙️ Variáveis de ambiente (backend)

Copie `backend/.env.example` → `backend/.env` e preencha:

| Variável | Descrição |
|---|---|
| `SANA_SUPABASE_URL` | URL do projeto Supabase |
| `SANA_SUPABASE_KEY` | Anon Key do Supabase |
| `GOOGLE_API_KEY` | Chave do Google Gemini |
| `TELEGRAM_BOT_TOKEN` | Token do Bot Telegram (@BotFather) |

## 🤖 Fluxo

1. Médico cadastra paciente no painel web
2. Sistema gera deep link `t.me/app_sana_bot?start=<encounter_id>`
3. Paciente clica no link e inicia conversa com o bot
4. Bot monitora sintomas e avalia fotos de feridas com IA

## 🧰 Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: FastAPI + LangGraph + LangChain + Gemini 2.5 Flash
- **DB**: Supabase (PostgreSQL)
- **Bot**: Telegram Bot API
