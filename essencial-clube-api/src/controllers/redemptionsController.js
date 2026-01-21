const db = require('../config/database');
const crypto = require('crypto');

// Gera código único de resgate
function generateRedemptionCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// @desc    Cliente resgata um prêmio
// @route   POST /api/redemptions
// @access  Private
const createRedemption = async (req, res) => {
    const userId = req.user.id;
    const { reward_id } = req.body;

    if (!reward_id) {
        return res.status(400).json({ error: 'ID do prêmio é obrigatório.' });
    }

    try {
        await db.query('BEGIN');

        // 1. Buscar o prêmio
        const rewardResult = await db.query(
            'SELECT * FROM rewards WHERE id = $1 AND ativo = TRUE',
            [reward_id]
        );

        if (rewardResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Prêmio não encontrado ou inativo.' });
        }

        const reward = rewardResult.rows[0];

        // 2. Verificar estoque
        if (reward.estoque !== -1 && reward.estoque <= 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: 'Prêmio esgotado.' });
        }

        // 3. Verificar saldo de pontos do usuário
        const balanceResult = await db.query(`
            SELECT COALESCE(SUM(points), 0) as saldo
            FROM points_ledger
            WHERE user_id = $1
            AND expired = FALSE
            AND redeemed = FALSE
        `, [userId]);

        const saldo = parseInt(balanceResult.rows[0].saldo);

        if (saldo < reward.points_required) {
            await db.query('ROLLBACK');
            return res.status(400).json({
                error: 'Saldo insuficiente.',
                saldo_atual: saldo,
                pontos_necessarios: reward.points_required
            });
        }

        // 4. Gerar código de resgate
        const codigoResgate = generateRedemptionCode();

        // 5. Criar registro de resgate (pendente)
        const redemptionResult = await db.query(`
            INSERT INTO redemptions (user_id, reward_id, points_spent, codigo_resgate, status)
            VALUES ($1, $2, $3, $4, 'pendente')
            RETURNING *
        `, [userId, reward_id, reward.points_required, codigoResgate]);

        // 6. Atualizar estoque (se não for ilimitado)
        if (reward.estoque !== -1) {
            await db.query(
                'UPDATE rewards SET estoque = estoque - 1 WHERE id = $1',
                [reward_id]
            );
        }

        await db.query('COMMIT');

        res.status(201).json({
            message: 'Resgate solicitado com sucesso! Aguardando aprovação.',
            redemption: {
                id: redemptionResult.rows[0].id,
                codigo_resgate: codigoResgate,
                reward: reward.nome,
                points_spent: reward.points_required,
                status: 'pendente'
            }
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Erro ao criar resgate:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Listar resgates do usuário logado
// @route   GET /api/redemptions/my
// @access  Private
const getMyRedemptions = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT
                r.id,
                r.points_spent,
                r.status,
                r.codigo_resgate,
                r.observacoes,
                r.created_at,
                r.approved_at,
                rw.nome as reward_nome,
                rw.categoria as reward_categoria,
                rw.imagem_url as reward_imagem
            FROM redemptions r
            JOIN rewards rw ON r.reward_id = rw.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
        `, [userId]);

        res.json({
            redemptions: result.rows,
            total: result.rows.length
        });

    } catch (err) {
        console.error('Erro ao listar resgates:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Admin aprova ou rejeita resgate
// @route   PUT /api/redemptions/:id/approve
// @access  Private (Admin)
const approveRedemption = async (req, res) => {
    const redemptionId = req.params.id;
    const adminId = req.user.id;
    const { status, observacoes } = req.body; // status: 'aprovado' ou 'rejeitado'

    if (!status || !['aprovado', 'rejeitado'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido. Use: aprovado ou rejeitado.' });
    }

    try {
        await db.query('BEGIN');

        // 1. Buscar resgate
        const redemptionResult = await db.query(
            'SELECT * FROM redemptions WHERE id = $1',
            [redemptionId]
        );

        if (redemptionResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Resgate não encontrado.' });
        }

        const redemption = redemptionResult.rows[0];

        if (redemption.status !== 'pendente') {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: `Resgate já foi ${redemption.status}.` });
        }

        // 2. Atualizar status do resgate
        await db.query(`
            UPDATE redemptions
            SET status = $1, approved_by = $2, approved_at = NOW(), observacoes = $3
            WHERE id = $4
        `, [status, adminId, observacoes || null, redemptionId]);

        // 3. Se aprovado, deduzir pontos do usuário
        if (status === 'aprovado') {
            // Registrar dedução no ledger (pontos negativos)
            await db.query(`
                INSERT INTO points_ledger (user_id, points, type, description, expires_at)
                VALUES ($1, $2, 'redemption', $3, NOW() + INTERVAL '100 years')
            `, [redemption.user_id, -redemption.points_spent, `Resgate: ${redemption.codigo_resgate}`]);
        }

        // 4. Se rejeitado, devolver estoque
        if (status === 'rejeitado') {
            const rewardResult = await db.query('SELECT estoque FROM rewards WHERE id = $1', [redemption.reward_id]);
            if (rewardResult.rows[0].estoque !== -1) {
                await db.query(
                    'UPDATE rewards SET estoque = estoque + 1 WHERE id = $1',
                    [redemption.reward_id]
                );
            }
        }

        await db.query('COMMIT');

        res.json({
            message: `Resgate ${status} com sucesso.`,
            redemption_id: redemptionId,
            status
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Erro ao aprovar resgate:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Listar todos os resgates pendentes (Admin)
// @route   GET /api/redemptions/pending
// @access  Private (Admin)
const getPendingRedemptions = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                r.id,
                r.points_spent,
                r.status,
                r.codigo_resgate,
                r.created_at,
                u.nome as user_nome,
                u.email as user_email,
                u.cpf as user_cpf,
                rw.nome as reward_nome,
                rw.categoria as reward_categoria
            FROM redemptions r
            JOIN users u ON r.user_id = u.id
            JOIN rewards rw ON r.reward_id = rw.id
            WHERE r.status = 'pendente'
            ORDER BY r.created_at ASC
        `);

        res.json({
            pending: result.rows,
            total: result.rows.length
        });

    } catch (err) {
        console.error('Erro ao listar resgates pendentes:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    createRedemption,
    getMyRedemptions,
    approveRedemption,
    getPendingRedemptions
};
