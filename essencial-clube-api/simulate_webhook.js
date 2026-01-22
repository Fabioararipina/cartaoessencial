require('dotenv').config({ path: './.env' }); // Load .env for DB connection
const asaasController = require('./src/controllers/asaasController');

const mockReq = {
    headers: {
        'asaas-access-token': process.env.ASAAS_WEBHOOK_TOKEN || 'your_webhook_token_here', // Use your actual webhook token
        'x-internal-test': 'true' // Bypass for testing
    },
    body: {
        event: 'PAYMENT_CONFIRMED',
        payment: {
            id: 'mock_asaas_payment_id_2', // Asaas payment ID we inserted
            status: 'CONFIRMED',
            value: 49.90,
            netValue: 49.90,
            installmentNumber: 1, // First payment for commission logic
            clientPaymentDate: new Date().toISOString(), // Current date
            dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0], // Next month
            // ... other payment details Asaas might send
        }
    }
};

const mockRes = {
    status: function (statusCode) {
        this.statusCode = statusCode;
        return this;
    },
    json: function (data) {
        console.log('Webhook Response (JSON):', data);
    },
    send: function (data) {
        console.log('Webhook Response (Send):', data);
    }
};

console.log('Simulating Asaas webhook for PAYMENT_CONFIRMED...');
asaasController.handleWebhook(mockReq, mockRes)
    .then(() => console.log('Webhook simulation finished.'))
    .catch((error) => console.error('Webhook simulation failed:', error));
