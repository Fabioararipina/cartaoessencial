const db = require('../config/database');

// @desc    Obter assinaturas de um usuário específico
// @route   GET /api/users/:id/subscriptions
// @access  Private (Admin)
const getUserSubscriptions = async (req, res) => {
    const { id: userId } = req.params;

    try {
        const result = await db.query(
            "SELECT * FROM asaas_subscriptions WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        
        res.json(result.rows);

    } catch (err) {
        console.error(`Erro ao buscar assinaturas para o usuário ${userId}:`, err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Obter dados do usuário logado
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
    try {
        // O ID do usuário é adicionado ao `req` pelo middleware `verifyToken`
        const userId = req.user.id;

        const result = await db.query(
            'SELECT id, cpf, nome, email, telefone, tipo, status, nivel, total_indicacoes, created_at, payout_info FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error('Erro ao buscar usuário:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Atualizar dados do usuário logado
// @route   PUT /api/users/me
// @access  Private
const updateMe = async (req, res) => {
    const userId = req.user.id;
    const { nome, email, telefone, payout_info } = req.body;

    const fields = [];
    const params = [userId];
    let paramIndex = 2;

    if (nome !== undefined) {
        fields.push(`nome = $${paramIndex++}`);
        params.push(nome);
    }
    if (email !== undefined) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Formato de email inválido.' });
        }
        fields.push(`email = $${paramIndex++}`);
        params.push(email);
    }
    if (telefone !== undefined) {
        fields.push(`telefone = $${paramIndex++}`);
        params.push(telefone);
    }
    if (payout_info !== undefined) {
        // Basic validation for payout_info if needed (e.g., must be a valid JSON object)
        if (typeof payout_info !== 'object' && payout_info !== null) {
            return res.status(400).json({ error: 'Formato de payout_info inválido. Deve ser um objeto JSON.' });
        }
        fields.push(`payout_info = $${paramIndex++}`);
        params.push(payout_info);
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo válido para atualização fornecido.' });
    }

    try {
        const query = `
            UPDATE users
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, cpf, nome, email, telefone, tipo, status, nivel, total_indicacoes, created_at, payout_info
        `;
        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({
            message: 'Dados do perfil atualizados com sucesso!',
            user: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar perfil do usuário:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar perfil.' });
    }
};

// @desc    Obter boletos/pagamentos do usuário logado
// @route   GET /api/users/me/payments
// @access  Private
const getMyPayments = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await db.query(`
            SELECT
                id,
                asaas_payment_id,
                valor,
                status,
                billing_type,
                due_date,
                payment_date,
                invoice_url,
                created_at
            FROM asaas_payments
            WHERE user_id = $1
            ORDER BY due_date ASC
        `, [userId]);

        // Agrupar por status para facilitar visualização
        const pending = result.rows.filter(p => p.status === 'pending');
        const paid = result.rows.filter(p => ['received', 'confirmed'].includes(p.status));
        const overdue = result.rows.filter(p => p.status === 'overdue');

        res.json({
            payments: result.rows,
            summary: {
                total: result.rows.length,
                pending: pending.length,
                paid: paid.length,
                overdue: overdue.length,
                totalPending: pending.reduce((sum, p) => sum + parseFloat(p.valor), 0),
                totalPaid: paid.reduce((sum, p) => sum + parseFloat(p.valor), 0)
            }
        });

    } catch (err) {
        console.error('Erro ao buscar boletos do usuário:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Obter transações/compras do usuário logado
// @route   GET /api/users/me/transactions
// @access  Private
const getMyTransactions = async (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    try {
        const result = await db.query(`
            SELECT
                t.id,
                t.valor_compra,
                t.points_awarded,
                t.data_compra,
                p.nome_estabelecimento as parceiro_nome,
                p.categoria as parceiro_categoria
            FROM transactions t
            JOIN partners p ON t.partner_id = p.id
            WHERE t.user_id = $1
            ORDER BY t.data_compra DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        const countResult = await db.query(
            'SELECT COUNT(*) as total FROM transactions WHERE user_id = $1',
            [userId]
        );

        res.json({
            transactions: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit,
                offset
            }
        });
    } catch (err) {
        console.error('Erro ao buscar transações:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Obter extrato unificado do usuário (pontos, pagamentos, resgates, compras)
// @route   GET /api/users/me/statement
// @access  Private
const getMyStatement = async (req, res) => {
    const userId = req.user.id;
    const { type } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    try {
        let entries = [];

        // 1. Pontos
        if (!type || type === 'pontos') {
            const pointsResult = await db.query(`
                SELECT
                    pl.id,
                    'pontos' as entry_type,
                    pl.points as valor,
                    pl.type as subtipo,
                    pl.description,
                    pl.earned_at as data,
                    p.nome_estabelecimento as parceiro
                FROM points_ledger pl
                LEFT JOIN partners p ON pl.partner_id = p.id
                WHERE pl.user_id = $1
                ORDER BY pl.earned_at DESC
            `, [userId]);
            entries.push(...pointsResult.rows);
        }

        // 2. Pagamentos
        if (!type || type === 'pagamentos') {
            const paymentsResult = await db.query(`
                SELECT
                    id,
                    'pagamento' as entry_type,
                    valor,
                    status as subtipo,
                    'Mensalidade Essencial Saúde' as description,
                    COALESCE(payment_date, due_date) as data,
                    NULL as parceiro
                FROM asaas_payments
                WHERE user_id = $1
                ORDER BY due_date DESC
            `, [userId]);
            entries.push(...paymentsResult.rows);
        }

        // 3. Resgates
        if (!type || type === 'resgates') {
            const redemptionsResult = await db.query(`
                SELECT
                    r.id,
                    'resgate' as entry_type,
                    r.points_spent as valor,
                    r.status as subtipo,
                    rw.nome as description,
                    r.created_at as data,
                    NULL as parceiro
                FROM redemptions r
                JOIN rewards rw ON r.reward_id = rw.id
                WHERE r.user_id = $1
                ORDER BY r.created_at DESC
            `, [userId]);
            entries.push(...redemptionsResult.rows);
        }

        // 4. Compras
        if (!type || type === 'compras') {
            const transactionsResult = await db.query(`
                SELECT
                    t.id,
                    'compra' as entry_type,
                    t.valor_compra as valor,
                    'concluida' as subtipo,
                    CONCAT('+', t.points_awarded, ' pontos') as description,
                    t.data_compra as data,
                    p.nome_estabelecimento as parceiro
                FROM transactions t
                JOIN partners p ON t.partner_id = p.id
                WHERE t.user_id = $1
                ORDER BY t.data_compra DESC
            `, [userId]);
            entries.push(...transactionsResult.rows);
        }

        // Ordenar por data (mais recente primeiro)
        entries.sort((a, b) => new Date(b.data) - new Date(a.data));

        // Aplicar paginação
        const total = entries.length;
        const paginatedEntries = entries.slice(offset, offset + limit);

        res.json({
            entries: paginatedEntries,
            pagination: { total, limit, offset }
        });
    } catch (err) {
        console.error('Erro ao buscar extrato:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    getMe,
    updateMe,
    getUserSubscriptions,
    getMyPayments,
    getMyTransactions,
    getMyStatement,
};
