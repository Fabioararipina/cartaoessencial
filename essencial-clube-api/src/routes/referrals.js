const express = require('express');
const router = express.Router();
const referralsController = require('../controllers/referralsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// @route   GET /api/referrals/my-code
// @desc    Obter código de indicação do usuário
// @access  Private
router.get('/my-code', verifyToken, referralsController.getMyCode);

// @route   POST /api/referrals/validate/:code
// @desc    Validar código de indicação
// @access  Public (usado no cadastro)
router.post('/validate/:code', referralsController.validateCode);

// @route   GET /api/referrals/stats
// @desc    Obter estatísticas de indicações
// @access  Private
router.get('/stats', verifyToken, referralsController.getStats);

// @route   GET /api/referrals/leaderboard
// @desc    Ranking de indicadores
// @access  Private
router.get('/leaderboard', verifyToken, referralsController.getLeaderboard);

// @route   POST /api/referrals/convert/:referredId
// @desc    Converter indicação (após pagamento)
// @access  Private (Admin/Sistema)
router.post('/convert/:referredId', [verifyToken, isAdmin], referralsController.convertReferral);

module.exports = router;
