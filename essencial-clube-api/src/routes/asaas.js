const express = require('express');
const router = express.Router();
const asaasController = require('../controllers/asaasController');
const { verifyToken, isAdmin, isPartner } = require('../middleware/auth'); // Importar middlewares de autenticação

// Rota para webhooks do Asaas (pública, mas protegida por token interno)
router.post('/webhook', asaasController.handleWebhook);

// Rotas protegidas para criar clientes e cobranças no Asaas (apenas para Admin/Parceiro)
router.use(verifyToken); // Todas as rotas abaixo requerem autenticação
router.use((req, res, next) => { // Apenas Admin ou Parceiro podem usar estas rotas
    if (req.user && (req.user.tipo === 'admin' || req.user.tipo === 'parceiro')) {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador ou parceiro.' });
    }
});

// @route   POST /api/asaas/customers
// @desc    Cria um cliente no Asaas e salva o ID no DB
// @access  Private (Admin/Partner)
router.post('/customers', asaasController.createAsaasCustomer);

// @route   POST /api/asaas/charges
// @desc    Cria uma cobrança no Asaas
// @access  Private (Admin/Partner)
router.post('/charges', asaasController.createAsaasCharge);

// @route   POST /api/asaas/subscriptions
// @desc    Cria uma assinatura recorrente no Asaas (12 meses)
// @access  Private (Admin/Partner)
router.post('/subscriptions', asaasController.createAsaasSubscription);

// @route   POST /api/asaas/installments
// @desc    Cria um carnê (parcelamento) no Asaas
// @access  Private (Admin/Partner)
router.post('/installments', asaasController.createAsaasInstallment);

// @route   DELETE /api/asaas/subscriptions/:subscriptionId
// @desc    Cancela uma assinatura no Asaas
// @access  Private (Admin)
router.delete('/subscriptions/:subscriptionId', asaasController.cancelAsaasSubscription);

// @route   GET /api/asaas/payments-search?q=valor
// @desc    Busca pagamentos por ID, CPF ou Email
// @access  Private (Admin/Partner)
router.get('/payments-search', asaasController.searchUserPayments);

// @route   GET /api/asaas/payments/:userId
// @desc    Lista todos os boletos/pagamentos de um usuário
// @access  Private (Admin/Partner)
router.get('/payments/:userId', asaasController.getUserPayments);

// @route   GET /api/asaas/payment/:paymentId/bankslip
// @desc    Busca o link do boleto diretamente no Asaas
// @access  Private (Admin/Partner)
router.get('/payment/:paymentId/bankslip', asaasController.getPaymentBankSlip);

// @route   POST /api/asaas/sync-payments/:userId
// @desc    Sincroniza boletos de um usuário com o Asaas
// @access  Private (Admin/Partner)
router.post('/sync-payments/:userId', asaasController.syncUserPayments);

module.exports = router;
