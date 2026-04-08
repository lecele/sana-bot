import subprocess
import os

SSH = ['ssh', '-o', 'StrictHostKeyChecking=no', '-p', '22022', 'root@129.121.33.171']
PASS = 'LLccll23*'

# Comando que será executado DENTRO do servidor Linux
remote_command = 'bash -c "cd /root/sana-bot && git pull && backend/.venv/bin/pip install -q mempalace chromadb && systemctl daemon-reload && systemctl restart sana-bot && echo DEPLOY_SUCCESSFUL"'

def run_deploy():
    print("🚀 Iniciando deploy mestre no VPS...")
    try:
        proc = subprocess.Popen(
            SSH + [remote_command],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        # Envia a senha e espera até 10 minutos
        stdout, _ = proc.communicate(input=f"{PASS}\n", timeout=600)
        
        print("\n--- Saída do Servidor ---")
        print(stdout)
        print("--------------------------\n")
        
        if "DEPLOY_SUCCESSFUL" in stdout:
            print("✅ TUDO CERTO! O sistema foi atualizado e reiniciado com sucesso.")
        else:
            print("⚠️ O comando terminou, mas não confirmou o sucesso. Verifique os logs acima.")
            
    except subprocess.TimeoutExpired:
        print("❌ ERRO: O servidor demorou mais de 10 minutos para responder. O deploy pode ter falhado ou ainda estar rodando em background.")
    except Exception as e:
        print(f"❌ ERRO INESPERADO: {str(e)}")

if __name__ == "__main__":
    run_deploy()
