const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const redemptionsController = require('../controllers/redemptionsController');
const adminCommissionConfigsRouter = require('./admin/commissionConfigs'); // Import the new commission configs router
const { verifyToken, isAdmin } = require('../middleware/auth');

// Todas as rotas de admin requerem autenticação + admin
router.use(verifyToken);
router.use(isAdmin);

// Commission Configurations routes
router.use('/commission-configs', adminCommissionConfigsRouter);

// @route   POST /api/admin/users/:id/activate-manual
// @desc    Ativa manualmente um usuário e concede pontos de indicação
// @access  Private (Admin)
router.post('/users/:id/activate-manual', adminController.activateManualPayment);

// @route   GET /api/admin/dashboard
// @desc    Dashboard com métricas do sistema
// @access  Private (Admin)
router.get('/dashboard', adminController.getDashboard);

// @route   GET /api/admin/users
// @desc    Listar todos os usuários
// @access  Private (Admin)
router.get('/users', adminController.getUsers);

// @route   PUT /api/admin/users/:id/status
// @desc    Atualizar status de um usuário
// @access  Private (Admin)
router.put('/users/:id/status', adminController.updateUserStatus);

// @route   PUT /api/admin/users/:id
// @desc    Atualizar detalhes completos de um usuário
// @access  Private (Admin)
router.put('/users/:id', adminController.updateUser);

// @route   DELETE /api/admin/users/:id
// @desc    Excluir um usuário
// @access  Private (Admin)
router.delete('/users/:id', adminController.deleteUser);

// @route   GET /api/admin/redemptions/pending
// @desc    Listar resgates pendentes
// @access  Private (Admin)
router.get('/redemptions/pending', redemptionsController.getPendingRedemptions);

// @route   GET /api/admin/reports/points
// @desc    Relatório de pontos
// @access  Private (Admin)
router.get('/reports/points', adminController.getPointsReport);

// @route   POST /api/admin/partners
// @desc    Criar novo parceiro
// @access  Private (Admin)
router.post('/partners', adminController.createPartner);

// @route   POST /api/admin/users/:id/assign-commission-config
// @desc    Assign a specific commission configuration to a user
// @access  Private (Admin)
router.post('/users/:id/assign-commission-config', adminController.assignCommissionConfigToUser);

// ============ ROTAS DE SAQUES (PAYOUTS) ============

// @route   GET /api/admin/payouts
// @desc    Listar todas as solicitações de saque
// @access  Private (Admin)
router.get('/payouts', adminController.getAllPayoutRequests);

// @route   PUT /api/admin/payouts/:id/approve
// @desc    Aprovar uma solicitação de saque
// @access  Private (Admin)
router.put('/payouts/:id/approve', adminController.approvePayoutRequest);

// @route   PUT /api/admin/payouts/:id/reject
// @desc    Rejeitar uma solicitação de saque
// @access  Private (Admin)
router.put('/payouts/:id/reject', adminController.rejectPayoutRequest);

module.exports = router;