const express = require('express');
const router = express.Router();
const redemptionsController = require('../controllers/redemptionsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// @route   POST /api/redemptions
// @desc    Cliente resgata um prêmio
// @access  Private
router.post('/', verifyToken, redemptionsController.createRedemption);

// @route   GET /api/redemptions/my
// @desc    Listar resgates do usuário logado
// @access  Private
router.get('/my', verifyToken, redemptionsController.getMyRedemptions);

// @route   GET /api/redemptions/pending
// @desc    Listar resgates pendentes (Admin)
// @access  Private (Admin)
router.get('/pending', [verifyToken, isAdmin], redemptionsController.getPendingRedemptions);

// @route   PUT /api/redemptions/:id/approve
// @desc    Aprovar ou rejeitar resgate
// @access  Private (Admin)
router.put('/:id/approve', [verifyToken, isAdmin], redemptionsController.approveRedemption);

module.exports = router;
