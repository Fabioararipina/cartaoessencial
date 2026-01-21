const db = require('../config/database');

// @desc    Listar todos os prêmios ativos
// @route   GET /api/rewards
// @access  Private
const getRewards = async (req, res) => {
    try {
        const categoria = req.query.categoria;

        let query = `
            SELECT id, nome, descricao, points_required, valor_equivalente,
                   estoque, categoria, imagem_url, created_at
            FROM rewards
            WHERE ativo = TRUE
        `;
        const params = [];

        if (categoria) {
            query += ' AND categoria = $1';
            params.push(categoria);
        }

        query += ' ORDER BY points_required ASC';

        const result = await db.query(query, params);

        res.json({
            rewards: result.rows,
            total: result.rows.length
        });

    } catch (err) {
        console.error('Erro ao listar prêmios:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Obter detalhes de um prêmio
// @route   GET /api/rewards/:id
// @access  Private
const getRewardById = async (req, res) => {
    try {
        const rewardId = req.params.id;

        const result = await db.query(`
            SELECT id, nome, descricao, points_required, valor_equivalente,
                   estoque, categoria, imagem_url, ativo, created_at
            FROM rewards
            WHERE id = $1
        `, [rewardId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prêmio não encontrado.' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error('Erro ao buscar prêmio:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Criar novo prêmio
// @route   POST /api/rewards
// @access  Private (Admin)
const createReward = async (req, res) => {
    try {
        const { nome, descricao, points_required, valor_equivalente, estoque, categoria, imagem_url } = req.body;

        if (!nome || !points_required) {
            return res.status(400).json({ error: 'Nome e pontos necessários são obrigatórios.' });
        }

        const result = await db.query(`
            INSERT INTO rewards (nome, descricao, points_required, valor_equivalente, estoque, categoria, imagem_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [nome, descricao, points_required, valor_equivalente || null, estoque || -1, categoria || 'desconto', imagem_url || null]);

        res.status(201).json({
            message: 'Prêmio criado com sucesso.',
            reward: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao criar prêmio:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Atualizar prêmio
// @route   PUT /api/rewards/:id
// @access  Private (Admin)
const updateReward = async (req, res) => {
    try {
        const rewardId = req.params.id;
        const { nome, descricao, points_required, valor_equivalente, estoque, categoria, imagem_url, ativo } = req.body;

        const result = await db.query(`
            UPDATE rewards
            SET nome = COALESCE($1, nome),
                descricao = COALESCE($2, descricao),
                points_required = COALESCE($3, points_required),
                valor_equivalente = COALESCE($4, valor_equivalente),
                estoque = COALESCE($5, estoque),
                categoria = COALESCE($6, categoria),
                imagem_url = COALESCE($7, imagem_url),
                ativo = COALESCE($8, ativo)
            WHERE id = $9
            RETURNING *
        `, [nome, descricao, points_required, valor_equivalente, estoque, categoria, imagem_url, ativo, rewardId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prêmio não encontrado.' });
        }

        res.json({
            message: 'Prêmio atualizado com sucesso.',
            reward: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar prêmio:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    getRewards,
    getRewardById,
    createReward,
    updateReward
};
