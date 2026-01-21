const db = require('../config/database');

// @desc    Obter dados do usuário logado
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
    try {
        // O ID do usuário é adicionado ao `req` pelo middleware `verifyToken`
        const userId = req.user.id;

        const result = await db.query(
            'SELECT id, cpf, nome, email, telefone, tipo, status, nivel, total_indicacoes, created_at FROM users WHERE id = $1',
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

module.exports = {
    getMe,
};
