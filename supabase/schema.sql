-- ==========================================
-- SANA MVP: DDL Script for Supabase
-- Arquitetura Isolada e Padrões FHIR HL7
-- ==========================================

-- Isolar todo o domínio do Sana em um schema dedicado
CREATE SCHEMA IF NOT EXISTS sana_schema;

-- ==========================================
-- Tabela: Patient (FHIR-like)
-- Extensão para integração via Bot do Telegram
-- ==========================================
CREATE TABLE sana_schema.patient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(100) UNIQUE, -- CPF, Passaporte ou prontuário interno
    active BOOLEAN DEFAULT TRUE,
    name VARCHAR(255) NOT NULL,
    telecom_phone VARCHAR(50),      -- Para o WhatsApp/Telegram
    telegram_chat_id VARCHAR(100) UNIQUE, -- ID do chat para interações ativas do ConciergeAgent
    birth_date DATE,
    gender VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Tabela: Encounter (FHIR-like)
-- Representa o episódio de cuidado/pós-operatório ativo
-- ==========================================
CREATE TABLE sana_schema.encounter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES sana_schema.patient(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'in-progress', -- planned, in-progress, finished, cancelled
    class_code VARCHAR(50) DEFAULT 'post-op',
    type_text VARCHAR(255), -- Ex: "Pós-operatório de Apendicectomia"
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    surgery_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Tabela: Observation (FHIR-like)
-- Foco em cicatrização, dor, fotos enviadas e análise de IA
-- ==========================================
CREATE TABLE sana_schema.observation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES sana_schema.patient(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES sana_schema.encounter(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'final',
    category VARCHAR(100) DEFAULT 'exam', -- imaging, survey, etc.
    code_text VARCHAR(255), -- Ex: "Wound Assessment", "Pain Level"
    effective_datetime TIMESTAMPTZ DEFAULT NOW(),
    
    -- Para extrações estruturadas gerenciadas pelo FHIRMapperAgent
    value_string TEXT, 
    value_integer INT, -- Ex: Nível de dor 0-10
    
    -- Multimídia (Fotos da ferida enviadas para o VisualTriageAgent)
    media_url TEXT,
    
    -- Payload cru do HL7 FHIR (se aplicável para interoperabilidade externa)
    fhir_payload JSONB,
    
    -- Metadados da IA (Risco inferido, tipo de inflamação, etc)
    ai_risk_level VARCHAR(50),
    ai_summary TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Segurança: RLS (Row Level Security)
-- ==========================================
ALTER TABLE sana_schema.patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE sana_schema.encounter ENABLE ROW LEVEL SECURITY;
ALTER TABLE sana_schema.observation ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas 
-- Requer ajuste para o modelo exato de autenticação final, mas garantimos
-- que apenas usuários autenticados da clínica ("authenticated") tenham acesso.
-- Interações via App (Service Role da API FastAPI) ignoram RLS nativamente.

CREATE POLICY "Acesso Autenticado - Patients" 
ON sana_schema.patient FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Acesso Autenticado - Encounters" 
ON sana_schema.encounter FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Acesso Autenticado - Observations" 
ON sana_schema.observation FOR ALL 
USING (auth.role() = 'authenticated');
