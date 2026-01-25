const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const userCommissionsController = require('../controllers/userCommissionsController'); // NEW
const { verifyToken, isAdmin } = require('../middleware/auth');

// @route   GET /api/users/:id/subscriptions
// @desc    Obter assinaturas de um usuário (apenas admin)
// @access  Private (Admin)
router.get('/:id/subscriptions', verifyToken, isAdmin, usersController.getUserSubscriptions);

// @route   GET api/users/me
// @desc    Obter perfil do usuário logado
// @access  Private
router.get('/me', verifyToken, usersController.getMe);

// @route   PUT api/users/me
// @desc    Atualizar perfil do usuário logado
// @access  Private
router.put('/me', verifyToken, usersController.updateMe);

// @route   GET api/users/me/payments
// @desc    Obter boletos/pagamentos do usuário logado
// @access  Private
router.get('/me/payments', verifyToken, usersController.getMyPayments);

router.get('/me/transactions', verifyToken, usersController.getMyTransactions);
router.get('/me/statement', verifyToken, usersController.getMyStatement);

// NEW: Route for user's commissions report
router.get('/me/commissions', verifyToken, userCommissionsController.getMyCommissions);

module.exports = router;
