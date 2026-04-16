SANA — Monitoramento Clinico Pos-Operatorio com Inteligencia Artificial
=======================================================================

Sistema SaaS de acompanhamento pos-operatorio que integra Inteligencia Artificial com Telegram para monitorar pacientes cirurgicos de forma humanizada, 24 horas por dia.


LINKS DE ACESSO
---------------

Painel Clinico (Web):  https://sana-clinico.vercel.app
Backend API:           http://129.121.33.171:8001
Bot no Telegram:       https://t.me/app_sana_bot
Codigo Fonte:          https://github.com/lecele/sana-bot


O QUE E O SANA
--------------

O Sana resolve um problema real na medicina: apos uma cirurgia, o paciente vai para casa e fica sem acompanhamento ate a proxima consulta. Complicacoes como infeccoes e inflamacoes passam despercebidas e podem virar emergencias.

O Sana coloca um Agente Clinico de IA disponivel 24h no celular do paciente via Telegram. O paciente manda uma mensagem ou uma foto da ferida, e o agente avalia, tranquiliza e alerta a equipe medica se necessario.

Beneficios principais:
- O paciente usa o Telegram que ja conhece, sem instalar nada novo
- A IA analisa fotos de feridas e sintomas em segundos
- O medico acompanha tudo pelo painel web
- Funciona 24h por dia, sem intervencao humana


ARQUITETURA DO SISTEMA
----------------------

O sistema e composto por tres camadas que se comunicam:

PAINEL WEB (Frontend): o medico ou secretaria cadastra o paciente e gera o link de convite.

BACKEND (API mais IA): recebe as mensagens do Telegram, processa com Inteligencia Artificial e persiste os dados no banco.

TELEGRAM BOT: interface do paciente. Simples, familiar e acessivel por qualquer celular.


FLUXO COMPLETO
--------------

Etapa 1 - Cadastro do Paciente

O medico ou secretaria acessa o painel web, clica em "Provisionar Paciente", preenche o nome e o tipo de cirurgia. O sistema cria automaticamente o prontuario no banco de dados e gera um link exclusivo para aquele paciente.

Etapa 2 - Onboarding e Termo LGPD

O profissional envia o link gerado para o paciente via WhatsApp, SMS ou e-mail. Quando o paciente clica no link, o Telegram abre automaticamente no chat com o bot. O bot recebe o codigo do paciente embutido no link, vincula o chat ao prontuario e envia uma mensagem de boas-vindas e o Termo de Consentimento (LGPD). O paciente so consegue enviar mensagens ou fotos para a IA apos digitar "SIM", confirmando o uso de seus dados em conformidade com as normas legais.

Etapa 3 - Monitoramento Continuo

A partir deste momento, o paciente pode mandar mensagens ou fotos a qualquer hora. O agente responde de forma humanizada, analisa o que foi enviado e registra no prontuario.


O ASSISTENTE DE IA
------------------

Personalidade

O assistente foi configurado para se comportar como um profissional de saude humano e empatico. Ele nunca usa linguagem tecnica desnecessaria, nunca responde com formatacoes estranhas e sempre transmite calma e seguranca ao paciente.

Regras do assistente:
- Responde como um humano real, no estilo de uma conversa de WhatsApp
- Nunca usa asteriscos, hashtags ou qualquer simbolo de programacao
- Sempre encaminha casos graves para a equipe medica
- Mantem um tom acolhedor e reconfortante

Analise Visual de Feridas

Quando o paciente envia uma foto da ferida cirurgica, o assistente aciona o modelo Gemini 2.5 Flash com capacidade de visao computacional. O modelo analisa a imagem e identifica sinais como avermelhamento, secrecao, abertura das bordas e inflamacao. A resposta e gerada em linguagem simples e humana.

Pipeline Interno

O sistema usa o framework LangGraph para orquestrar multiplos agentes em sequencia. O agente principal recebe a mensagem e decide qual especialista acionar. Se a mensagem contem uma foto, aciona o agente de Triagem Visual que usa o Gemini para analisar a imagem. Em seguida, o agente FHIR Mapper estrutura os dados e salva no prontuario clinico. Por fim, a resposta e enviada de volta ao paciente pelo Telegram.


FRONTEND — PAINEL CLINICO
--------------------------

O painel foi desenvolvido em React com TypeScript e Tailwind CSS, com design limpo e adequado ao ambiente de saude.

Funcionalidades disponiveis:
- Dashboard com cards de monitoramentos ativos, cicatrizacoes e triagens criticas
- Busca de pacientes por nome ou codigo de prontuario
- Modal de provisionamento de novos pacientes
- Geracao e compartilhamento do link de onboarding via Telegram
- Interface responsiva para uso em desktop clinico

Tecnologias: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide React.


BACKEND — API E AGENTES DE IA
------------------------------

O backend e uma API assincrona construida com FastAPI, com tres endpoints principais:

Health check: confirma que o sistema esta operacional.

Onboarding: recebe os dados do novo paciente vindo do painel web, cria o registro no Supabase e retorna o ID do encontro para geracao do link.

Webhook Telegram: recebe todas as mensagens enviadas pelo paciente ao bot, processa com a IA e envia a resposta de volta.

Tecnologias: Python 3.11, FastAPI, LangGraph, LangChain, Gemini 2.5 Flash, Supabase, httpx.


