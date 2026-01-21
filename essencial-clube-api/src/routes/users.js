const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { verifyToken } = require('../middleware/auth');

// @route   GET api/users/me
// @desc    Obter perfil do usuário logado
// @access  Private
router.get('/me', verifyToken, usersController.getMe);

module.exports = router;
