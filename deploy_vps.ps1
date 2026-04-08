$PASS = "LLccll23*"
$IP   = "129.121.33.171"
$PORT = "22022"
$USER = "root"

function SSH($cmd) {
    echo "y" | plink -ssh -P $PORT -pw $PASS "${USER}@${IP}" $cmd 2>&1
}

Write-Host "`n=== VERIFICANDO PROJETOS EXISTENTES (SEM ALTERAR) ===" -ForegroundColor Cyan
SSH "ls /root/"

Write-Host "`n=== INSTALANDO DEPENDENCIAS (python3, pip, git) ===" -ForegroundColor Cyan
SSH "apt-get update -qq && apt-get install -y -qq python3 python3-pip python3-venv git"

Write-Host "`n=== CLONANDO / ATUALIZANDO SANA ===" -ForegroundColor Cyan
SSH "if [ -d /root/sana-bot ]; then cd /root/sana-bot && git pull; else cd /root && git clone https://github.com/lecele/sana-bot.git; fi"

Write-Host "`n=== CONFIGURANDO AMBIENTE VIRTUAL ===" -ForegroundColor Cyan
SSH "cd /root/sana-bot/backend && python3 -m venv .venv && .venv/bin/pip install -q --upgrade pip && .venv/bin/pip install -q -r requirements.txt"

Write-Host "`n=== CONCLUIDO ===" -ForegroundColor Green
