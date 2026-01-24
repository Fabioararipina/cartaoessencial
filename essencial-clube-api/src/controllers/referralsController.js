const db = require('../config/database');
const crypto = require('crypto');

// Gera código de indicação único
function generateReferralCode(nome) {
    const prefix = nome.split(' ')[0].toLowerCase().slice(0, 5);
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${prefix}${suffix}`;
}

// Níveis e pontos por indicação
const NIVEIS = {
    bronze: { min: 0, max: 5, pontosPorIndicacao: 200 },
    prata: { min: 6, max: 15, pontosPorIndicacao: 250 },
    ouro: { min: 16, max: 30, pontosPorIndicacao: 300 },
    diamante: { min: 31, max: Infinity, pontosPorIndicacao: 400 }
};

function calcularNivel(totalIndicacoes) {
    if (totalIndicacoes >= 31) return 'diamante';
    if (totalIndicacoes >= 16) return 'ouro';
    if (totalIndicacoes >= 6) return 'prata';
    return 'bronze';
}

function getPontosIndicacao(nivel) {
    return NIVEIS[nivel]?.pontosPorIndicacao || 200;
}

// @desc    Obter código de indicação do usuário
// @route   GET /api/referrals/my-code
// @access  Private
const getMyCode = async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar usuário
        const userResult = await db.query(
            'SELECT id, nome, referral_code, nivel, total_indicacoes FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        let user = userResult.rows[0];

        // Se não tem código, gerar um
        if (!user.referral_code) {
            const newCode = generateReferralCode(user.nome);
            await db.query(
                'UPDATE users SET referral_code = $1 WHERE id = $2',
                [newCode, userId]
            );
            user.referral_code = newCode;
        }

        const pontosProximaIndicacao = getPontosIndicacao(user.nivel);

        res.json({
            referral_code: user.referral_code,
            referral_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/i/${user.referral_code}`,
            nivel: user.nivel,
            total_indicacoes: user.total_indicacoes,
            pontos_proxima_indicacao: pontosProximaIndicacao
        });

    } catch (err) {
        console.error('Erro ao obter código de indicação:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Validar código de indicação (usado no cadastro)
// @route   POST /api/referrals/validate/:code
// @access  Public
const validateCode = async (req, res) => {
    try {
        const code = req.params.code;

        const result = await db.query(
            'SELECT id, nome, referral_code FROM users WHERE referral_code = $1',
            [code]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                valid: false,
                error: 'Código de indicação não encontrado.'
            });
        }

        res.json({
            valid: true,
            referrer_id: result.rows[0].id,
            referrer_name: result.rows[0].nome.split(' ')[0] // Primeiro nome apenas
        });

    } catch (err) {
        console.error('Erro ao validar código:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Obter estatísticas de indicações do usuário
// @route   GET /api/referrals/stats
// @access  Private
const getStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Dados do usuário
        const userResult = await db.query(
            'SELECT nivel, total_indicacoes FROM users WHERE id = $1',
            [userId]
        );

        const user = userResult.rows[0];

        // Indicações feitas
        const referralsResult = await db.query(`
            SELECT
                r.id,
                r.status,
                r.points_awarded,
                r.created_at,
                r.conversion_date,
                u.nome as referred_name
            FROM referrals r
            JOIN users u ON r.referred_id = u.id
            WHERE r.referrer_id = $1
            ORDER BY r.created_at DESC
        `, [userId]);

        // Contagem por status
        const countResult = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
                COUNT(*) FILTER (WHERE status = 'convertido') as convertidos,
                COALESCE(SUM(points_awarded), 0) as total_pontos_ganhos
            FROM referrals
            WHERE referrer_id = $1
        `, [userId]);

        const counts = countResult.rows[0];
        const currentLevel = user.nivel;
        const nextLevel = currentLevel === 'bronze' ? 'prata' :
                          currentLevel === 'prata' ? 'ouro' :
                          currentLevel === 'ouro' ? 'diamante' : null;

        const indicacoesParaProximoNivel = nextLevel ?
            NIVEIS[nextLevel].min - user.total_indicacoes : 0;
            
        const pendentes = parseInt(counts.pendentes);
        const convertidos = parseInt(counts.convertidos);

        res.json({
            nivel_atual: currentLevel,
            proximo_nivel: nextLevel,
            indicacoes_para_proximo_nivel: Math.max(0, indicacoesParaProximoNivel),
            total_indicacoes: pendentes + convertidos, // Corrigido
            pendentes: pendentes,
            convertidos: convertidos,
            total_pontos_ganhos: parseInt(counts.total_pontos_ganhos),
            pontos_proxima_indicacao: getPontosIndicacao(currentLevel),
            indicacoes: referralsResult.rows
        });

    } catch (err) {
        console.error('Erro ao obter estatísticas:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Ranking de indicadores
// @route   GET /api/referrals/leaderboard
// @access  Private
const getLeaderboard = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const result = await db.query(`
            SELECT
                u.id,
                u.nome,
                u.nivel,
                u.total_indicacoes,
                (SELECT COALESCE(SUM(points_awarded), 0)
                 FROM referrals WHERE referrer_id = u.id) as pontos_indicacoes
            FROM users u
            WHERE u.total_indicacoes > 0
            ORDER BY u.total_indicacoes DESC, pontos_indicacoes DESC
            LIMIT $1
        `, [limit]);

        // Adicionar posição
        const leaderboard = result.rows.map((user, index) => ({
            posicao: index + 1,
            nome: user.nome.split(' ')[0], // Primeiro nome
            nivel: user.nivel,
            total_indicacoes: user.total_indicacoes,
            pontos_indicacoes: parseInt(user.pontos_indicacoes)
        }));

        res.json({
            leaderboard,
            total: leaderboard.length
        });

    } catch (err) {
        console.error('Erro ao obter leaderboard:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Converter indicação (chamado após primeiro pagamento)
// @route   POST /api/referrals/convert/:referredId
// @access  Private (Sistema/Admin)
const convertReferral = async (req, res) => {
    try {
        const referredId = req.params.referredId;

        await db.query('BEGIN');

        // 1. Buscar a indicação pendente
        const referralResult = await db.query(
            'SELECT * FROM referrals WHERE referred_id = $1 AND status = $2',
            [referredId, 'pendente']
        );

        if (referralResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Indicação não encontrada ou já convertida.' });
        }

        const referral = referralResult.rows[0];

        // 2. Buscar dados do indicador
        const referrerResult = await db.query(
            'SELECT id, nivel, total_indicacoes FROM users WHERE id = $1',
            [referral.referrer_id]
        );

        const referrer = referrerResult.rows[0];
        const pontosGanhos = getPontosIndicacao(referrer.nivel);

        // 3. Dar pontos ao indicador
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 2); // 24 meses

        await db.query(`
            INSERT INTO points_ledger (user_id, points, type, description, expires_at, renewable)
            VALUES ($1, $2, 'referral', $3, $4, TRUE)
        `, [referrer.id, pontosGanhos, `Indicação convertida`, expiresAt]);

        // 4. Atualizar referral
        await db.query(`
            UPDATE referrals
            SET status = 'convertido', points_awarded = $1, conversion_date = NOW()
            WHERE id = $2
        `, [pontosGanhos, referral.id]);

        // 5. Atualizar contador do indicador e verificar nível
        const novoTotal = referrer.total_indicacoes + 1;
        const novoNivel = calcularNivel(novoTotal);

        await db.query(`
            UPDATE users
            SET total_indicacoes = $1, nivel = $2
            WHERE id = $3
        `, [novoTotal, novoNivel, referrer.id]);

        // 6. Dar pontos bônus ao indicado (100 pontos)
        await db.query(`
            INSERT INTO points_ledger (user_id, points, type, description, expires_at, renewable)
            VALUES ($1, 100, 'bonus', 'Bônus de boas-vindas por indicação', $2, FALSE)
        `, [referredId, expiresAt]);

        await db.query('COMMIT');

        res.json({
            message: 'Indicação convertida com sucesso.',
            referrer_points: pontosGanhos,
            referred_bonus: 100,
            referrer_new_level: novoNivel
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Erro ao converter indicação:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    getMyCode,
    validateCode,
    getStats,
    getLeaderboard,
    convertReferral
};
