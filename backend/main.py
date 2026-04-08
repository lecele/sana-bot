import os
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
import httpx

# MemPalace — Memória Vetorial Local
from sana_memory import (
    salvar_mensagem_paciente,
    salvar_analise_ferida,
    salvar_resposta_agente,
    buscar_contexto_paciente,
    status_palace,
)

load_dotenv()

from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict
import google.generativeai as genai
from langchain_core.messages import HumanMessage, SystemMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =======================================================
# 1. Configuração
# =======================================================
SANA_SUPABASE_URL = os.getenv("SANA_SUPABASE_URL", "")
SANA_SUPABASE_KEY = os.getenv("SANA_SUPABASE_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

supabase: Client = create_client(SANA_SUPABASE_URL, SANA_SUPABASE_KEY)

# Configuração Google Generative AI Nativo (Mais estável para Previews)
genai.configure(api_key=GOOGLE_API_KEY)
# Tentamos o 3.1 Live Preview que apareceu no ListModels
MODEL_NAME = "gemini-2.5-flash" 
model_native = genai.GenerativeModel(MODEL_NAME)

# =======================================================
# 2. LangGraph State
# =======================================================
class AgentState(TypedDict):
    chat_id: str
    patient_id: Optional[str]
    encounter_id: Optional[str]
    messages: List[str]
    image_url: Optional[str]
    extracted_data: Dict[str, Any]
    current_agent: str

# =======================================================
# 3. Agentes
# =======================================================
def concierge_agent(state: AgentState):
    if state.get("image_url"):
        return {"current_agent": "visual_triage"}
    return {"current_agent": "end"}

def visual_triage_agent(state: AgentState):
    return {"current_agent": "fhir_mapper"}

def fhir_mapper_agent(state: AgentState):
    return {"current_agent": "end"}

workflow = StateGraph(AgentState)
workflow.add_node("concierge", concierge_agent)
workflow.add_node("visual_triage", visual_triage_agent)
workflow.add_node("fhir_mapper", fhir_mapper_agent)
workflow.set_entry_point("concierge")
workflow.add_conditional_edges("concierge", lambda s: s["current_agent"],
    {"visual_triage": "visual_triage", "fhir_mapper": "fhir_mapper", "end": END})
workflow.add_edge("visual_triage", "fhir_mapper")
workflow.add_edge("fhir_mapper", END)
agent_executor = workflow.compile()

# =======================================================
# 4. FastAPI App
# =======================================================
app = FastAPI(title="Sana MVP API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://sana-clinico.vercel.app",
        "https://sana-bot.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =======================================================
# 5. Models
# =======================================================
class OnboardingPayload(BaseModel):
    patientName: str
    surgeryType: str

# =======================================================
# 6. Endpoints
# =======================================================

@app.get("/")
def health():
    palace = status_palace()
    return {
        "status": "Sana MVP Backend Operational",
        "core": "FastAPI + LangGraph + Gemini 2.5 Flash",
        "memory": palace,
    }


@app.get("/api/stats")
async def get_stats():
    """Retorna estatísticas reais do banco de dados para os cards do painel."""
    try:
        # Total de pacientes cadastrados
        patients_res = supabase.table("sana_patient").select("id", count="exact").execute()
        total_patients = patients_res.count or 0

        # Encontros ativos (in-progress)
        active_res = supabase.table("sana_encounter").select("id", count="exact").eq("status", "in-progress").execute()
        active_encounters = active_res.count or 0

        # Encontros com paciente conectado ao Telegram (chat_id preenchido)
        connected_res = supabase.table("sana_patient").select("id", count="exact").neq("chat_id", "").execute()
        connected_patients = connected_res.count or 0

        return {
            "total_patients": total_patients,
            "active_encounters": active_encounters,
            "connected_patients": connected_patients,
        }
    except Exception as e:
        logger.error(f"Erro ao buscar stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/patients")
async def get_patients(search: str = ""):
    """Retorna lista de pacientes com seus encontros para a tela de Prontuários."""
    try:
        query = supabase.table("sana_patient").select(
            "id, name, chat_id, created_at, sana_encounter(id, status, reason_reference, created_at)"
        ).order("created_at", desc=True)

        if search:
            query = query.ilike("name", f"%{search}%")

        res = query.execute()
        return {"patients": res.data or []}
    except Exception as e:
        logger.error(f"Erro ao buscar pacientes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/observations")
async def get_observations():
    """Retorna lista de avaliações da IA para a tela de Avaliações IA."""
    try:
        res = supabase.table("sana_observation").select(
            "id, category, value_string, created_at, encounter_id, sana_encounter(patient_id, reason_reference, sana_patient(name))"
        ).order("created_at", desc=True).limit(50).execute()
        return {"observations": res.data or []}
    except Exception as e:
        logger.error(f"Erro ao buscar observações: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/onboarding")
async def onboard_patient(payload: OnboardingPayload):
    """Cadastra paciente e cria encontro no Supabase."""
    logger.info(f"Registrando: {payload.patientName} | {payload.surgeryType}")
    try:
        pat_res = supabase.table("sana_patient").insert({"name": payload.patientName}).execute()
        patient_id = pat_res.data[0]["id"]

        enc_res = supabase.table("sana_encounter").insert({
            "patient_id": patient_id,
            "status": "in-progress",
            "reason_reference": payload.surgeryType
        }).execute()
        encounter_id = enc_res.data[0]["id"]

        return {"status": "success", "encounter_id": encounter_id, "patient_id": patient_id}
    except Exception as e:
        logger.error(f"Erro no onboarding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    """Webhook do Telegram — recebe e processa mensagens dos pacientes."""
    payload = await request.json()

    if "message" not in payload:
        return {"status": "ignore"}

    message = payload.get("message", {})
    text = message.get("text", message.get("caption", ""))
    chat_id = str(message.get("chat", {}).get("id", ""))

    # --- DEEP LINK: paciente começou a conversa via link ---
    if text.startswith("/start"):
        parts = text.split(" ")
        if len(parts) > 1:
            encounter_id = parts[1]
            logger.info(f"Onboarding Telegram: encounter={encounter_id} chat={chat_id}")

            enc_res = supabase.table("sana_encounter").select("patient_id").eq("id", encounter_id).execute()
            if enc_res.data:
                patient_id = enc_res.data[0]["patient_id"]
                # Busca nome do paciente
                pat_res = supabase.table("sana_patient").select("name").eq("id", patient_id).execute()
                patient_name = pat_res.data[0]["name"] if pat_res.data else "paciente"
                # Vincula chat_id
                supabase.table("sana_patient").update({"chat_id": chat_id}).eq("id", patient_id).execute()

                await send_telegram_message(
                    chat_id,
                    f"Ola, {patient_name}! Sou o Agente de Acompanhamento Sana. Sua clinica ativou seu monitoramento pos-operatorio. Estou aqui para te acompanhar. Se sentir algo diferente ou quiser mostrar como esta a ferida, e so me mandar uma mensagem ou foto."
                )
            return {"status": "onboarded"}
        return {"status": "welcome"}

    # --- PROCESSAMENTO COM IA ---
    content_blocks = []

    # --- MEMPALACE: busca histórico do paciente para enriquecer o prompt ---
    historico_paciente = ""
    try:
        pat_mem = supabase.table("sana_patient").select("id, name").eq("chat_id", chat_id).execute()
        if pat_mem.data:
            _pid = pat_mem.data[0]["id"]
            _pname = pat_mem.data[0]["name"]
            historico_paciente = buscar_contexto_paciente(_pid, text or "avaliação de ferida")
    except Exception as _e:
        logger.warning(f"MemPalace: não foi possível buscar contexto: {_e}")

    system_prompt = (
        "Voce e o Agente Clinico de Acompanhamento Sana, humano e empatico. "
        "O paciente acabou de te enviar uma mensagem ou imagem sobre a cirurgia dele.\n"
        "REGRAS ESTRITAS:\n"
        "- Responda exatamente como um humano no WhatsApp.\n"
        "- E ESTRITAMENTE PROIBIDO usar asteriscos, hashtags ou qualquer simbolo de marcacao.\n"
        "- PROIBIDO gerar JSON, codigos ou metadados.\n"
        "- Se o paciente mandar foto de ferida, avalie superficialmente de forma reconfortante e informe que a equipe medica validara.\n"
        + (f"\n{historico_paciente}\n" if historico_paciente else "")
    )

    if "photo" in message:
        try:
            file_id = message["photo"][-1]["file_id"]
            async with httpx.AsyncClient() as client:
                res = await client.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getFile?file_id={file_id}")
                file_path = res.json()["result"]["file_path"]
                img_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
                content_blocks.append({"type": "image_url", "image_url": img_url})
                content_blocks.append({"type": "text", "text": text or "Analise essa foto do meu pos-operatorio"})

                # Tenta buscar encounter_id pelo chat_id para salvar a observação
                pat_res = supabase.table("sana_patient").select("id, name").eq("chat_id", chat_id).execute()
                if pat_res.data:
                    patient_id = pat_res.data[0]["id"]
                    patient_name_mem = pat_res.data[0].get("name", "paciente")
                    enc_res = supabase.table("sana_encounter").select("id").eq("patient_id", patient_id).eq("status", "in-progress").execute()
                    if enc_res.data:
                        encounter_id = enc_res.data[0]["id"]
                        supabase.table("sana_observation").insert({
                            "encounter_id": encounter_id,
                            "category": "foto-ferida",
                            "value_string": f"Paciente enviou foto para analise via Telegram. URL: {img_url}"
                        }).execute()
                    # Salva no MemPalace
                    salvar_analise_ferida(patient_id, patient_name_mem, img_url, legenda=text)
        except Exception as e:
            logger.error(f"Erro ao processar foto: {e}")
            content_blocks.append({"type": "text", "text": "O paciente enviou uma foto mas houve erro tecnico. Peca desculpas e peca para reenviar."})
    else:
        content_blocks.append({"type": "text", "text": text})
        # Salva mensagem de texto no prontuário e no MemPalace
        try:
            pat_res = supabase.table("sana_patient").select("id, name").eq("chat_id", chat_id).execute()
            if pat_res.data:
                patient_id = pat_res.data[0]["id"]
                patient_name_mem = pat_res.data[0].get("name", "paciente")
                enc_res = supabase.table("sana_encounter").select("id").eq("patient_id", patient_id).eq("status", "in-progress").execute()
                if enc_res.data:
                    encounter_id = enc_res.data[0]["id"]
                    supabase.table("sana_observation").insert({
                        "encounter_id": encounter_id,
                        "category": "mensagem-paciente",
                        "value_string": text
                    }).execute()
                # Salva no MemPalace para memória de longo prazo
                salvar_mensagem_paciente(patient_id, patient_name_mem, text)
        except Exception as e:
            logger.warning(f"Nao salvou observacao: {e}")

    if content_blocks:
        try:
            # --- PROCESSAMENTO COM SDK NATIVO DO GOOGLE ---
            # Prepara as partes da mensagem (texto e possivelmente imagem)
            prompt_parts = [system_prompt]
            
            # Se tiver imagem, baixa e anexa como bytes
            if "photo" in message:
                try:
                    file_id = message["photo"][-1]["file_id"]
                    async with httpx.AsyncClient() as client:
                        # Pega o file_path do Telegram
                        f_res = await client.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getFile?file_id={file_id}")
                        file_path = f_res.json()["result"]["file_path"]
                        img_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
                        
                        # Baixa a imagem real
                        img_res = await client.get(img_url)
                        if img_res.status_code == 200:
                            prompt_parts.append({
                                "mime_type": "image/jpeg",
                                "data": img_res.content
                            })
                            # Adiciona o texto se houver
                            if text:
                                prompt_parts.append(text)
                        else:
                            prompt_parts.append(text or "Analise esta imagem")
                except Exception as img_err:
                    logger.error(f"Erro ao baixar imagem para o SDK: {img_err}")
                    prompt_parts.append(text or "Analise esta imagem")
            else:
                prompt_parts.append(text)

            # Invoca o modelo nativo
            response = model_native.generate_content(prompt_parts)
            resposta_texto = response.text.strip()

            # Salva resposta da IA no prontuário e no MemPalace
            try:
                pat_res = supabase.table("sana_patient").select("id, name").eq("chat_id", chat_id).execute()
                if pat_res.data:
                    patient_id = pat_res.data[0]["id"]
                    patient_name_mem = pat_res.data[0].get("name", "paciente")
                    enc_res = supabase.table("sana_encounter").select("id").eq("patient_id", patient_id).eq("status", "in-progress").execute()
                    if enc_res.data:
                        supabase.table("sana_observation").insert({
                            "encounter_id": enc_res.data[0]["id"],
                            "category": "resposta-agente",
                            "value_string": resposta_texto
                        }).execute()
                    # Salva resposta no MemPalace para consistência futura
                    salvar_resposta_agente(patient_id, patient_name_mem, resposta_texto)
            except Exception:
                pass

            await send_telegram_message(chat_id, resposta_texto)
        except Exception as e:
            logger.error(f"Erro no Gemini Nativo: {e}")
            await send_telegram_message(chat_id, "Estou processando sua mensagem, um momento...")

    return {"status": "success"}


async def send_telegram_message(chat_id: str, text: str):
    if not TELEGRAM_BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json={"chat_id": chat_id, "text": text})
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem Telegram: {e}")
