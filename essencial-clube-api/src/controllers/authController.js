const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    const { cpf, nome, email, telefone, senha } = req.body;

    if (!cpf || !nome || !email || !senha) {
        return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    try {
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1 OR cpf = $2', [email, cpf]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email ou CPF já cadastrado.' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        const newUser = await db.query(
            `INSERT INTO users (cpf, nome, email, telefone, senha_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nome, email, tipo`,
            [cpf, nome, email, telefone, hashedPassword]
        );

        res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: newUser.rows[0] });

    } catch (err) {
        console.error('Erro no registro:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor ao tentar registrar usuário.' });
    }
};

const login = async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas.' }); // Usuário não encontrado
        }

        const match = await bcrypt.compare(senha, user.senha_hash);

        if (!match) {
            return res.status(401).json({ error: 'Credenciais inválidas.' }); // Senha incorreta
        }
        
        if (user.status !== 'ativo') {
            return res.status(403).json({ error: `Usuário ${user.status}. Contate o suporte.` });
        }

        const accessToken = jwt.sign(
            { id: user.id, tipo: user.tipo },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        res.json({
            message: 'Login bem-sucedido!',
            accessToken,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo,
            }
        });

    } catch (err) {
        console.error('Erro no login:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor ao tentar fazer login.' });
    }
};

module.exports = {
    register,
    login,
};