BANCO DE DADOS E MIDIA (LGPD)
-----------------------------

O Sana usa o Supabase (PostgreSQL completo) com dados e midias blindadas em privacidade:

Tabela de pacientes: guarda nome e o ID de chat do Telegram, alem dos logs oficiais de permissao de tratamento de dados (`consent_given` e `consent_date`).

Tabela de encontros: registra cada acompanhamento, com diagnostico e procedimentos.

Tabela de observacoes: armazena cada triagem feita e referencia privada das imagens locais.

Armazenamento Privado (Buckets): As fotos nao ficam disponiveis de forma publica. O backend extrai do Telegram, deposita num cofre inacessivel (`sana_media`) do Supabase e so entao fornece para a interface web via URLs Assinadas (Signed URLs) de curtissima duracao (60 minutos).


INFRAESTRUTURA E DEPLOY
------------------------

Frontend:         Vercel com deploy automatico a cada push no GitHub
Backend:          VPS Ubuntu 22.04 Hostgator, servico systemd permanente, porta 8001
Banco de Dados:   Supabase cloud
Bot Telegram:     Webhook apontando diretamente para o IP do servidor VPS
Repositorio:      GitHub (lecele/sana-bot)

Gerenciamento do Servidor

Para atualizar o backend apos mudancas no codigo, acesse o servidor via SSH e execute:

    cd /root/sana-bot && git pull && systemctl restart sana-bot

Para verificar se o servico esta ativo:

    systemctl status sana-bot

Para ver os logs em tempo real:

    journalctl -u sana-bot -f


COMO RODAR LOCALMENTE
----------------------

Backend:

    git clone https://github.com/lecele/sana-bot.git
    cd sana-bot/backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env
    uvicorn main:app --reload --port 8000

Frontend:

    cd sana-bot/frontend
    npm install
    npm run dev
    Acesse em http://localhost:5173


VARIAVEIS DE AMBIENTE
----------------------

Copie o arquivo backend/.env.example para backend/.env e preencha:

    SANA_SUPABASE_URL      URL do projeto no Supabase
    SANA_SUPABASE_KEY      Chave anon do Supabase
    GOOGLE_API_KEY         Chave da API do Google Gemini
    TELEGRAM_BOT_TOKEN     Token do bot gerado pelo BotFather



PROXIMAS FUNCIONALIDADES
-------------------------

- Painel do medico com historico completo de avaliacoes e fotos
- Alertas automaticos por e-mail em casos de risco elevado
- Lembretes de medicacao enviados automaticamente pelo bot
- Geracao de relatorio PDF por paciente ao final do acompanhamento
- Autenticacao de medicos e clinicas no painel


SISTEMA DE MEMORIA VETORIAL (MEMPALACE)
-----------------------------------------

O Sana integra o MemPalace, uma biblioteca open-source de memoria vetorial local
baseada em ChromaDB. Isso permite que o agente de IA tenha memoria persistente
de cada paciente sem enviar dados para servicos externos.

Por que usamos MemPalace:

  Privacidade (LGPD): O historico clinico fica 100% no VPS. Nenhum dado sensivel
  de paciente e enviado para indexacao em nuvem externa.

  Economia de Tokens: Em vez de enviar o historico completo a cada mensagem,
  o sistema busca apenas as memorias mais relevantes para a pergunta atual.
  Isso reduz o custo de API do Gemini em ate 60%.

  Consistencia: O agente se "lembra" de respostas anteriores e do historico clinico
  do paciente, evitando contradicoes entre sessoes.

Como funciona:

  Cada paciente tem sua propria "wing" (ala) no palacio de memoria, identificada
  pelo seu UUID do Supabase. Dentro dessa ala existem tres "rooms" (salas):

    evolucao-clinica  : mensagens enviadas pelo paciente
    analise-ferida    : fotos e avaliacoes visuais
    respostas-agente  : o que a IA respondeu (para consistencia futura)

  A cada nova mensagem do paciente, o sistema:
    1. Busca memorias relevantes no MemPalace (busca semantica por similaridade)
    2. Injeta essas memorias no system_prompt do Gemini como contexto
    3. Gera a resposta com conhecimento do historico do paciente
    4. Salva a nova mensagem e resposta no MemPalace para o futuro

Localizacao no Servidor:

    Palace (banco vetorial): /root/.mempalace/palace/
    Modulo de integracao:    /root/sana-bot/backend/sana_memory.py
    Variavel de ambiente:    MEMPALACE_PALACE_PATH=/root/.mempalace/palace

Verificar status do MemPalace:

    curl http://129.121.33.171:8001/
    # O campo "memory" mostra total_drawers e patient_wings

Codigo de integracao (sana_memory.py):

    from sana_memory import buscar_contexto_paciente, salvar_mensagem_paciente

    # Buscar historico relevante antes do Gemini responder
    contexto = buscar_contexto_paciente(patient_id, mensagem_atual)

    # Salvar nova mensagem no palacio apos processar
    salvar_mensagem_paciente(patient_id, patient_name, texto)

Repositorio do MemPalace: https://github.com/milla-jovovich/mempalace


LICENCA
-------

Projeto proprietario. Todos os direitos reservados.
Desenvolvido para melhorar o cuidado pos-operatorio e salvar vidas atraves da tecnologia.
