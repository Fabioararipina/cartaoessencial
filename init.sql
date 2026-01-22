-- Habilita a criação de UUIDs se necessário no futuro
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabela: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(11),
    senha_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'cliente' CHECK (tipo IN ('cliente', 'parceiro', 'admin', 'embaixador')),
    status VARCHAR(50) DEFAULT 'inativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
    asaas_customer_id VARCHAR(50),
    referral_code VARCHAR(20) UNIQUE,
    referred_by INT,
    nivel VARCHAR(50) DEFAULT 'bronze' CHECK (nivel IN ('bronze', 'prata', 'ouro', 'diamante')),
    total_indicacoes INT DEFAULT 0,
    fcm_token TEXT,
    last_payment TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by) REFERENCES users(id)
);

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabela: partners
CREATE TABLE partners (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    nome_estabelecimento VARCHAR(100) NOT NULL,
    cnpj VARCHAR(14),
    categoria VARCHAR(50),
    endereco TEXT,
    desconto_oferecido VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE (user_id)
);

CREATE TRIGGER update_partners_updated_at
BEFORE UPDATE ON partners
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Tabela: points_ledger
CREATE TABLE points_ledger (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    points INT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'referral', 'bonus', 'mission', 'birthday', 'redemption')),
    description VARCHAR(255),
    partner_id INT,
    transaction_value DECIMAL(10,2),
    earned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    expired BOOLEAN DEFAULT FALSE,
    renewable BOOLEAN DEFAULT TRUE,
    redeemed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (partner_id) REFERENCES partners(id)
);

CREATE INDEX idx_user_active ON points_ledger(user_id, expired, redeemed);
CREATE INDEX idx_expiration ON points_ledger(expires_at, expired);


-- Tabela: rewards
CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    points_required INT NOT NULL,
    valor_equivalente DECIMAL(10,2),
    estoque INT DEFAULT -1, -- -1 para infinito
    categoria VARCHAR(50) CHECK (categoria IN ('desconto', 'vale', 'produto', 'servico')),
    imagem_url VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_rewards_updated_at
BEFORE UPDATE ON rewards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Tabela: redemptions
CREATE TABLE redemptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    reward_id INT NOT NULL,
    points_spent INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'entregue')),
    codigo_resgate VARCHAR(20) UNIQUE,
    observacoes TEXT,
    approved_by INT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reward_id) REFERENCES rewards(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TRIGGER update_redemptions_updated_at
BEFORE UPDATE ON redemptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabela: transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    partner_id INT NOT NULL,
    user_id INT NOT NULL,
    valor_compra DECIMAL(10,2) NOT NULL,
    points_awarded INT NOT NULL,
    data_compra TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_partner_date ON transactions(partner_id, data_compra);

-- Tabela: referrals
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INT NOT NULL,
    referred_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'convertido', 'cancelado')),
    points_awarded INT DEFAULT 0,
    conversion_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id),
    UNIQUE (referrer_id, referred_id)
);

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON referrals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Tabela: notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('expiration', 'referral', 'redemption', 'promo', 'payment')),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('info', 'normal', 'important', 'critical')),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(255),
    channels JSONB,
    sent_push BOOLEAN DEFAULT FALSE,
    sent_email BOOLEAN DEFAULT FALSE,
    sent_sms BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_unread ON notifications(user_id, read_at);

-- Tabela: asaas_payments
CREATE TABLE asaas_payments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    asaas_payment_id VARCHAR(50) UNIQUE NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'received', 'overdue')),
    billing_type VARCHAR(50) CHECK (billing_type IN ('BOLETO', 'PIX', 'CREDIT_CARD')),
    due_date DATE,
    payment_date TIMESTAMPTZ,
    invoice_url TEXT,
    pix_qrcode TEXT,
    webhook_received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_asaas_status ON asaas_payments(status);

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

