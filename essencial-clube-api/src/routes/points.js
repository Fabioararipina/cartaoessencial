const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');
const { verifyToken } = require('../middleware/auth');

// @route   GET /api/points/balance/:userId
// @desc    Obter saldo de pontos
// @access  Private
router.get('/balance/:userId', verifyToken, pointsController.getBalance);

// @route   GET /api/points/history/:userId
// @desc    Obter extrato de pontos
// @access  Private
router.get('/history/:userId', verifyToken, pointsController.getHistory);

// @route   GET /api/points/expiring/:userId
// @desc    Obter pontos próximos de expirar
// @access  Private
router.get('/expiring/:userId', verifyToken, pointsController.getExpiring);

// @route   POST /api/points/renew/:userId
// @desc    Renovar pontos renováveis
// @access  Private (Admin/Parceiro)
router.post('/renew/:userId', verifyToken, pointsController.renewPoints);

module.exports = router;
