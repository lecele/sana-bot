#!/usr/bin/env python3
"""
sana_memory.py — Integração MemPalace para o Backend Sana
==========================================================

Este módulo conecta o Sana ao MemPalace, um sistema de memória vetorial
local baseado em ChromaDB. Cada paciente tem sua própria "wing" (ala) no
palácio, com "rooms" (salas) para diferentes aspectos clínicos:

  - evolucao-clinica   : mensagens e sintomas reportados
  - analise-ferida     : avaliações de fotos enviadas
  - respostas-agente   : o que o agente respondeu (para consistência)
  - alertas            : sinais de alerta registrados

Vantagens para o Sana:
  - Contexto localizado por paciente — sem vazar dados de um para outro
  - Dados 100% no VPS — conformidade LGPD sem enviar para nuvem externa
  - Economia de tokens — só injeta no prompt o que é relevante
  - Histórico persistente mesmo se o Supabase ficar temporariamente offline

Configuração:
  - MEMPALACE_PALACE_PATH: variável de ambiente ou padrão /root/.mempalace/palace
"""

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Caminho do palácio no servidor — pode ser sobrescrito por variável de ambiente
PALACE_PATH = os.environ.get(
    "MEMPALACE_PALACE_PATH",
    os.path.expanduser("~/.mempalace/palace")
)

# Tenta importar o MemPalace — falha graciosamente se não estiver instalado
try:
    from mempalace.searcher import search_memories
    from mempalace.mcp_server import tool_add_drawer
    import chromadb
    _MEMPALACE_AVAILABLE = True
    logger.info(f"MemPalace disponível. Palace: {PALACE_PATH}")
except ImportError:
    _MEMPALACE_AVAILABLE = False
    logger.warning(
        "MemPalace não encontrado. Rodando sem memória vetorial. "
        "Instale com: pip install mempalace"
    )


def _wing_id(patient_id: str) -> str:
    """Converte patient_id (UUID) em nome de wing padronizado."""
    # Usa apenas os primeiros 8 chars do UUID para legibilidade
    short_id = str(patient_id).replace("-", "")[:8]
    return f"paciente_{short_id}"


def _ensure_palace_exists() -> bool:
    """Verifica se o palace está inicializado. Tenta criar se não existir."""
    if not _MEMPALACE_AVAILABLE:
        return False
    try:
        palace = Path(PALACE_PATH)
        if not palace.exists():
            palace.mkdir(parents=True, exist_ok=True)
            logger.info(f"Diretório do palace criado: {PALACE_PATH}")
        # Tenta conectar para confirmar que o ChromaDB funciona
        client = chromadb.PersistentClient(path=PALACE_PATH)
        client.get_or_create_collection("mempalace_drawers")
        return True
    except Exception as e:
        logger.error(f"Erro ao verificar palace: {e}")
        return False


def salvar_mensagem_paciente(patient_id: str, patient_name: str, texto: str) -> bool:
    """
    Salva uma mensagem enviada pelo paciente no MemPalace.

    Args:
        patient_id: UUID do paciente no Supabase
        patient_name: Nome do paciente (para contexto)
        texto: Texto da mensagem

    Returns:
        True se salvou, False se o MemPalace não está disponível ou houve erro
    """
    if not _ensure_palace_exists():
        return False
    try:
        wing = _wing_id(patient_id)
        conteudo = f"[Paciente: {patient_name}] {texto}"
        result = tool_add_drawer(
            wing=wing,
            room="evolucao-clinica",
            content=conteudo,
            source_file="telegram_webhook",
            added_by="sana_paciente"
        )
        if result.get("success"):
            logger.info(f"MemPalace: mensagem salva → {wing}/evolucao-clinica")
        return result.get("success", False)
    except Exception as e:
        logger.warning(f"MemPalace: falha ao salvar mensagem do paciente: {e}")
        return False


