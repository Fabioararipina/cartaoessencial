-- Adiciona a coluna de informações de pagamento na tabela de usuários
ALTER TABLE users
ADD COLUMN payout_info JSONB;

COMMENT ON COLUMN users.payout_info IS 'Armazena informações de pagamento do usuário (ex: chave PIX, dados bancários).';
