#!/bin/bash

# =========================================================================
# SANA MVP: Script de Configuração do Ambiente Frontend (React + Vite)
# =========================================================================

echo "🚀 Iniciando setup do Frontend do Sana..."

# 1. Cria o projeto React com TypeScript e Vite na pasta 'frontend'
npx -y create-vite@latest frontend --template react-ts
cd frontend

# 2. Instala dependências básicas
npm install

# 3. Instala e configura Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# (Opcional, mas recomendado configurar o content no tailwind.config.js manualmente 
# ex: content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],)

# 4. Inicializa o shadcn/ui. Respondendo padrão as perguntas não-interativas
npx shadcn@latest init

# 5. Adiciona os componentes base solicitados pelo OnboardingModal
npx shadcn@latest add dialog
npx shadcn@latest add button
npx shadcn@latest add input

echo "✅ Ambiente React/shadcn pronto! Navegue até a pasta frontend e execute 'npm run dev'"
