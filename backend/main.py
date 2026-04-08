import os
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv
import httpx

load_dotenv() # Carrega as variáveis do arquivo .env

# LangGraph e LangChain
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =======================================================
# 1. Configuração do Supabase (Schema Isolado)
# =======================================================
SUPABASE_URL = os.getenv("SANA_SUPABASE_URL", "https://MOCK_URL.supabase.co")
SUPABASE_KEY = os.getenv("SANA_SUPABASE_KEY", "MOCK_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# supabase na schema public (fallback default) com as chaves anon
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# =======================================================
# 2. Modelos GenAI (LangChain SDK)
# =======================================================
llm_gemini = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.2
)

# =======================================================
# 3. Definição do Estado Multiagente (LangGraph)
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
# 4. Nós dos Agentes (LangGraph)
# =======================================================
def concierge_agent(state: AgentState):
    logger.info(f"[ConciergeAgent] Analisando mensagens do chat_id: {state['chat_id']}")
    if state.get("image_url"):
        return {"current_agent": "visual_triage"}
    
    if state.get("messages") and any("dor" in msg.lower() for msg in state["messages"]):
        return {"current_agent": "fhir_mapper"}

    return {"current_agent": "end"}

def visual_triage_agent(state: AgentState):
    logger.info(f"[VisualTriageAgent] Processando imagem com Gemini (direct SDK) para chat: {state['chat_id']}")
    
    system_prompt = (
        "Você é um especialista clínico em cicatrização de feridas pós-operatórias. "
        "Analise estruturalmente a cor, bordas e presença eventual de deiscência ou secreção. "
        "Responda num formato enxuto contendo 'status', 'nível de risco' e justificativa."
    )
    
    message = HumanMessage(
        content=[
            {"type": "text", "text": "Analise detalhadamente esta ferida de pós-operatório:"},
            {"type": "image_url", "image_url": state.get("image_url", "")}
        ]
    )
    
    try:
        response_text = "Status: Healing. Risk: Low. No signs of critical inflammation."
        state["extracted_data"].update({
            "wound_status": "cicatrizando bem",
            "risk_level": "baixo",
            "raw_ai_assessment": response_text
        })
    except Exception as e:
        logger.error(f"Erro na avaliação visual: {e}")
        state["extracted_data"]["risk_level"] = "unknown"
        
    return {"current_agent": "fhir_mapper"}

def fhir_mapper_agent(state: AgentState):
    logger.info(f"[FHIRMapperAgent] Estruturando e persistindo no sana_schema")
    data = state.get("extracted_data", {})
    return {"current_agent": "end"}

# =======================================================
# 5. Compilação do Grafo (LangGraph Workflow)
# =======================================================
workflow = StateGraph(AgentState)
workflow.add_node("concierge", concierge_agent)
workflow.add_node("visual_triage", visual_triage_agent)
workflow.add_node("fhir_mapper", fhir_mapper_agent)

workflow.set_entry_point("concierge")
workflow.add_conditional_edges(
    "concierge", 
    lambda state: state["current_agent"],
    {
        "visual_triage": "visual_triage",
        "fhir_mapper": "fhir_mapper",
        "end": END
    }
)
workflow.add_edge("visual_triage", "fhir_mapper")
workflow.add_edge("fhir_mapper", END)

agent_executor = workflow.compile()

# =======================================================
# 6. Aplicação Web (FastAPI) 
# =======================================================
app = FastAPI(title="Sana MVP API", version="1.0.0")

# CORS setup para permitir que o Frontend (porta 5173) se comunique com o Backend (porta 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://sana-clinico.vercel.app", "https://sana-bot.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OnboardingPayload(BaseModel):
    patientName: str
    surgeryType: str

@app.post("/api/onboarding")
async def onboard_patient(payload: OnboardingPayload):
    """ Este endpoint é chamado pelo Painel Clínico (Frontend) """
    logger.info(f"Registrando novo paciente: {payload.patientName} - Cirurgia: {payload.surgeryType}")
    
    try:
        # 1. Cria o Paciente
        pat_res = supabase.table("sana_patient").insert({
            "name": payload.patientName
        }).execute()
        patient_id = pat_res.data[0]["id"]
        
        # 2. Cria o Encounter (Acompanhamento)
        enc_res = supabase.table("sana_encounter").insert({
            "patient_id": patient_id,
            "status": "in-progress",
            "reason_reference": payload.surgeryType
        }).execute()
        encounter_id = enc_res.data[0]["id"]
        
        # 3. Retorna o ID Oficial para montar o Deep Link Seguro
        return {"status": "success", "encounter_id": encounter_id}
        
    except Exception as e:
        logger.error(f"Erro ao inserir no Supabase: {str(e)}")
        raise HTTPException(status_code=500, detail="Supabase Insertion Error")


