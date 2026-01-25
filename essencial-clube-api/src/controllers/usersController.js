const db = require('../config/database');
const bcrypt = require('bcrypt');
const asaasService = require('../services/asaasService');

// Helper: Buscar configuracoes do sistema
const getSystemConfig = async (key) => {
    const result = await db.query(
        'SELECT config_value FROM system_configs WHERE config_key = $1',
        [key]
    );
    return result.rows[0]?.config_value || null;
};

// Helper: Calcular valor do plano baseado na quantidade de dependentes
const calculatePlanValue = async (holderId) => {
    // Buscar configuracoes do banco
    const baseValue = parseFloat(await getSystemConfig('PLAN_BASE_VALUE')) || 49.90;
    const freeLimit = parseInt(await getSystemConfig('FREE_DEPENDENTS_LIMIT')) || 3;
    const extraValue = parseFloat(await getSystemConfig('EXTRA_DEPENDENT_VALUE')) || 9.99;

    // Contar dependentes ativos do titular
    const result = await db.query(
        `SELECT COUNT(*) FROM users WHERE holder_id = $1 AND status = 'ativo'`,
        [holderId]
    );
    const dependentCount = parseInt(result.rows[0].count);

    // Calcular dependentes extras (alem do limite gratuito)
    const extraDependents = Math.max(0, dependentCount - freeLimit);

    return {
        baseValue,
        freeLimit,
        extraValue,
        dependentCount,
        extraDependents,
        totalValue: baseValue + (extraDependents * extraValue)
    };
};

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

