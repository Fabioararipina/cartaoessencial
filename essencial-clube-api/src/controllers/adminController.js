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

module.exports = {
    getDashboard,
    getUsers,
    updateUserStatus,
    getPointsReport,
    createPartner
};