def salvar_analise_ferida(patient_id: str, patient_name: str, img_url: str, legenda: str = "") -> bool:
    """
    Salva o registro de uma foto de ferida enviada pelo paciente.

    Args:
        patient_id: UUID do paciente
        patient_name: Nome do paciente
        img_url: URL da imagem no Telegram
        legenda: Texto enviado junto com a foto (opcional)
    """
    if not _ensure_palace_exists():
        return False
    try:
        wing = _wing_id(patient_id)
        partes = [f"[Paciente: {patient_name}] Enviou foto de ferida para análise."]
        if legenda:
            partes.append(f"Legenda: {legenda}")
        partes.append(f"URL: {img_url}")
        conteudo = " | ".join(partes)
        result = tool_add_drawer(
            wing=wing,
            room="analise-ferida",
            content=conteudo,
            source_file="telegram_webhook",
            added_by="sana_sistema"
        )
        if result.get("success"):
            logger.info(f"MemPalace: foto salva → {wing}/analise-ferida")
        return result.get("success", False)
    except Exception as e:
        logger.warning(f"MemPalace: falha ao salvar análise de ferida: {e}")
        return False


def salvar_resposta_agente(patient_id: str, patient_name: str, resposta: str) -> bool:
    """
    Salva a resposta gerada pelo agente de IA para garantir consistência futura.

    Args:
        patient_id: UUID do paciente
        patient_name: Nome do paciente
        resposta: Texto da resposta do agente
    """
    if not _ensure_palace_exists():
        return False
    try:
        wing = _wing_id(patient_id)
        conteudo = f"[Agente Sana → {patient_name}] {resposta}"
        result = tool_add_drawer(
            wing=wing,
            room="respostas-agente",
            content=conteudo,
            source_file="sana_agent",
            added_by="sana_agente"
        )
        if result.get("success"):
            logger.info(f"MemPalace: resposta do agente salva → {wing}/respostas-agente")
        return result.get("success", False)
    except Exception as e:
        logger.warning(f"MemPalace: falha ao salvar resposta do agente: {e}")
        return False


def buscar_contexto_paciente(patient_id: str, pergunta: str, n_results: int = 4) -> str:
    """
    Busca no MemPalace o histórico relevante de um paciente para enriquecer o prompt da IA.

    Retorna uma string formatada pronta para inserir no system_prompt do Gemini.
    Se o MemPalace não estiver disponível, retorna string vazia (sem quebrar o fluxo).

    Args:
        patient_id: UUID do paciente
        pergunta: A mensagem atual do paciente (usada como query de busca)
        n_results: Número máximo de memórias a recuperar (default: 4)

    Returns:
        String com contexto histórico formatado, ou "" se não disponível
    """
    if not _MEMPALACE_AVAILABLE:
        return ""
    try:
        wing = _wing_id(patient_id)
        resultado = search_memories(
            query=pergunta,
            palace_path=PALACE_PATH,
            wing=wing,
            n_results=n_results,
        )
        if "error" in resultado or not resultado.get("results"):
            return ""

        hits = resultado["results"]
        if not hits:
            return ""

        linhas = ["=== Histórico relevante do paciente ==="]
        for i, hit in enumerate(hits, 1):
            sala = hit.get("room", "geral")
            texto = hit.get("text", "").strip()
            sim = hit.get("similarity", 0)
            # Só inclui memórias com similaridade razoável para economizar tokens
            if sim >= 0.3 and texto:
                linhas.append(f"[{i}] ({sala}) {texto}")

        if len(linhas) <= 1:
            return ""

        linhas.append("=== Fim do histórico ===")
        contexto = "\n".join(linhas)
        logger.info(f"MemPalace: {len(hits)} memórias recuperadas para {wing}")
        return contexto

    except Exception as e:
        logger.warning(f"MemPalace: falha na busca de contexto: {e}")
        return ""


def status_palace() -> dict:
    """
    Retorna informações sobre o estado do MemPalace para monitoramento.
    Útil para um endpoint de health check.
    """
    if not _MEMPALACE_AVAILABLE:
        return {"available": False, "reason": "mempalace não instalado"}

    try:
        client = chromadb.PersistentClient(path=PALACE_PATH)
        col = client.get_or_create_collection("mempalace_drawers")
        total = col.count()

        # Conta wings únicas (uma por paciente)
        all_meta = col.get(include=["metadatas"], limit=10000).get("metadatas", [])
        wings = set(m.get("wing", "unknown") for m in all_meta)

        return {
            "available": True,
            "palace_path": PALACE_PATH,
            "total_drawers": total,
            "patient_wings": len(wings),
        }
    except Exception as e:
        return {"available": False, "reason": str(e)}
