-- Tabela: payout_requests
-- Armazena as solicitações de saque de comissões feitas pelos usuários (parceiros/embaixadores).
CREATE TABLE payout_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    request_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
    payout_method JSONB, -- Informações do método de pagamento (ex: chave PIX) no momento da solicitação
    processed_by INT, -- ID do admin que processou
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON payout_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Adiciona uma coluna na tabela commissions para linkar com as solicitações de saque
ALTER TABLE commissions
ADD COLUMN payout_request_id INT,
ADD CONSTRAINT fk_commissions_payout_request
FOREIGN KEY (payout_request_id) REFERENCES payout_requests(id) ON DELETE SET NULL;

COMMENT ON COLUMN commissions.payout_request_id IS 'ID da solicitação de saque à qual esta comissão foi associada.';
