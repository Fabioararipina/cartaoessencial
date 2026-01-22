--
-- Sistema de Comissões Configurável
--

-- Tabela: commission_configs
-- Armazena as diferentes regras de comissão.
CREATE TABLE commission_configs (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL,
    description TEXT,
    first_payment_type VARCHAR(20) DEFAULT 'percentage' CHECK (first_payment_type IN ('percentage', 'fixed')),
    first_payment_value DECIMAL(10,2) NOT NULL,
    recurring_payment_type VARCHAR(20) DEFAULT 'percentage' CHECK (recurring_payment_type IN ('percentage', 'fixed')),
    recurring_payment_value DECIMAL(10,2) NOT NULL,
    recurring_limit INT, -- NULL = ilimitado
    applies_to VARCHAR(50) DEFAULT 'all' CHECK (applies_to IN ('all', 'partner', 'ambassador', 'custom')),
    active BOOLEAN DEFAULT TRUE,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_commission_configs_updated_at
BEFORE UPDATE ON commission_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabela: user_commission_config
-- Relaciona um usuário a uma configuração de comissão específica.
CREATE TABLE user_commission_config (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    commission_config_id INT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (commission_config_id) REFERENCES commission_configs(id) ON DELETE CASCADE,
    UNIQUE (user_id, commission_config_id)
);

-- Tabela: commissions
-- Registra cada comissão individual gerada para auditoria e pagamento.
CREATE TABLE commissions (
    id SERIAL PRIMARY KEY,
    referrer_id INT NOT NULL,
    referred_id INT NOT NULL,
    payment_id INT NOT NULL,
    config_id INT,
    commission_value DECIMAL(10,2) NOT NULL,
    commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('first', 'recurring')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES asaas_payments(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES commission_configs(id) ON DELETE SET NULL
);

CREATE INDEX idx_commissions_referrer ON commissions(referrer_id);
CREATE INDEX idx_commissions_status ON commissions(status);
