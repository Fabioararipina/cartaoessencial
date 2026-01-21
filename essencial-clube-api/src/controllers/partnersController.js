const db = require('../config/database');

// Regra de negócio para cálculo de pontos
function calcularPontos(valorCompra) {
    return Math.floor(valorCompra / 10);
}

// @desc    Parceiro lança pontos para um cliente
// @route   POST /api/partners/transaction
// @access  Private (Partner)
const awardPoints = async (req, res) => {
    const partnerUserId = req.user.id; // ID do parceiro logado
    const { user_cpf, valor_compra } = req.body;

    if (!user_cpf || !valor_compra) {
        return res.status(400).json({ error: 'CPF do cliente e valor da compra são obrigatórios.' });
    }

    if (valor_compra <= 0) {
        return res.status(400).json({ error: 'O valor da compra deve ser positivo.' });
    }

    try {
        await db.query('BEGIN');

        // 1. Encontrar o parceiro para obter o ID da tabela 'partners'
        const partnerResult = await db.query('SELECT id FROM partners WHERE user_id = $1', [partnerUserId]);
        if (partnerResult.rows.length === 0) {
            return res.status(403).json({ error: 'Usuário logado não é um parceiro válido.' });
        }
        const partnerId = partnerResult.rows[0].id;

        // 2. Encontrar o cliente pelo CPF
        const clientResult = await db.query('SELECT id, status FROM users WHERE cpf = $1', [user_cpf]);
        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        const client = clientResult.rows[0];

        // 3. Verificar se o cliente está ativo
        if (client.status !== 'ativo') {
            // Futuramente, aqui pode entrar a lógica de gerar PIX para reativar
            return res.status(403).json({ error: `Cliente com status '${client.status}'. Lançamento de pontos não permitido.` });
        }

        // 4. Calcular os pontos
        const pointsToAward = calcularPontos(valor_compra);
        if (pointsToAward <= 0) {
            return res.status(400).json({ error: 'Valor da compra insuficiente para gerar pontos.' });
        }

        // 5. Inserir os pontos no extrato (points_ledger)
        // Regra de expiração: 12 meses a partir de hoje (conforme README)
        const expires_at = new Date();
        expires_at.setFullYear(expires_at.getFullYear() + 1);

        await db.query(
            `INSERT INTO points_ledger (user_id, points, type, description, partner_id, transaction_value, expires_at)
             VALUES ($1, $2, 'purchase', $3, $4, $5, $6)`,
            [client.id, pointsToAward, `Compra no valor de R$ ${valor_compra}`, partnerId, valor_compra, expires_at]
        );

        // 6. Registrar a transação na tabela 'transactions'
        await db.query(
            `INSERT INTO transactions (partner_id, user_id, valor_compra, points_awarded)
             VALUES ($1, $2, $3, $4)`,
            [partnerId, client.id, valor_compra, pointsToAward]
        );

        // TODO: Implementar a renovação de pontos (descrita no FLUXO 2 do README)

        await db.query('COMMIT');

        res.status(201).json({
            message: `${pointsToAward} pontos creditados com sucesso para o cliente CPF ${user_cpf}.`,
            points_awarded: pointsToAward
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Erro ao lançar pontos:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Verificar status de um cliente pelo CPF
// @route   GET /api/partners/check-client/:cpf
// @access  Private (Partner)
const checkClient = async (req, res) => {
    try {
        const cpf = req.params.cpf;

        const result = await db.query(`
            SELECT
                u.id,
                u.nome,
                u.cpf,
                u.status,
                u.nivel,
                (SELECT COALESCE(SUM(points), 0)
                 FROM points_ledger
                 WHERE user_id = u.id AND expired = FALSE AND redeemed = FALSE) as saldo_pontos
            FROM users u
            WHERE u.cpf = $1
        `, [cpf]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                found: false,
                error: 'Cliente não encontrado.'
            });
        }

        const client = result.rows[0];

        res.json({
            found: true,
            client: {
                id: client.id,
                nome: client.nome,
                cpf: client.cpf,
                status: client.status,
                nivel: client.nivel,
                saldo_pontos: parseInt(client.saldo_pontos),
                pode_lancar_pontos: client.status === 'ativo'
            }
        });

    } catch (err) {
        console.error('Erro ao verificar cliente:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Listar todos os parceiros ativos
// @route   GET /api/partners
// @access  Private
const getPartners = async (req, res) => {
    try {
        const categoria = req.query.categoria;

        let query = `
            SELECT
                p.id,
                p.nome_estabelecimento,
                p.categoria,
                p.endereco,
                p.desconto_oferecido,
                u.email,
                u.telefone
            FROM partners p
            JOIN users u ON p.user_id = u.id
            WHERE p.ativo = TRUE
        `;
        const params = [];

        if (categoria) {
            query += ' AND p.categoria = $1';
            params.push(categoria);
        }

        query += ' ORDER BY p.nome_estabelecimento ASC';

        const result = await db.query(query, params);

        res.json({
            partners: result.rows,
            total: result.rows.length
        });

    } catch (err) {
        console.error('Erro ao listar parceiros:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Obter detalhes de um parceiro
// @route   GET /api/partners/:id
// @access  Private
const getPartnerById = async (req, res) => {
    try {
        const partnerId = req.params.id;

        const result = await db.query(`
            SELECT
                p.id,
                p.nome_estabelecimento,
                p.cnpj,
                p.categoria,
                p.endereco,
                p.desconto_oferecido,
                p.ativo,
                p.created_at,
                u.nome as responsavel_nome,
                u.email,
                u.telefone
            FROM partners p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
        `, [partnerId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Parceiro não encontrado.' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error('Erro ao buscar parceiro:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Obter histórico de transações do parceiro logado
// @route   GET /api/partners/my-transactions
// @access  Private (Partner)
const getMyTransactions = async (req, res) => {
    try {
        const partnerUserId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        // Buscar o ID do parceiro
        const partnerResult = await db.query(
            'SELECT id FROM partners WHERE user_id = $1',
            [partnerUserId]
        );

        if (partnerResult.rows.length === 0) {
            return res.status(403).json({ error: 'Usuário não é um parceiro válido.' });
        }

        const partnerId = partnerResult.rows[0].id;

        const result = await db.query(`
            SELECT
                t.id,
                t.valor_compra,
                t.points_awarded,
                t.data_compra,
                u.nome as cliente_nome,
                u.cpf as cliente_cpf
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE t.partner_id = $1
            ORDER BY t.data_compra DESC
            LIMIT $2 OFFSET $3
        `, [partnerId, limit, offset]);

        // Total e soma
        const statsResult = await db.query(`
            SELECT
                COUNT(*) as total_transacoes,
                COALESCE(SUM(valor_compra), 0) as valor_total,
                COALESCE(SUM(points_awarded), 0) as pontos_total
            FROM transactions
            WHERE partner_id = $1
        `, [partnerId]);

        res.json({
            transactions: result.rows,
            stats: {
                total_transacoes: parseInt(statsResult.rows[0].total_transacoes),
                valor_total: parseFloat(statsResult.rows[0].valor_total),
                pontos_total: parseInt(statsResult.rows[0].pontos_total)
            },
            pagination: { limit, offset }
        });

    } catch (err) {
        console.error('Erro ao listar transações:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    awardPoints,
    checkClient,
    getPartners,
    getPartnerById,
    getMyTransactions
};
