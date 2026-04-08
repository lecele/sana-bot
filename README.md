# 🏥 Sana — Monitoramento Clínico Pós-Operatório com IA

> Sistema SaaS de acompanhamento pós-operatório que integra **Inteligência Artificial** com **Telegram** para monitorar pacientes cirúrgicos de forma humanizada, 24 horas por dia.

---

## 🔗 Links de Acesso

| Serviço | URL |
|---------|-----|
| **Painel Clínico (Web)** | https://sana-clinico.vercel.app |
| **Backend API** | http://129.121.33.171:8001 |
| **Bot no Telegram** | https://t.me/app_sana_bot |
| **Código Fonte** | https://github.com/lecele/sana-bot |

---

## 🎯 O que é o Sana?

O Sana resolve um problema real na medicina: após uma cirurgia, o paciente vai para casa e fica sem acompanhamento até a próxima consulta. Complicações como infecções e inflamações passam despercebidas — e podem virar emergências.

O Sana coloca um **Agente Clínico de IA** disponível 24h no celular do paciente via Telegram. O paciente manda uma mensagem ou uma foto da ferida, e o agente avalia, tranquiliza e alerta a equipe médica se necessário.

Benefícios principais:
- O paciente usa o Telegram que já conhece — sem instalar nada novo
- A IA analisa fotos de feridas e sintomas em segundos
- O médico acompanha tudo pelo painel web
- Funciona 24h por dia, sem intervenção humana

---

## 🏗️ Arquitetura do Sistema

O sistema é composto por três camadas que se comunicam:

**Painel Web (Frontend)** — o médico ou secretária cadastra o paciente e gera o link de convite.

**Backend (API + IA)** — recebe as mensagens do Telegram, processa com Inteligência Artificial e persiste os dados no banco.

**Telegram Bot** — interface do paciente. Simples, familiar e acessível por qualquer celular.

---

## 🔄 Fluxo Completo

### Etapa 1 — Cadastro do Paciente

O médico ou secretária acessa o painel web em `sana-clinico.vercel.app`, clica em "Provisionar Paciente", preenche o nome e o tipo de cirurgia. O sistema cria automaticamente o prontuário no banco de dados e gera um link exclusivo para aquele paciente.

### Etapa 2 — Onboarding pelo Telegram

O profissional envia o link gerado para o paciente (via WhatsApp, SMS ou e-mail). Quando o paciente clica no link, o Telegram abre automaticamente no chat com o bot. O bot recebe o código do paciente embutido no link, vincula o chat ao prontuário e envia uma mensagem de boas-vindas.

### Etapa 3 — Monitoramento Contínuo

A partir deste momento, o paciente pode mandar mensagens ou fotos a qualquer hora. O agente responde de forma humanizada, analisa o que foi enviado e registra no prontuário.

---

## 🤖 O Assistente de IA

### Personalidade

O assistente foi configurado para se comportar como um profissional de saúde humano e empático. Ele nunca usa linguagem técnica desnecessária, nunca responde com formatações estranhas (asteriscos, colchetes, códigos) e sempre transmite calma e segurança ao paciente.

Regras principais do assistente:
- Responde como um humano real, no estilo de uma conversa de WhatsApp
- Nunca usa asteriscos, hashtags ou qualquer símbolo de programação
- Sempre encaminha casos graves para a equipe médica
- Mantém um tom acolhedor e reconfortante

### Análise Visual de Feridas

Quando o paciente envia uma foto da ferida cirúrgica, o assistente aciona o modelo **Gemini 2.5 Flash** com capacidade de visão computacional. O modelo analisa a imagem e identifica sinais como avermelhamento, secreção, abertura das bordas e inflamação. A resposta é gerada em linguagem simples e humana, sem termos clínicos pesados.

### Pipeline Interno de Agentes

O sistema usa o framework LangGraph para orquestrar múltiplos agentes em sequência:

O agente principal (Concierge) recebe a mensagem e decide qual especialista acionar. Se a mensagem contém uma foto, aciona o agente de Triagem Visual, que usa o Gemini com visão para analisar a imagem. Em seguida, o agente FHIR Mapper estrutura os dados e salva no prontuário clínico. Por fim, a resposta é enviada de volta ao paciente pelo Telegram.

---

## 💻 Frontend — Painel Clínico

O painel foi desenvolvido em React com TypeScript e Tailwind CSS, com um design "Clean Clinical Sky Blue" — limpo, moderno e adequado ao ambiente de saúde.

Funcionalidades disponíveis:
- Dashboard com cards de monitoramentos ativos, cicatrizações e triagens críticas
- Busca de pacientes por nome ou código de prontuário
- Modal de provisionamento de novos pacientes
- Geração e compartilhamento do link de onboarding via Telegram
- Interface responsiva para uso em desktop clínico

Tecnologias utilizadas: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide React.

---

## ⚙️ Backend — API e Agentes de IA

O backend é uma API assíncrona construída com FastAPI, que expõe três endpoints principais:

O endpoint de health check confirma que o sistema está operacional. O endpoint de onboarding recebe os dados do novo paciente vindo do painel web, cria o registro no Supabase e retorna o ID do encontro para geração do link. O endpoint de webhook recebe todas as mensagens enviadas pelo paciente ao bot no Telegram, processa com a IA e envia a resposta de volta.

Tecnologias utilizadas: Python 3.11, FastAPI, LangGraph, LangChain, Gemini 2.5 Flash, Supabase, httpx.

---

## 🗄️ Banco de Dados

O Sana usa o Supabase (PostgreSQL na nuvem) com três tabelas no schema público:

A tabela de pacientes guarda nome e o ID de chat do Telegram, vinculado no momento do onboarding. A tabela de encontros registra cada período de acompanhamento, com status e tipo de cirurgia. A tabela de observações armazena cada avaliação feita pelo agente de IA durante o monitoramento.

---

## 🚀 Infraestrutura e Deploy

O frontend está hospedado na Vercel com deploy automático a cada push no GitHub. O backend roda como um serviço permanente (systemd) em um servidor VPS Ubuntu 22.04 da Hostgator, na porta 8001. O webhook do Telegram aponta diretamente para o IP do servidor, garantindo que as mensagens dos pacientes sejam recebidas 24 horas por dia sem depender de nenhuma máquina local.

### Gerenciamento do Servidor

Para atualizar o backend após mudanças no código, acesse o servidor via SSH e execute:

```bash
cd /root/sana-bot && git pull && systemctl restart sana-bot
```

Para verificar se o serviço está ativo:

```bash
systemctl status sana-bot
```

Para ver os logs em tempo real:

```bash
journalctl -u sana-bot -f
```

---

## 🛠️ Como Rodar Localmente

### Backend

```bash
git clone https://github.com/lecele/sana-bot.git
cd sana-bot/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd sana-bot/frontend
npm install
npm run dev
```

Acesse em `http://localhost:5173`

---

## 🔑 Variáveis de Ambiente

Copie o arquivo `backend/.env.example` para `backend/.env` e preencha com suas chaves:

```
SANA_SUPABASE_URL      → URL do projeto no Supabase
SANA_SUPABASE_KEY      → Chave anon do Supabase
GOOGLE_API_KEY         → Chave da API do Google Gemini
TELEGRAM_BOT_TOKEN     → Token do bot gerado pelo BotFather
```

---

## 🗺️ Próximas Funcionalidades

- Persistir avaliações da IA no banco de dados por paciente
- Painel do médico com histórico completo de avaliações e fotos
- Alertas automáticos por e-mail em casos de risco elevado
- Lembretes de medicação enviados automaticamente pelo bot
- Geração de relatório PDF por paciente ao final do acompanhamento
- Autenticação de médicos e clínicas no painel (multi-tenant)

---

## 📄 Licença

Projeto proprietário — © 2026 Sana Clinical Monitoring. Todos os direitos reservados.

---

*Desenvolvido para melhorar o cuidado pós-operatório e salvar vidas através da tecnologia.*
