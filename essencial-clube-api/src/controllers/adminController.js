const db = require('../config/database');

// @desc    Dashboard com métricas do sistema
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboard = async (req, res) => {
    try {
        // Executar todas as queries em paralelo
        const [
            usersResult,
            pointsResult,
            redemptionsResult,
            partnersResult,
            recentActivityResult
        ] = await Promise.all([
            // Métricas de usuários
            db.query(`
                SELECT
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE status = 'ativo') as ativos,
                    COUNT(*) FILTER (WHERE status = 'inativo') as inativos,
                    COUNT(*) FILTER (WHERE tipo = 'cliente') as clientes,
                    COUNT(*) FILTER (WHERE tipo = 'parceiro') as parceiros
                FROM users
            `),

            // Métricas de pontos
            db.query(`
                SELECT
                    COALESCE(SUM(points) FILTER (WHERE expired = FALSE AND redeemed = FALSE AND points > 0), 0) as pontos_circulacao,
                    COALESCE(SUM(points) FILTER (WHERE expired = FALSE AND redeemed = FALSE AND points > 0
                        AND expires_at <= NOW() + INTERVAL '30 days'), 0) as expirando_30d,
                    COALESCE(SUM(points) FILTER (WHERE type = 'redemption'), 0) as pontos_resgatados
                FROM points_ledger
            `),

            // Métricas de resgates
            db.query(`
                SELECT
                    COUNT(*) as total_resgates,
                    COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
                    COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados
                FROM redemptions
            `),

            // Métricas de parceiros
            db.query(`
                SELECT
                    COUNT(*) as total_parceiros,
                    COUNT(*) FILTER (WHERE ativo = TRUE) as ativos
                FROM partners
            `),

            // Atividade recente (últimas 10 transações)
            db.query(`
                SELECT
                    t.id,
                    t.valor_compra,
                    t.points_awarded,
                    t.data_compra,
                    u.nome as cliente,
                    p.nome_estabelecimento as parceiro
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                JOIN partners p ON t.partner_id = p.id
                ORDER BY t.data_compra DESC
                LIMIT 10
            `)
        ]);

        res.json({
            usuarios: {
                total: parseInt(usersResult.rows[0].total_users),
                ativos: parseInt(usersResult.rows[0].ativos),
                inativos: parseInt(usersResult.rows[0].inativos),
                clientes: parseInt(usersResult.rows[0].clientes),
                parceiros: parseInt(usersResult.rows[0].parceiros)
            },
            pontos: {
                em_circulacao: parseInt(pointsResult.rows[0].pontos_circulacao),
                expirando_30_dias: parseInt(pointsResult.rows[0].expirando_30d),
                total_resgatados: Math.abs(parseInt(pointsResult.rows[0].pontos_resgatados))
            },
            resgates: {
                total: parseInt(redemptionsResult.rows[0].total_resgates),
                pendentes: parseInt(redemptionsResult.rows[0].pendentes),
                aprovados: parseInt(redemptionsResult.rows[0].aprovados)
            },
            parceiros: {
                total: parseInt(partnersResult.rows[0].total_parceiros),
                ativos: parseInt(partnersResult.rows[0].ativos)
            },
            atividade_recente: recentActivityResult.rows
        });

    } catch (err) {
        console.error('Erro ao carregar dashboard:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Listar todos os usuários
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = async (req, res) => {
    try {
        const { tipo, status, search } = req.query;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        let query = `
            SELECT
                u.id,
                u.cpf,
                u.nome,
                u.email,
                u.telefone,
                u.tipo,
                u.status,
                u.nivel,
                u.total_indicacoes,
                u.created_at,
                (SELECT COALESCE(SUM(points), 0)
                 FROM points_ledger
                 WHERE user_id = u.id AND expired = FALSE AND redeemed = FALSE) as saldo_pontos
            FROM users u
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (tipo) {
            query += ` AND u.tipo = $${paramIndex}`;
            params.push(tipo);
            paramIndex++;
        }

        if (status) {
            query += ` AND u.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            query += ` AND (u.nome ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.cpf LIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Count total
        let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
        const countParams = [];
        let countIndex = 1;

        if (tipo) {
            countQuery += ` AND tipo = $${countIndex}`;
            countParams.push(tipo);
            countIndex++;
        }
        if (status) {
            countQuery += ` AND status = $${countIndex}`;
            countParams.push(status);
            countIndex++;
        }
        if (search) {
            countQuery += ` AND (nome ILIKE $${countIndex} OR email ILIKE $${countIndex} OR cpf LIKE $${countIndex})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await db.query(countQuery, countParams);

        res.json({
            users: result.rows.map(u => ({
                ...u,
                saldo_pontos: parseInt(u.saldo_pontos)
            })),
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit,
                offset
            }
        });

    } catch (err) {
        console.error('Erro ao listar usuários:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Atualizar status de um usuário
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
const updateUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;

        if (!status || !['ativo', 'inativo', 'bloqueado'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido.' });
        }

        const result = await db.query(
            'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, nome, status',
            [status, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({
            message: `Status do usuário atualizado para ${status}.`,
            user: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar status:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Relatório de pontos
// @route   GET /api/admin/reports/points
// @access  Private (Admin)
const getPointsReport = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let dateFilter = '';
        const params = [];

        if (start_date && end_date) {
            dateFilter = 'AND earned_at BETWEEN $1 AND $2';
            params.push(start_date, end_date);
        }

        // Pontos por tipo
        const byTypeResult = await db.query(`
            SELECT
                type,
                COUNT(*) as quantidade,
                COALESCE(SUM(points), 0) as total_pontos
            FROM points_ledger
            WHERE 1=1 ${dateFilter}
            GROUP BY type
            ORDER BY total_pontos DESC
        `, params);

        // Pontos por parceiro (apenas compras)
        const byPartnerResult = await db.query(`
            SELECT
                p.nome_estabelecimento,
                COUNT(*) as quantidade_transacoes,
                COALESCE(SUM(pl.points), 0) as total_pontos,
                COALESCE(SUM(pl.transaction_value), 0) as valor_total
            FROM points_ledger pl
            JOIN partners p ON pl.partner_id = p.id
            WHERE pl.type = 'purchase' ${dateFilter.replace('earned_at', 'pl.earned_at')}
            GROUP BY p.id, p.nome_estabelecimento
            ORDER BY total_pontos DESC
            LIMIT 10
        `, params);

        res.json({
            por_tipo: byTypeResult.rows.map(r => ({
                ...r,
                total_pontos: parseInt(r.total_pontos)
            })),
            por_parceiro: byPartnerResult.rows.map(r => ({
                ...r,
                total_pontos: parseInt(r.total_pontos),
                valor_total: parseFloat(r.valor_total)
            }))
        });

    } catch (err) {
        console.error('Erro ao gerar relatório:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Criar novo parceiro (Admin)
// @route   POST /api/admin/partners
// @access  Private (Admin)
const createPartner = async (req, res) => {
    try {
        const { user_id, nome_estabelecimento, cnpj, categoria, endereco, desconto_oferecido } = req.body;

        if (!user_id || !nome_estabelecimento) {
            return res.status(400).json({ error: 'user_id e nome_estabelecimento são obrigatórios.' });
        }

        // Verificar se usuário existe
        const userResult = await db.query('SELECT id, tipo FROM users WHERE id = $1', [user_id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // Atualizar tipo do usuário para parceiro
        await db.query('UPDATE users SET tipo = $1 WHERE id = $2', ['parceiro', user_id]);

        // Criar registro de parceiro
        const result = await db.query(`
            INSERT INTO partners (user_id, nome_estabelecimento, cnpj, categoria, endereco, desconto_oferecido)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [user_id, nome_estabelecimento, cnpj || null, categoria || null, endereco || null, desconto_oferecido || null]);

        res.status(201).json({
            message: 'Parceiro criado com sucesso.',
            partner: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao criar parceiro:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Ativa manualmente um usuário e concede pontos de indicação
// @route   POST /api/admin/users/:id/activate-manual
// @access  Private (Admin)
const activateManualPayment = async (req, res) => {
    const userId = req.params.id;
    const client = await db.getClient(); // Usar transação para múltiplas operações

    const PONTOS_INDICACAO = {
        bronze: 200,
        prata: 250,
        ouro: 300,
        diamante: 400
    };

    try {
        await client.query('BEGIN');

        // 1. Ativar o usuário e registrar o último pagamento
        const userResult = await client.query(
            'UPDATE users SET status = $1, last_payment = NOW() WHERE id = $2 AND status != $1 RETURNING *',
            ['ativo', userId]
        );

        if (userResult.rows.length === 0) {
            // Pode ser que o usuário já estivesse ativo ou não foi encontrado
            const existingUser = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            if (existingUser.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }
            if (existingUser.rows[0].status === 'ativo') {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Usuário já está ativo.' });
            }
             // Se chegou aqui, o usuário foi encontrado mas o status não mudou. 
             // Isso pode acontecer se o UPDATE não retornar nada por alguma condição
            throw new Error('Falha ao ativar usuário. Verifique as condições.');
        }

        const activatedUser = userResult.rows[0];

        // 2. Conceder pontos de indicação se houver um indicador
        if (activatedUser.referred_by) {
            const referrerId = activatedUser.referred_by;

            // Obter dados do indicador
            const referrerResult = await client.query(
                'SELECT id, nivel, total_indicacoes FROM users WHERE id = $1',
                [referrerId]
            );

            if (referrerResult.rows.length > 0) {
                const referrer = referrerResult.rows[0];
                const pointsToAward = PONTOS_INDICACAO[referrer.nivel] || PONTOS_INDICACAO.bronze; // Default para bronze se nível não encontrado

                // Adicionar pontos ao points_ledger do indicador
                await client.query(
                    `INSERT INTO points_ledger (user_id, points, type, description, earned_at, expires_at, renewable, redeemed)
                     VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '12 months', TRUE, FALSE)`,
                    [referrerId, pointsToAward, 'referral', `Pontos por indicação do cliente ${activatedUser.nome}`]
                );

                // Incrementar total_indicacoes do indicador
                await client.query(
                    'UPDATE users SET total_indicacoes = total_indicacoes + 1 WHERE id = $1',
                    [referrerId]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Usuário ativado e pontos de indicação concedidos (se aplicável).', user: activatedUser });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao ativar usuário manualmente:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor ao ativar usuário.' });
    } finally {
        client.release();
    }
};

// @desc    Atualizar detalhes de um usuário
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
    const userId = req.params.id;
    const { nome, email, cpf, telefone, tipo, status, nivel, payout_info } = req.body; // Add payout_info

    // Build fields to update dynamically
    const fields = [];
    const params = [userId];
    let paramIndex = 2;

    if (nome !== undefined) {
        fields.push(`nome = $${paramIndex++}`);
        params.push(nome);
    }
    if (email !== undefined) {
        // Basic email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Formato de email inválido.' });
        }
        fields.push(`email = $${paramIndex++}`);
        params.push(email);
    }
    if (cpf !== undefined) {
        // Basic CPF validation (only digits, 11 characters)
        if (!/^\d{11}$/.test(cpf)) {
            return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos.' });
        }
        fields.push(`cpf = $${paramIndex++}`);
        params.push(cpf);
    }
    if (telefone !== undefined) {
        fields.push(`telefone = $${paramIndex++}`);
        params.push(telefone);
    }
    if (tipo !== undefined) {
        const validTypes = ['cliente', 'parceiro', 'admin', 'embaixador'];
        if (!validTypes.includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de usuário inválido.' });
        }
        fields.push(`tipo = $${paramIndex++}`);
        params.push(tipo);
    }
    if (status !== undefined) {
        const validStatuses = ['ativo', 'inativo', 'bloqueado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Status de usuário inválido.' });
        }
        fields.push(`status = $${paramIndex++}`);
        params.push(status);
    }
    if (nivel !== undefined) {
        const validNiveis = ['bronze', 'prata', 'ouro', 'diamante'];
        if (!validNiveis.includes(nivel)) {
            return res.status(400).json({ error: 'Nível de usuário inválido.' });
        }
        fields.push(`nivel = $${paramIndex++}`);
        params.push(nivel);
    }
    if (payout_info !== undefined) { // NOVO: Adicionar payout_info
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
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING id, nome, email, cpf, telefone, tipo, status, nivel, payout_info
        `;
        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({
            message: 'Usuário atualizado com sucesso!',
            user: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar usuário:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar usuário.' });
    }
};

// @desc    Excluir um usuário
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
    const userId = req.params.id;

    try {
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, nome', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({ message: 'Usuário excluído com sucesso!', user: result.rows[0] });

    } catch (err) {
        console.error('Erro ao excluir usuário:', err.stack);
        // Em caso de erro de FK, uma mensagem mais amigável poderia ser implementada
        // Por exemplo, verificar o código do erro e retornar uma mensagem específica
        res.status(500).json({ error: 'Erro interno do servidor ao excluir usuário.' });
    }
};

// @desc    Assign a specific commission configuration to a user
// @route   POST /api/admin/users/:id/assign-commission-config
// @access  Private (Admin)
const assignCommissionConfigToUser = async (req, res) => {
    const userId = parseInt(req.params.id);
    const { config_id } = req.body;

    if (!config_id) {
        return res.status(400).json({ error: 'config_id é obrigatório para atribuir uma configuração.' });
    }

    try {
        // 1. Verify user exists
        const userExists = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // 2. Verify commission config exists
        const configExists = await db.query('SELECT id FROM commission_configs WHERE id = $1', [config_id]);
        if (configExists.rows.length === 0) {
            return res.status(404).json({ error: 'Configuração de comissão não encontrada.' });
        }

        // 3. Insert or update user_commission_config
        const result = await db.query(
            `INSERT INTO user_commission_config (user_id, commission_config_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE
            SET commission_config_id = EXCLUDED.commission_config_id,
                assigned_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [userId, config_id]
        );

        res.json({
            message: `Configuração de comissão ${config_id} atribuída ao usuário ${userId} com sucesso.`,
            assignment: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atribuir configuração de comissão ao usuário:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor ao atribuir configuração.' });
    }
};

// @desc    Listar todas as solicitações de saque
// @route   GET /api/admin/payouts
// @access  Private (Admin)
const getAllPayoutRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        let query = `
            SELECT
                pr.*,
                u.nome as user_nome,
                u.email as user_email,
                u.tipo as user_tipo
            FROM payout_requests pr
            JOIN users u ON pr.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND pr.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY pr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Count total
        let countQuery = 'SELECT COUNT(*) FROM payout_requests WHERE 1=1';
        const countParams = [];
        if (status) {
            countQuery += ' AND status = $1';
            countParams.push(status);
        }
        const countResult = await db.query(countQuery, countParams);

        res.json({
            payoutRequests: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit,
                offset
            }
        });

    } catch (err) {
        console.error('Erro ao listar solicitações de saque:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Aprovar uma solicitação de saque
// @route   PUT /api/admin/payouts/:id/approve
// @access  Private (Admin)
const approvePayoutRequest = async (req, res) => {
    const payoutId = req.params.id;
    const adminId = req.user.id;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Verificar se a solicitação existe e está pendente
        const payoutResult = await client.query(
            'SELECT * FROM payout_requests WHERE id = $1 AND status = $2',
            [payoutId, 'pending']
        );

        if (payoutResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Solicitação de saque não encontrada ou já processada.' });
        }

        // 2. Atualizar status da solicitação para 'approved'
        await client.query(
            `UPDATE payout_requests
             SET status = 'approved', processed_by = $1, processed_at = NOW(), updated_at = NOW()
             WHERE id = $2`,
            [adminId, payoutId]
        );

        // 3. Atualizar status das comissões vinculadas para 'paid'
        await client.query(
            `UPDATE commissions
             SET status = 'paid', paid_at = NOW()
             WHERE payout_request_id = $1`,
            [payoutId]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Solicitação de saque aprovada com sucesso! As comissões foram marcadas como pagas.',
            payoutId
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao aprovar solicitação de saque:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor ao aprovar saque.' });
    } finally {
        client.release();
    }
};

// @desc    Rejeitar uma solicitação de saque
// @route   PUT /api/admin/payouts/:id/reject
// @access  Private (Admin)
const rejectPayoutRequest = async (req, res) => {
    const payoutId = req.params.id;
    const adminId = req.user.id;
    const { motivo } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Verificar se a solicitação existe e está pendente
        const payoutResult = await client.query(
            'SELECT * FROM payout_requests WHERE id = $1 AND status = $2',
            [payoutId, 'pending']
        );

        if (payoutResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Solicitação de saque não encontrada ou já processada.' });
        }

        // 2. Atualizar status da solicitação para 'rejected'
        await client.query(
            `UPDATE payout_requests
             SET status = 'rejected', processed_by = $1, processed_at = NOW(), updated_at = NOW()
             WHERE id = $2`,
            [adminId, payoutId]
        );

        // 3. Desvincular as comissões da solicitação (voltam a ficar disponíveis para novo saque)
        await client.query(
            `UPDATE commissions
             SET payout_request_id = NULL
             WHERE payout_request_id = $1`,
            [payoutId]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Solicitação de saque rejeitada. As comissões foram liberadas para nova solicitação.',
            payoutId,
            motivo: motivo || 'Não informado'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao rejeitar solicitação de saque:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor ao rejeitar saque.' });
    } finally {
        client.release();
    }
};

module.exports = {
    getDashboard,
    getUsers,
    updateUserStatus,
    getPointsReport,
    createPartner,
    activateManualPayment,
    updateUser,
    deleteUser,
    assignCommissionConfigToUser,
    getAllPayoutRequests,
    approvePayoutRequest,
    rejectPayoutRequest
};
