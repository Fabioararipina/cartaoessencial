const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const redemptionsController = require('../controllers/redemptionsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Todas as rotas de admin requerem autenticação + admin
router.use(verifyToken);
router.use(isAdmin);

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

module.exports = router;
