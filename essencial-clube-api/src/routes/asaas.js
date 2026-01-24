const express = require('express');
const router = express.Router();
const asaasController = require('../controllers/asaasController');
const { verifyToken, isAdmin, isPartner } = require('../middleware/auth'); // Importar middlewares de autenticação

// Rota para webhooks do Asaas (pública, mas protegida por token interno)
router.post('/webhook', asaasController.handleWebhook);

// Rotas protegidas
router.use(verifyToken); // Todas as rotas abaixo requerem autenticação

// --- ROTAS SOMENTE ADMIN ---
router.delete(
    '/subscriptions/:subscriptionId', 
    isAdmin, 
    asaasController.cancelAsaasSubscription
);
router.delete(
    '/payments/:paymentId', 
    isAdmin, 
    asaasController.deletePayment
);


// --- ROTAS ADMIN E PARCEIRO ---
const isAdminOrPartner = (req, res, next) => {
    if (req.user && (req.user.tipo === 'admin' || req.user.tipo === 'parceiro')) {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador ou parceiro.' });
    }
};

// @route   POST /api/asaas/customers
// @desc    Cria um cliente no Asaas e salva o ID no DB
// @access  Private (Admin/Partner)
router.post('/customers', isAdminOrPartner, asaasController.createAsaasCustomer);

// @route   POST /api/asaas/charges
// @desc    Cria uma cobrança no Asaas
// @access  Private (Admin/Partner)
router.post('/charges', isAdminOrPartner, asaasController.createAsaasCharge);

// @route   POST /api/asaas/subscriptions
// @desc    Cria uma assinatura recorrente no Asaas (12 meses)
// @access  Private (Admin/Partner)
router.post('/subscriptions', isAdminOrPartner, asaasController.createAsaasSubscription);

// @route   POST /api/asaas/installments
// @desc    Cria um carnê (parcelamento) no Asaas
// @access  Private (Admin/Partner)
router.post('/installments', isAdminOrPartner, asaasController.createAsaasInstallment);

// @route   GET /api/asaas/payments-search?q=valor
// @desc    Busca pagamentos por ID, CPF ou Email
// @access  Private (Admin/Partner)
router.get('/payments-search', isAdminOrPartner, asaasController.searchUserPayments);

// @route   GET /api/asaas/payments/:userId
// @desc    Lista todos os boletos/pagamentos de um usuário
// @access  Private (Admin/Partner)
router.get('/payments/:userId', isAdminOrPartner, asaasController.getUserPayments);

// @route   GET /api/asaas/payment/:paymentId/bankslip
// @desc    Busca o link do boleto diretamente no Asaas
// @access  Private (Admin/Partner)
router.get('/payment/:paymentId/bankslip', isAdminOrPartner, asaasController.getPaymentBankSlip);

// @route   POST /api/asaas/sync-payments/:userId
// @desc    Sincroniza boletos de um usuário com o Asaas
// @access  Private (Admin/Partner)
router.post('/sync-payments/:userId', isAdminOrPartner, asaasController.syncUserPayments);

module.exports = router;
