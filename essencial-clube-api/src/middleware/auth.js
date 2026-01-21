const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Nenhum token fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Adiciona os dados do usuário (ex: id, tipo) ao objeto req
        next(); // Passa para a próxima rota/middleware
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expirado.' });
        }
        res.status(403).json({ error: 'Token inválido.' });
    }
};

// Opcional: Middleware para verificar se o usuário é Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.tipo === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador.' });
    }
};

const isPartner = (req, res, next) => {
    if (req.user && req.user.tipo === 'parceiro') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Requer privilégios de parceiro.' });
    }
};

module.exports = {
    verifyToken,
    isAdmin,
    isPartner
};
