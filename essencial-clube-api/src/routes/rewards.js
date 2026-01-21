const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewardsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// @route   GET /api/rewards
// @desc    Listar todos os prêmios ativos
// @access  Private
router.get('/', verifyToken, rewardsController.getRewards);

// @route   GET /api/rewards/:id
// @desc    Obter detalhes de um prêmio
// @access  Private
router.get('/:id', verifyToken, rewardsController.getRewardById);

// @route   POST /api/rewards
// @desc    Criar novo prêmio
// @access  Private (Admin)
router.post('/', [verifyToken, isAdmin], rewardsController.createReward);

// @route   PUT /api/rewards/:id
// @desc    Atualizar prêmio
// @access  Private (Admin)
router.put('/:id', [verifyToken, isAdmin], rewardsController.updateReward);

module.exports = router;