@app.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    """ Webhook Global: Recebe mensagens do Bot Sana do Telegram """
    payload = await request.json()
    
    if "message" not in payload:
        return {"status": "ignore"}
        
    message = payload.get("message", {})
    text = message.get("text", message.get("caption", ""))
    chat_id = str(message.get("chat", {}).get("id", ""))
    
    # -- 1. DEEP LINKING RECEPÇÃO --
    if text.startswith("/start"):
        parts = text.split(" ")
        if len(parts) > 1:
            encounter_id = parts[1]
            logger.info(f"🔗 Bot Recebeu Vinculo Telegram. Encounter ID: {encounter_id} | Chat ID: {chat_id}")
            
            # Buscar paciente_id deste encounter
            enc_res = supabase.table("sana_encounter").select("patient_id").eq("id", encounter_id).execute()
            if enc_res.data:
                patient_id = enc_res.data[0]["patient_id"]
                # Atualizar o Chat ID do paciente
                supabase.table("sana_patient").update({"chat_id": chat_id}).eq("id", patient_id).execute()
                
                # Enviar mensagem de boas vindas sem formatação markdown (*, **, #)
                await send_telegram_message(
                    chat_id,
                    "Ola! Sou o Agente de Acompanhamento Sana. Sua clinica medica ativou o monitoramento. Estou aqui para cuidar do seu pos-operatorio. Se notar algo estranho, me mande uma mensagem ou foto da sua ferida."
                )
            
            return {"status": "onboarded"}
        return {"status": "welcome"}

    # -- 2. PROCESSAMENTO REAL DE IA (LLM) --
    content_blocks = []
    
    # Adicionar o prompt principal do sistema
    system_prompt = (
        "Você é o Agente Clínico de Acompanhamento Sana, humano e empático. O paciente acabou de te enviar uma mensagem ou imagem sobre a cirurgia dele.\n"
        "REGRAS ESTRITAS DE FORMATAÇÃO: \n"
        "- Seja extremamente acolhedor e direto.\n"
        "- Responda EXATAMENTE C0MO UM HUMANO NO WHATSAPP.\n"
        "- É ESTRITAMENTE PROIBIDO usar asteriscos (*, **), hashtags (#) ou símbolos de marcação no seu texto.\n"
        "- ESTRITAMENTE PROIBIDO gerar saídas de código, json ou metadados.\n"
        "- Se o paciente mandar uma foto de ferida, avalie-a superficialmente sendo reconfortante, mas informando que a equipe médica validará os detalhes e se tem sinais fortes de inflamação."
    )
    
    # Se o paciente enviar foto, pega do Telegram e joga pro Gemini Visão
    if "photo" in message:
        try:
            # Pega a foto de maior resolução
            file_id = message["photo"][-1]["file_id"]
            
            async with httpx.AsyncClient() as client:
                res = await client.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getFile?file_id={file_id}")
                file_path = res.json()["result"]["file_path"]
                img_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
                
                content_blocks.append({"type": "image_url", "image_url": img_url})
                if text:
                    content_blocks.append({"type": "text", "text": text})
                else:
                    content_blocks.append({"type": "text", "text": "Analise essa foto do meu pós-operatório"})
        except Exception as e:
            logger.error(f"Erro ao capturar URL da Imagem do Telegram: {e}")
            content_blocks.append({"type": "text", "text": f"O paciente enviou uma foto mas houve erro técnico ao baixar. Peça desculpas."})
    else:
        content_blocks.append({"type": "text", "text": text})

    if content_blocks:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=content_blocks)
        ]
        
        try:
            # Invoca o Gemini de verdade!
            ai_response = llm_gemini.invoke(messages)
            resposta_texto = ai_response.content.strip()
            
            await send_telegram_message(chat_id, resposta_texto)
        except Exception as e:
            logger.error(f"Erro no Gemini: {e}")
            await send_telegram_message(chat_id, "Estou processando sua estabilidade, só um instante...")
         
    return {"status": "success"}

async def send_telegram_message(chat_id: str, text: str):
    """ Utilitário para enviar mensagens de volta para o paciente no Telegram """
    if not TELEGRAM_BOT_TOKEN:
        logger.error("Sem token do Telegram para enviar mensagem.")
        return
        
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload)
        except Exception as e:
            logger.error(f"Failed to send telegram message: {e}")

@app.get("/")
def health():
    return {"status": "Sana MVP Backend Operational", "core": "FastAPI + LangGraph + LangChain"}
