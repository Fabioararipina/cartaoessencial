const db = require('../config/database');
const { getActiveConfigForUser } = require('../services/commissionService'); // To get min_payout_amount
const { getMyReferredClients } = require('./partnersController'); // To get summary data

// @desc    Request a payout for pending commissions
// @route   POST /api/payouts/request
// @access  Private (Partner/Ambassador)
const requestPayout = async (req, res) => {
    const userId = req.user.id; // The user making the payout request

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Get user's payout info
        const userResult = await client.query('SELECT payout_info, tipo FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const user = userResult.rows[0];

        if (!user.payout_info) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Informações de pagamento não cadastradas. Por favor, preencha seu PIX/dados bancários no seu perfil.' });
        }

        // 2. Get current pending commissions using the same logic as getMyReferredClients
        // This is a simplified call, ideally we would pass referrerId directly
        // Instead of calling another controller, we should extract the logic to a service
        // For now, let's duplicate the logic to get pending commissions or refactor getMyReferredClients
        // For now, I'll calculate it directly here.
        const summaryResult = await client.query(
            `
            SELECT
                COALESCE(SUM(c.commission_value), 0.00) as total_pending_commission
            FROM commissions c
            WHERE c.referrer_id = $1 AND c.status = 'pending'
            `,
            [userId]
        );
        const totalPendingCommission = parseFloat(summaryResult.rows[0].total_pending_commission);

        // 3. Get the minimum payout amount from the active commission config
        const config = await getActiveConfigForUser(userId, new Date()); // paymentDate doesn't matter much for min_payout
        if (!config || !config.min_payout_amount) {
            await client.query('ROLLBACK');
            return res.status(500).json({ error: 'Configuração de comissão ativa não encontrada ou sem valor mínimo de saque definido.' });
        }
        const minPayoutAmount = parseFloat(config.min_payout_amount);

        // 4. Check if pending commissions meet the minimum payout amount
        if (totalPendingCommission < minPayoutAmount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Você precisa ter pelo menos R$ ${minPayoutAmount.toFixed(2)} em comissões pendentes para solicitar um saque. Saldo atual: R$ ${totalPendingCommission.toFixed(2)}.` });
        }
        
        // 5. Create a payout request
        const payoutRequestResult = await client.query(
            `INSERT INTO payout_requests (user_id, request_amount, payout_method, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING *`,
            [userId, totalPendingCommission, user.payout_info]
        );
        const newPayoutRequest = payoutRequestResult.rows[0];

        // 6. Link pending commissions to this payout request
        await client.query(
            `UPDATE commissions
             SET payout_request_id = $1
             WHERE referrer_id = $2 AND status = 'pending'`,
            [newPayoutRequest.id, userId]
        );

        await client.query('COMMIT');
        res.status(201).json({
            message: 'Solicitação de saque criada com sucesso!',
            payoutRequest: newPayoutRequest
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao solicitar saque:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor ao solicitar saque.' });
    } finally {
        client.release();
    }
};

// @desc    Get my payout requests
// @route   GET /api/payouts/my-requests
// @access  Private (Partner/Ambassador)
const getMyPayoutRequests = async (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    try {
        const result = await db.query(
            `SELECT * FROM payout_requests
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const totalResult = await db.query(
            `SELECT COUNT(*) FROM payout_requests WHERE user_id = $1`,
            [userId]
        );
        const totalRequests = parseInt(totalResult.rows[0].count);

        res.json({
            payoutRequests: result.rows,
            total: totalRequests,
            pagination: { limit, offset }
        });

    } catch (err) {
        console.error('Erro ao listar solicitações de saque:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    requestPayout,
    getMyPayoutRequests,
};