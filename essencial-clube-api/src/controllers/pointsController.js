const db = require('../config/database');

// @desc    Obter saldo de pontos do usuário
// @route   GET /api/points/balance/:userId
// @access  Private
const getBalance = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Verifica se o usuário pode acessar esse saldo (próprio ou admin)
        if (req.user.id !== parseInt(userId) && req.user.tipo !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const result = await db.query(`
            SELECT COALESCE(SUM(points), 0) as saldo
            FROM points_ledger
            WHERE user_id = $1
            AND expired = FALSE
            AND redeemed = FALSE
        `, [userId]);

        res.json({
            user_id: parseInt(userId),
            saldo: parseInt(result.rows[0].saldo)
        });

    } catch (err) {
        console.error('Erro ao buscar saldo:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Obter extrato/histórico de pontos do usuário
// @route   GET /api/points/history/:userId
// @access  Private
const getHistory = async (req, res) => {
    try {
        const userId = req.params.userId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        // Verifica permissão
        if (req.user.id !== parseInt(userId) && req.user.tipo !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const result = await db.query(`
            SELECT
                pl.id,
                pl.points,
                pl.type,
                pl.description,
                pl.earned_at,
                pl.expires_at,
                pl.expired,
                pl.redeemed,
                p.nome_estabelecimento as parceiro
            FROM points_ledger pl
            LEFT JOIN partners p ON pl.partner_id = p.id
            WHERE pl.user_id = $1
            ORDER BY pl.earned_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        // Total de registros para paginação
        const countResult = await db.query(
            'SELECT COUNT(*) as total FROM points_ledger WHERE user_id = $1',
            [userId]
        );

        res.json({
            user_id: parseInt(userId),
            history: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit,
                offset
            }
        });

    } catch (err) {
        console.error('Erro ao buscar histórico:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Obter pontos próximos de expirar
// @route   GET /api/points/expiring/:userId
// @access  Private
const getExpiring = async (req, res) => {
    try {
        const userId = req.params.userId;
        const days = parseInt(req.query.days) || 30; // Padrão: próximos 30 dias

        // Verifica permissão
        if (req.user.id !== parseInt(userId) && req.user.tipo !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const result = await db.query(`
            SELECT
                id,
                points,
                type,
                description,
                expires_at,
                renewable
            FROM points_ledger
            WHERE user_id = $1
            AND expired = FALSE
            AND redeemed = FALSE
            AND expires_at <= NOW() + INTERVAL '1 day' * $2
            ORDER BY expires_at ASC
        `, [userId, days]);

        // Soma total expirando
        const totalResult = await db.query(`
            SELECT COALESCE(SUM(points), 0) as total_expiring
            FROM points_ledger
            WHERE user_id = $1
            AND expired = FALSE
            AND redeemed = FALSE
            AND expires_at <= NOW() + INTERVAL '1 day' * $2
        `, [userId, days]);

        res.json({
            user_id: parseInt(userId),
            days_ahead: days,
            total_expiring: parseInt(totalResult.rows[0].total_expiring),
            points: result.rows
        });

    } catch (err) {
        console.error('Erro ao buscar pontos expirando:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Renovar pontos renováveis do usuário (chamado após compra)
// @route   POST /api/points/renew/:userId
// @access  Private (Sistema/Admin)
const renewPoints = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Apenas admin ou sistema pode renovar
        if (req.user.tipo !== 'admin' && req.user.tipo !== 'parceiro') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const result = await db.query(`
            UPDATE points_ledger
            SET expires_at = NOW() + INTERVAL '12 months'
            WHERE user_id = $1
            AND renewable = TRUE
            AND expired = FALSE
            AND redeemed = FALSE
            RETURNING id
        `, [userId]);

        res.json({
            message: 'Pontos renovados com sucesso.',
            renewed_count: result.rowCount
        });

    } catch (err) {
        console.error('Erro ao renovar pontos:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    getBalance,
    getHistory,
    getExpiring,
    renewPoints
};
