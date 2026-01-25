-- =============================================================
-- MIGRATION: Sistema de Dependentes do Cartao
-- =============================================================

-- FASE 1.1: Adicionar coluna holder_id na tabela users
-- holder_id NULL = Titular, holder_id = X = Dependente do usuario X

ALTER TABLE users ADD COLUMN IF NOT EXISTS holder_id INT REFERENCES users(id) ON DELETE SET NULL;

-- Criar indice para melhor performance nas buscas de dependentes
CREATE INDEX IF NOT EXISTS idx_users_holder_id ON users(holder_id);

-- =============================================================
-- FASE 1.2: Adicionar configuracoes do plano em system_configs
-- =============================================================

INSERT INTO system_configs (config_key, config_value, description) VALUES
('PLAN_BASE_VALUE', '49.90', 'Valor da mensalidade do plano (inclui titular + dependentes gratuitos)'),
('FREE_DEPENDENTS_LIMIT', '3', 'Quantidade de dependentes gratuitos inclusos no plano'),
('EXTRA_DEPENDENT_VALUE', '9.99', 'Valor adicional por dependente extra (alem do limite gratuito)'),
('INSTALLMENT_COUNT', '12', 'Quantidade de parcelas do carne anual')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =============================================================
-- Verificacao: Listar configuracoes inseridas
-- =============================================================
-- SELECT * FROM system_configs WHERE config_key IN ('PLAN_BASE_VALUE', 'FREE_DEPENDENTS_LIMIT', 'EXTRA_DEPENDENT_VALUE', 'INSTALLMENT_COUNT', 'CANCELLATION_FEE_PERCENTAGE');
