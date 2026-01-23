-- Tabela para rastrear assinaturas do Asaas
CREATE TABLE IF NOT EXISTS asaas_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    asaas_subscription_id VARCHAR(50) UNIQUE NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    ciclo VARCHAR(20) DEFAULT 'MONTHLY', -- MONTHLY, YEARLY, etc.
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, EXPIRED
    billing_type VARCHAR(20), -- PIX, BOLETO, CREDIT_CARD, UNDEFINED
    next_due_date DATE,
    max_payments INT DEFAULT 12,
    payments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP
);

-- Índice para buscar assinaturas por usuário
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON asaas_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON asaas_subscriptions(status);
