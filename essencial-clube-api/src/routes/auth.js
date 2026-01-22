const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { optionalVerifyToken } = require('../middleware/auth'); // Importar o novo middleware

// @route   POST api/auth/register
// @desc    Registrar um novo usuário
// @access  Public (com autenticação opcional)
router.post('/register', optionalVerifyToken, authController.register);

// @route   POST api/auth/login
// @desc    Autenticar usuário e obter token
// @access  Public
router.post('/login', authController.login);

module.exports = router;
