const express = require('express');
const router = express.Router();
const partnersController = require('../controllers/partnersController');
const { verifyToken, isPartner } = require('../middleware/auth');

// @route   GET /api/partners
// @desc    Listar todos os parceiros ativos
// @access  Private
router.get('/', verifyToken, partnersController.getPartners);

// @route   GET /api/partners/my-transactions
// @desc    Histórico de transações do parceiro logado
// @access  Private (Partner)
router.get('/my-transactions', [verifyToken, isPartner], partnersController.getMyTransactions);

// @route   GET /api/partners/check-client/:cpf
// @desc    Verificar status de um cliente pelo CPF
// @access  Private (Partner)
router.get('/check-client/:cpf', [verifyToken, isPartner], partnersController.checkClient);

// @route   GET /api/partners/my-referred-clients
// @desc    Listar clientes indicados pelo parceiro logado
// @access  Private (Partner)
router.get('/my-referred-clients', [verifyToken, isPartner], partnersController.getMyReferredClients);

// @route   GET /api/partners/client-payments/:userId
// @desc    Buscar boletos pendentes/vencidos de um cliente (para reativacao)
// @access  Private (Partner)
router.get('/client-payments/:userId', [verifyToken, isPartner], partnersController.getClientPendingPayments);

// @route   GET /api/partners/:id
// @desc    Obter detalhes de um parceiro
// @access  Private
router.get('/:id', verifyToken, partnersController.getPartnerById);

// @route   POST /api/partners/transaction
// @desc    Parceiro lança uma transação/pontos para um cliente
// @access  Private (Partner)
router.post('/transaction', [verifyToken, isPartner], partnersController.awardPoints);

module.exports = router;
