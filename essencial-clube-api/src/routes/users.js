const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const userCommissionsController = require('../controllers/userCommissionsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// =============================================
// ROTAS PUBLICAS (sem autenticacao)
// =============================================

// @route   GET /api/users/public/boletos/:cpf
// @desc    Consultar boletos pendentes por CPF (publico)
// @access  Public
router.get('/public/boletos/:cpf', usersController.getPublicBoletos);

// =============================================
// ROTAS PRIVADAS (requerem autenticacao)
// =============================================

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

// Rotas de Dependentes
router.get('/me/dependents', verifyToken, usersController.getMyDependents);
router.post('/me/dependents', verifyToken, usersController.addDependent);
router.delete('/me/dependents/:id', verifyToken, usersController.removeDependent);

// Rota do Plano
router.get('/me/plan', verifyToken, usersController.getMyPlan);

module.exports = router;
