const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asaasService = require('../services/asaasService'); // Importar asaasService

const register = async (req, res) => {
    const { cpf, nome, email, telefone, senha, tipo: requestedTipo } = req.body;

    if (!cpf || !nome || !email || !senha) {
        return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    let referred_by = null;
    let tipo = 'cliente'; // Default type

    // Check if an authenticated user is making the request
    if (req.user) {
        referred_by = req.user.id; // The authenticated user is the referrer

        // If an admin is creating the user, allow them to set the type
        if (req.user.tipo === 'admin' && requestedTipo) {
            // Validate requestedTipo to ensure it's a valid enum value
            const validTypes = ['cliente', 'parceiro', 'admin']; // Define your valid types
            if (validTypes.includes(requestedTipo)) {
                tipo = requestedTipo;
            } else {
                return res.status(400).json({ error: 'Tipo de usuário inválido fornecido.' });
            }
        } else if (req.user.tipo === 'parceiro') {
            // If a partner is creating, the new user must be a 'cliente'
            tipo = 'cliente';
        }
    }

    const client = await db.connect(); // Iniciar transação
    try {
        await client.query('BEGIN');

        const existingUser = await client.query('SELECT * FROM users WHERE email = $1 OR cpf = $2', [email, cpf]);
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Email ou CPF já cadastrado.' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        const newUserResult = await client.query(
            `INSERT INTO users (cpf, nome, email, telefone, senha_hash, tipo, referred_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, nome, email, telefone, cpf, tipo, referred_by`,
            [cpf, nome, email, telefone, hashedPassword, tipo, referred_by]
        );
        const newUser = newUserResult.rows[0];

        // Se o usuário foi indicado, criar registro na tabela de referências
        if (newUser.referred_by) {
            await client.query(
                `INSERT INTO referrals (referrer_id, referred_id, status)
                 VALUES ($1, $2, 'pendente')`,
                [newUser.referred_by, newUser.id]
            );
        }

        // A criação do cliente Asaas será feita sob demanda, não no registro inicial.
        // O asaas_customer_id será nulo inicialmente para novos usuários 'cliente'.

        await client.query('COMMIT');
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: newUser });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro no registro:', err.stack);
        const errorMessage = err.message.includes('Asaas') ? err.message : 'Erro interno do servidor ao tentar registrar usuário.';
        res.status(500).json({ error: errorMessage });
    } finally {
        client.release();
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
