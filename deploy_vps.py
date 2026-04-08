#!/usr/bin/env python3
"""Deploy Sana backend no VPS Hostgator via SSH com senha automaticamente"""
import subprocess, sys, time, os

SSH  = ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15", 
        "-p", "22022", "root@129.121.33.171"]
SCP  = ["scp", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15",
        "-P", "22022"]
PASS = "LLccll23*"

def run_ssh(cmd, timeout=120):
    """Roda comando SSH passando senha pelo stdin quando solicitado."""
    full = SSH + [cmd]
    print(f"\n$ {cmd[:80]}")
    proc = subprocess.Popen(full, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True)
    out, _ = proc.communicate(input=f"{PASS}\n", timeout=timeout)
    print(out.strip() if out.strip() else "(sem output)")
    return proc.returncode, out

def scp_file(local, remote, timeout=30):
    """Copia arquivo local para o servidor via SCP."""
    full = SCP + [local, f"root@129.121.33.171:{remote}"]
    print(f"\n$ scp {local} -> {remote}")
    proc = subprocess.Popen(full, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True)
    out, _ = proc.communicate(input=f"{PASS}\n", timeout=timeout)
    print(out.strip() if out.strip() else "OK")

# === 1. Verificar projetos existentes ====
print("\n" + "="*60)
print("🔍 PROJETOS EXISTENTES NO SERVIDOR (apenas leitura)")
print("="*60)
run_ssh("ls /root/ && echo '--- containers ---' && docker ps --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null || echo '(sem docker)'")

# === 2. Instalar dependências do sistema ===
print("\n" + "="*60)
print("📦 INSTALANDO DEPENDENCIAS DO SISTEMA")
print("="*60)
run_ssh("apt-get update -qq && apt-get install -y -qq python3 python3-pip python3-venv git curl && echo 'DEPS_OK'", 120)

# === 3. Clonar ou atualizar repo ===
print("\n" + "="*60)
print("📥 CLONANDO / ATUALIZANDO REPOSITORIO SANA")
print("="*60)
run_ssh("if [ -d /root/sana-bot ]; then cd /root/sana-bot && git pull && echo 'UPDATED'; else git clone https://github.com/lecele/sana-bot.git /root/sana-bot && echo 'CLONED'; fi", 60)

# === 4. Venv e dependências Python ===
print("\n" + "="*60)
print("🐍 CRIANDO VENV E INSTALANDO DEPENDENCIAS PYTHON")
print("="*60)
run_ssh(
    "cd /root/sana-bot/backend && "
    "python3 -m venv .venv && "
    ".venv/bin/pip install -q --upgrade pip && "
    ".venv/bin/pip install -q fastapi 'uvicorn[standard]' supabase python-dotenv "
    "httpx langchain langchain-google-genai langgraph langchain-core google-generativeai && "
    "echo 'PYTHON_DEPS_OK'",
    300
)

# === 5. Criar .env no servidor ===
print("\n" + "="*60)
print("📝 CRIANDO .env NO SERVIDOR")
print("="*60)

env_path = os.path.join(os.path.dirname(__file__), "backend", ".env")
env_vars = {}
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip()

env_content = "\n".join(f"{k}={v}" for k, v in env_vars.items())
# Usa uma abordagem alternativa para criar o .env sem heredoc (evita problemas de escape)
cmd_env = f"python3 -c \"import base64; open('/root/sana-bot/backend/.env','w').write(__import__('base64').b64decode('{__import__('base64').b64encode(env_content.encode()).decode()}').decode())\" && echo 'ENV_OK'"
run_ssh(cmd_env, 30)

# === 6. Criar serviço systemd ===
print("\n" + "="*60)
print("🔧 CONFIGURANDO SERVICO SYSTEMD")
print("="*60)

service = """[Unit]
Description=Sana Bot Backend (FastAPI)
After=network.target

[Service]
User=root
WorkingDirectory=/root/sana-bot/backend
ExecStart=/root/sana-bot/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
"""
import base64
svc_b64 = base64.b64encode(service.encode()).decode()
cmd_svc = f"python3 -c \"import base64; open('/etc/systemd/system/sana-bot.service','w').write(base64.b64decode('{svc_b64}').decode())\" && echo 'SERVICE_FILE_OK'"
run_ssh(cmd_svc, 30)

# === 7. Iniciar serviço ===
print("\n" + "="*60)
print("🚀 INICIANDO SERVICO SANA-BOT")
print("="*60)
run_ssh("systemctl daemon-reload && systemctl enable sana-bot && systemctl restart sana-bot && echo 'STARTED'", 30)
time.sleep(4)
run_ssh("systemctl status sana-bot --no-pager -l", 15)

# === 8. Abrir firewall ===
run_ssh("ufw allow 8001/tcp 2>/dev/null || iptables -I INPUT -p tcp --dport 8001 -j ACCEPT 2>/dev/null; echo 'FIREWALL_OK'", 15)

# === 9. Testar ===
print("\n" + "="*60)
print("✅ TESTANDO API")
print("="*60)
run_ssh("sleep 2 && curl -s http://localhost:8001/ || echo 'AGUARDANDO INICIO...'", 20)

# === 10. Atualizar webhook Telegram ===
print("\n" + "="*60)
print("🤖 ATUALIZANDO WEBHOOK TELEGRAM")
print("="*60)
token = env_vars.get("TELEGRAM_BOT_TOKEN", "")
if token:
    run_ssh(f"curl -s 'https://api.telegram.org/bot{token}/setWebhook?url=http://129.121.33.171:8001/webhook/telegram'", 15)

print("\n" + "="*60)
print("🎉 DEPLOY CONCLUIDO!")
print(f"   Backend : http://129.121.33.171:8001")
print(f"   Frontend: https://sana-clinico.vercel.app")
print(f"   GitHub  : https://github.com/lecele/sana-bot")
print("="*60)
