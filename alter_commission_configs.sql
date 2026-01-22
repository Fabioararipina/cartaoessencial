-- Adiciona a coluna de valor mínimo para saque na tabela de configurações de comissão
ALTER TABLE commission_configs
ADD COLUMN min_payout_amount DECIMAL(10,2) DEFAULT 50.00 NOT NULL;

COMMENT ON COLUMN commission_configs.min_payout_amount IS 'Valor mínimo que o parceiro precisa acumular em comissões pendentes para poder solicitar um saque.';
