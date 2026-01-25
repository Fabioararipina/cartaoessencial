const db = require('../config/database');
const { getActiveConfigForUser } = require('../services/commissionService');

// @desc    Listar clientes indicados pelo usuário logado com dados de comissão
// @route   GET /api/users/me/commissions
// @access  Private (User/Client)
const getMyCommissions = async (req, res) => {
    try {
        const referrerId = req.user.id; // ID do usuário logado (cliente/parceiro)
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // SQL para buscar referências e suas comissões agregadas
        const referralsWithCommissionsResult = await db.query(
            `
            SELECT
                u.id as client_id,
                u.nome as client_name,
                u.cpf as client_cpf,
                u.status as client_status,
                r.created_at as referral_date,
                r.conversion_date as first_payment_date,
                COALESCE(COUNT(c.id), 0) as total_commissions_entries, -- number of commission records
                COALESCE(SUM(CASE WHEN c.commission_type = 'first' THEN c.commission_value ELSE 0 END), 0.00) as first_payment_commission,
                COALESCE(SUM(CASE WHEN c.commission_type = 'recurring' THEN c.commission_value ELSE 0 END), 0.00) as recurring_commission,
                COALESCE(SUM(c.commission_value), 0.00) as total_commission_value,
                MAX(c.created_at) as last_commission_date -- last time a commission was recorded for this client
            FROM referrals r
            INNER JOIN users u ON r.referred_id = u.id
            LEFT JOIN commissions c ON c.referred_id = u.id AND c.referrer_id = r.referrer_id
            WHERE r.referrer_id = $1
            GROUP BY u.id, u.nome, u.cpf, u.status, r.created_at, r.conversion_date
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
            `,
            [referrerId, limit, offset]
        );

        // Fetch detailed payments for each referred client to match the desired output structure
        const referredClients = [];
        for (const clientRow of referralsWithCommissionsResult.rows) {
            const clientPaymentsResult = await db.query(
                `SELECT
                    ap.payment_date as date,
                    ap.valor as value,
                    c.commission_value as commission,
                    c.commission_type as type
                FROM asaas_payments ap
                INNER JOIN commissions c ON c.payment_id = ap.id
                WHERE c.referred_id = $1 AND c.referrer_id = $2
                ORDER BY ap.payment_date DESC`,
                [clientRow.client_id, referrerId]
            );

            referredClients.push({
                client_id: clientRow.client_id,
                client_name: clientRow.client_name,
                client_cpf: clientRow.client_cpf,
                client_status: clientRow.client_status,
                referral_date: clientRow.referral_date,
                first_payment_date: clientRow.first_payment_date,
                total_payments: clientPaymentsResult.rows.length, // Count of payments that generated commission
                first_commission: parseFloat(clientRow.first_payment_commission),
                recurring_commission: parseFloat(clientRow.recurring_commission),
                total_commission: parseFloat(clientRow.total_commission_value),
                last_payment_date: clientRow.last_commission_date,
                payments: clientPaymentsResult.rows.map(p => ({
                    date: p.date,
                    value: parseFloat(p.value),
                    commission: parseFloat(p.commission),
                    type: p.type
                }))
            });
        }

        // Calculate summary for the referrer
        const summaryResult = await db.query(
            `
            SELECT
                COALESCE(COUNT(DISTINCT r.referred_id), 0) as total_referrals,
                COALESCE(COUNT(DISTINCT CASE WHEN u.status = 'ativo' THEN r.referred_id ELSE NULL END), 0) as active_referrals,
                COALESCE(SUM(c.commission_value), 0.00) as total_commission,
                COALESCE(SUM(CASE WHEN c.commission_type = 'first' THEN c.commission_value ELSE 0 END), 0.00) as first_payment_commission,
                COALESCE(SUM(CASE WHEN c.commission_type = 'recurring' THEN c.commission_value ELSE 0 END), 0.00) as recurring_commission,
                COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.commission_value ELSE 0 END), 0.00) as pending_commission,
                COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.commission_value ELSE 0 END), 0.00) as paid_commission
            FROM referrals r
            LEFT JOIN users u ON r.referred_id = u.id
            LEFT JOIN commissions c ON c.referrer_id = r.referrer_id AND c.referred_id = u.id
            WHERE r.referrer_id = $1
            `,
            [referrerId]
        );

        const config = await getActiveConfigForUser(referrerId, new Date());
        const minPayoutAmount = config ? parseFloat(config.min_payout_amount) : 0;

        const summary = {
            total_referrals: parseInt(summaryResult.rows[0].total_referrals),
            active_referrals: parseInt(summaryResult.rows[0].active_referrals),
            total_commission: parseFloat(summaryResult.rows[0].total_commission),
            first_payment_commission: parseFloat(summaryResult.rows[0].first_payment_commission),
            recurring_commission: parseFloat(summaryResult.rows[0].recurring_commission),
            pending_commission: parseFloat(summaryResult.rows[0].pending_commission),
            paid_commission: parseFloat(summaryResult.rows[0].paid_commission),
            min_payout_amount: minPayoutAmount,
        };

        const totalClientsResult = await db.query(`SELECT COUNT(DISTINCT referred_id) FROM referrals WHERE referrer_id = $1`, [referrerId]);
        const totalClients = parseInt(totalClientsResult.rows[0].count);


        res.json({
            summary,
            referrals: referredClients,
            pagination: { limit, offset, total: totalClients }
        });

    } catch (err) {
        console.error('Erro ao listar comissões do usuário:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    getMyCommissions,
};