// @desc    Obter dependentes do usuario logado (titular)
// @route   GET /api/users/me/dependents
// @access  Private
const getMyDependents = async (req, res) => {
    const userId = req.user.id;

    try {
        // Verificar se o usuario e titular (nao e dependente de ninguem)
        const userResult = await db.query('SELECT id, holder_id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario nao encontrado.' });
        }

        const user = userResult.rows[0];

        // Se o usuario for um dependente, retornar os dependentes do titular dele
        const holderId = user.holder_id || userId;

        // Buscar dependentes
        const dependentsResult = await db.query(`
            SELECT id, cpf, nome, email, telefone, status, created_at
            FROM users
            WHERE holder_id = $1
            ORDER BY created_at ASC
        `, [holderId]);

        // Calcular valor do plano
        const planInfo = await calculatePlanValue(holderId);

        res.json({
            dependents: dependentsResult.rows,
            planInfo: {
                baseValue: planInfo.baseValue,
                freeLimit: planInfo.freeLimit,
                extraValue: planInfo.extraValue,
                currentDependents: planInfo.dependentCount,
                extraDependents: planInfo.extraDependents,
                totalValue: planInfo.totalValue,
                freeSlots: Math.max(0, planInfo.freeLimit - planInfo.dependentCount)
            }
        });
    } catch (err) {
        console.error('Erro ao buscar dependentes:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Adicionar dependente ao usuario logado
// @route   POST /api/users/me/dependents
// @access  Private
const addDependent = async (req, res) => {
    const holderId = req.user.id;
    const { cpf, nome, email, telefone, senha, parentesco } = req.body;

    if (!cpf || !nome || !email || !senha) {
        return res.status(400).json({ error: 'CPF, nome, email e senha sao obrigatorios.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Verificar se o usuario logado e titular (nao e dependente de ninguem)
        const holderResult = await client.query('SELECT id, holder_id, status FROM users WHERE id = $1', [holderId]);
        if (holderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Usuario nao encontrado.' });
        }

        const holder = holderResult.rows[0];
        if (holder.holder_id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Dependentes nao podem adicionar outros dependentes.' });
        }

        // Verificar se CPF ou email ja existem
        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1 OR cpf = $2',
            [email, cpf]
        );
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Email ou CPF ja cadastrado no sistema.' });
        }

        // Criar o dependente
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        const newDependentResult = await client.query(`
            INSERT INTO users (cpf, nome, email, telefone, senha_hash, tipo, status, holder_id)
            VALUES ($1, $2, $3, $4, $5, 'cliente', $6, $7)
            RETURNING id, cpf, nome, email, telefone, status, created_at
        `, [cpf, nome, email, telefone, hashedPassword, holder.status, holderId]);

        const newDependent = newDependentResult.rows[0];

        // Calcular novo valor do plano
        const planInfo = await calculatePlanValue(holderId);

        // Verificar se precisa regenerar o carne (se adicionou dependente extra)
        let installmentInfo = null;
        if (planInfo.extraDependents > 0) {
            // Buscar parcelas PENDING do titular
            const pendingPayments = await client.query(`
                SELECT ap.id, ap.asaas_payment_id, ap.valor, ap.due_date
                FROM asaas_payments ap
                WHERE ap.user_id = $1 AND ap.status = 'pending'
                ORDER BY ap.due_date ASC
            `, [holderId]);

            if (pendingPayments.rows.length > 0) {
                installmentInfo = {
                    needsRegeneration: true,
                    pendingPaymentsCount: pendingPayments.rows.length,
                    oldValue: pendingPayments.rows[0].valor,
                    newValue: planInfo.totalValue,
                    message: `O carne sera regenerado com ${pendingPayments.rows.length} parcelas de R$ ${planInfo.totalValue.toFixed(2)}`
                };
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Dependente adicionado com sucesso!',
            dependent: newDependent,
            planInfo: {
                baseValue: planInfo.baseValue,
                freeLimit: planInfo.freeLimit,
                extraValue: planInfo.extraValue,
                currentDependents: planInfo.dependentCount,
                extraDependents: planInfo.extraDependents,
                totalValue: planInfo.totalValue
            },
            installmentInfo
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao adicionar dependente:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

// @desc    Remover dependente
// @route   DELETE /api/users/me/dependents/:id
// @access  Private
const removeDependent = async (req, res) => {
    const holderId = req.user.id;
    const { id: dependentId } = req.params;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Verificar se o dependente pertence ao titular
        const dependentResult = await client.query(
            'SELECT id, holder_id, nome FROM users WHERE id = $1',
            [dependentId]
        );

        if (dependentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Dependente nao encontrado.' });
        }

        const dependent = dependentResult.rows[0];
        if (dependent.holder_id !== holderId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Voce nao tem permissao para remover este dependente.' });
        }

        // Remover o vinculo de dependente (nao deleta o usuario, apenas o vinculo)
        await client.query(
            'UPDATE users SET holder_id = NULL, status = $1 WHERE id = $2',
            ['inativo', dependentId]
        );

        // Calcular novo valor do plano
        const planInfo = await calculatePlanValue(holderId);

        // Verificar se precisa regenerar o carne
        let installmentInfo = null;
        const pendingPayments = await client.query(`
            SELECT ap.id, ap.asaas_payment_id, ap.valor, ap.due_date
            FROM asaas_payments ap
            WHERE ap.user_id = $1 AND ap.status = 'pending'
            ORDER BY ap.due_date ASC
        `, [holderId]);

        if (pendingPayments.rows.length > 0) {
            const currentPaymentValue = parseFloat(pendingPayments.rows[0].valor);
            if (currentPaymentValue !== planInfo.totalValue) {
                installmentInfo = {
                    needsRegeneration: true,
                    pendingPaymentsCount: pendingPayments.rows.length,
                    oldValue: currentPaymentValue,
                    newValue: planInfo.totalValue,
                    message: `O carne sera regenerado com ${pendingPayments.rows.length} parcelas de R$ ${planInfo.totalValue.toFixed(2)}`
                };
            }
        }

        await client.query('COMMIT');

        res.json({
            message: `Dependente ${dependent.nome} removido com sucesso.`,
            planInfo: {
                baseValue: planInfo.baseValue,
                freeLimit: planInfo.freeLimit,
                extraValue: planInfo.extraValue,
                currentDependents: planInfo.dependentCount,
                extraDependents: planInfo.extraDependents,
                totalValue: planInfo.totalValue
            },
            installmentInfo
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao remover dependente:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

// @desc    Obter informacoes do plano do usuario (valor, dependentes, etc)
// @route   GET /api/users/me/plan
// @access  Private
const getMyPlan = async (req, res) => {
    const userId = req.user.id;

    try {
        // Verificar se o usuario e titular ou dependente
        const userResult = await db.query('SELECT id, holder_id, status FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario nao encontrado.' });
        }

        const user = userResult.rows[0];
        const holderId = user.holder_id || userId;
        const isDependent = user.holder_id !== null;

        // Buscar dados do titular
        let holderInfo = null;
        if (isDependent) {
            const holderResult = await db.query(
                'SELECT id, nome, email FROM users WHERE id = $1',
                [user.holder_id]
            );
            if (holderResult.rows.length > 0) {
                holderInfo = holderResult.rows[0];
            }
        }

        // Calcular valor do plano
        const planInfo = await calculatePlanValue(holderId);

        res.json({
            isDependent,
            holderInfo,
            planInfo: {
                baseValue: planInfo.baseValue,
                freeLimit: planInfo.freeLimit,
                extraValue: planInfo.extraValue,
                currentDependents: planInfo.dependentCount,
                extraDependents: planInfo.extraDependents,
                totalValue: planInfo.totalValue,
                freeSlots: Math.max(0, planInfo.freeLimit - planInfo.dependentCount)
            }
        });
    } catch (err) {
        console.error('Erro ao buscar plano:', err.stack);
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
    getMyDependents,
    addDependent,
    removeDependent,
    getMyPlan,
    calculatePlanValue,
};
