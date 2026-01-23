const axios = require('axios');

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'; // Usar sandbox para desenvolvimento
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN; // Token para validação de webhooks

const asaasApi = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json',
  },
});

const asaasService = {
  createCustomer: async (userData) => {
    try {
      const response = await asaasApi.post('/customers', {
        name: userData.nome,
        email: userData.email,
        cpfCnpj: userData.cpf,
        phone: userData.telefone,
        // Outros campos podem ser adicionados conforme necessidade
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar cliente Asaas.');
    }
  },

  createCharge: async (customerData) => {
    try {
      const response = await asaasApi.post('/payments', {
        customer: customerData.asaas_customer_id,
        billingType: customerData.billingType || 'PIX', // PIX, BOLETO, CREDIT_CARD
        value: customerData.value,
        dueDate: customerData.dueDate, // Formato AAAA-MM-DD
        description: customerData.description,
        // notify: true, // Notificar o cliente Asaas (opcional)
        // External reference can be useful to link back to our system
        externalReference: customerData.externalReference, 
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cobrança no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar cobrança Asaas.');
    }
  },

  verifyWebhookSignature: (signature) => {
    // Asaas webhooks are validated by a token provided in the header,
    // which should match ASAAS_WEBHOOK_TOKEN.
    return signature === ASAAS_WEBHOOK_TOKEN;
  },
  
  // Função para consultar um pagamento (se necessário para a ativação manual)
  getPaymentStatus: async (paymentId) => {
    try {
      const response = await asaasApi.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao consultar status de pagamento no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao consultar pagamento Asaas.');
    }
  },

  // Criar assinatura recorrente (subscription)
  createSubscription: async (subscriptionData) => {
    try {
      const response = await asaasApi.post('/subscriptions', {
        customer: subscriptionData.asaas_customer_id,
        billingType: subscriptionData.billingType || 'UNDEFINED', // UNDEFINED permite cliente escolher
        value: subscriptionData.value,
        nextDueDate: subscriptionData.nextDueDate, // Data da primeira cobrança (AAAA-MM-DD)
        cycle: subscriptionData.cycle || 'MONTHLY', // WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY
        description: subscriptionData.description,
        maxPayments: subscriptionData.maxPayments || 12, // Número máximo de cobranças (12 meses)
        externalReference: subscriptionData.externalReference,
        // Configurações opcionais
        // discount: { value: 0, dueDateLimitDays: 0 },
        // fine: { value: 0 },
        // interest: { value: 0 }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar assinatura no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar assinatura Asaas.');
    }
  },

  // Consultar assinatura
  getSubscription: async (subscriptionId) => {
    try {
      const response = await asaasApi.get(`/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao consultar assinatura no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao consultar assinatura Asaas.');
    }
  },

  // Cancelar assinatura
  cancelSubscription: async (subscriptionId) => {
    try {
      const response = await asaasApi.delete(`/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao cancelar assinatura no Asaas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao cancelar assinatura Asaas.');
    }
  }
};

module.exports = asaasService;
