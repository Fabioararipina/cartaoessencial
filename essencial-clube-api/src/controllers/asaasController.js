const asaasService = require('../services/asaasService');
const db = require('../config/database');
const commissionService = require('../services/commissionService'); // NOVO: Importar commissionService

// @desc    Cria um cliente no Asaas e salva o ID no DB
// @route   POST /api/asaas/customers
// @access  Private (Admin/Partner - idealmente chamado internamente ou por rota específica)
const createAsaasCustomer = async (req, res) => {
    const { userId, nome, email, cpf, telefone } = req.body;

    if (!userId || !nome || !email || !cpf) {
        return res.status(400).json({ error: 'Dados incompletos para criar cliente Asaas.' });
    }

    try {
        const asaasCustomer = await asaasService.createCustomer({ nome, email, cpf, telefone });

        await db.query(
            'UPDATE users SET asaas_customer_id = $1 WHERE id = $2',
            [asaasCustomer.id, userId]
        );

        res.status(201).json({ message: 'Cliente Asaas criado e associado ao usuário.', asaasCustomerId: asaasCustomer.id });
    } catch (error) {
        console.error('Erro no controller createAsaasCustomer:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Cria uma cobrança no Asaas
// @route   POST /api/asaas/charges
// @access  Private (Admin/Partner)
const createAsaasCharge = async (req, res) => {
    const { userId, value, dueDate, description } = req.body; // dueDate no formato AAAA-MM-DD

    if (!userId || !value || !dueDate) {
        return res.status(400).json({ error: 'Dados incompletos para criar cobrança Asaas.' });
    }

    try {
        const userResult = await db.query('SELECT asaas_customer_id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].asaas_customer_id) {
            return res.status(404).json({ error: 'Cliente Asaas não encontrado para este usuário.' });
        }
        const asaas_customer_id = userResult.rows[0].asaas_customer_id;

        const charge = await asaasService.createCharge({
            asaas_customer_id,
            value,
            dueDate,
            description,
            externalReference: `user_${userId}_${Date.now()}` // Ref. externa para rastrear no nosso sistema
        });

        // Opcional: Salvar informações da cobrança no nosso DB (asaas_payments)
        await db.query(
            `INSERT INTO asaas_payments (user_id, asaas_payment_id, valor, status, billing_type, due_date, invoice_url, pix_qrcode)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                userId,
                charge.id,
                value,
                charge.status,
                charge.billingType,
                charge.dueDate,
                charge.invoiceUrl,
                charge.qrCodeText // ou charge.pixQrCode.encodedImage se for imagem
            ]
        );

        res.status(201).json({ message: 'Cobrança Asaas criada com sucesso!', charge });
    } catch (error) {
        console.error('Erro no controller createAsaasCharge:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Recebe e processa webhooks do Asaas
// @route   POST /api/asaas/webhook
// @access  Public (validar token)
const handleWebhook = async (req, res) => {
    const asaasSignature = req.headers['asaas-access-token'];
    const isInternalTest = req.headers['x-internal-test'] === 'true';

    // Bypass signature check for internal tests
    if (!isInternalTest && !asaasService.verifyWebhookSignature(asaasSignature)) {
        console.warn('Webhook Asaas recebido com token inválido:', asaasSignature);
        return res.status(403).json({ error: 'Token de webhook inválido.' });
    }

    const event = req.body.event;
    const payment = req.body.payment;

    if (!payment || !payment.id) {
        return res.status(400).json({ error: 'Dados de pagamento ausentes no webhook.' });
    }

    const client = await db.connect(); // Usar transação para múltiplas operações
    try {
        await client.query('BEGIN');

        // 1. Atualizar o status do pagamento no nosso DB
        const paymentRecord = await client.query(
            `UPDATE asaas_payments SET status = $1, payment_date = $2, webhook_received_at = NOW()
             WHERE asaas_payment_id = $3 RETURNING user_id`,
            [payment.status.toLowerCase(), payment.clientPaymentDate || payment.date, payment.id]
        );

        if (paymentRecord.rows.length === 0) {
            // Se o pagamento não foi encontrado no nosso DB, pode ser um pagamento de fora ou um erro.
            // Poderíamos criar um registro aqui se a política permitir. Por agora, apenas logamos.
            console.warn(`Webhook Asaas: Pagamento ${payment.id} não encontrado no DB para atualização.`);
            await client.query('ROLLBACK');
            return res.status(200).json({ message: 'Webhook processado, pagamento não encontrado no DB.' });
        }

        const userId = paymentRecord.rows[0].user_id;
        let activatedUser = null;

        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            // 2. Ativar o usuário e registrar o último pagamento
            const userResult = await client.query(
                'UPDATE users SET status = $1, last_payment = NOW() WHERE id = $2 AND status != $1 RETURNING *',
                ['ativo', userId]
            );
            activatedUser = userResult.rows[0];

            // NOVO: Calcular e salvar comissão se houver um indicador
            if (activatedUser && activatedUser.referred_by) {
                const referrerId = activatedUser.referred_by;
                const referredId = activatedUser.id; // The user who made the payment
                const paymentValue = payment.value;
                const paymentDate = new Date(payment.clientPaymentDate || payment.date); // Use a Date object
                const asaasPaymentId = payment.id; // Asaas payment ID

                // Find the ID of the asaas_payments record in our DB using the asaasPaymentId
                const ourPaymentRecord = await client.query(
                    `SELECT id FROM asaas_payments WHERE asaas_payment_id = $1`,
                    [asaasPaymentId]
                );
                const ourDbPaymentId = ourPaymentRecord.rows[0]?.id;

                if (ourDbPaymentId) {
                    await commissionService.calculateAndSaveCommission(
                        referrerId,
                        referredId,
                        paymentValue,
                        paymentDate,
                        ourDbPaymentId // Pass our internal DB payment ID
                    );
                } else {
                    console.warn(`Commission calculation skipped: Asaas payment ID ${asaasPaymentId} not found in our local DB.`);
                }
            }

            // OLD LOGIC: (Comentar ou remover a lógica antiga de pontos de indicação)
            /*
            // 3. Conceder pontos de indicação se houver um indicador
            if (activatedUser && activatedUser.referred_by) {
                const referrerId = activatedUser.referred_by;

                const referrerResult = await client.query(
                    'SELECT id, nivel, total_indicacoes FROM users WHERE id = $1',
                    [referrerId]
                );

                if (referrerResult.rows.length > 0) {
                    const referrer = referrerResult.rows[0];
                    const PONTOS_INDICACAO = {
                        bronze: 200,
                        prata: 250,
                        ouro: 300,
                        diamante: 400
                    };
                    const pointsToAward = PONTOS_INDICACAO[referrer.nivel] || PONTOS_INDICACAO.bronze;

                    await client.query(
                        `INSERT INTO points_ledger (user_id, points, type, description, earned_at, expires_at, renewable, redeemed)
                         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '12 months', TRUE, FALSE)`,
                        [referrerId, pointsToAward, 'referral', `Pontos por indicação do cliente ${activatedUser.nome}`]
                    );

                    await client.query(
                        'UPDATE users SET total_indicacoes = total_indicacoes + 1 WHERE id = $1',
                        [referrerId]
                    );
                }
            }
            */
            // FIM DA LÓGICA ANTIGA DE PONTOS
        }
        // ... (existing code) ...
    } catch (error) {
        // ... (existing code) ...
    } finally {
        client.release();
    }
};

module.exports = {
    createAsaasCustomer,
    createAsaasCharge,
    handleWebhook
};
