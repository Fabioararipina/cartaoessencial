import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      // 401: Não autorizado (sem token, token inválido)
      // 403: Proibido (token válido, mas sem permissão)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Adiciona um parâmetro para a página de login poder mostrar uma mensagem
      const message = status === 403 ? 'Sua sessão expirou ou você não tem permissão.' : 'Por favor, faça login novamente.';
      window.location.href = `/login?message=${encodeURIComponent(message)}`;
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authService = {
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  register: (data) => api.post('/auth/register', data),
};

// ==================== USERS ====================
export const userService = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  getMyPayments: () => api.get('/users/me/payments'), // Boletos do cliente logado
  getMyTransactions: (params) => api.get('/users/me/transactions', { params }),
  getMyStatement: (params) => api.get('/users/me/statement', { params }),
  getMyCommissions: (params) => api.get('/users/me/commissions', { params }), // NOVO
};

// ==================== POINTS ====================
export const pointsService = {
  getBalance: (userId) => api.get(`/points/balance/${userId}`),
  getHistory: (userId, params) => api.get(`/points/history/${userId}`, { params }),
  getExpiring: (userId, days = 30) => api.get(`/points/expiring/${userId}`, { params: { days } }),
};

// ==================== REWARDS ====================
export const rewardsService = {
  getAll: (categoria) => api.get('/rewards', { params: { categoria } }),
  getById: (id) => api.get(`/rewards/${id}`),
  create: (data) => api.post('/rewards', data),
  update: (id, data) => api.put(`/rewards/${id}`, data),
};

// ==================== REDEMPTIONS ====================
export const redemptionsService = {
  create: (reward_id) => api.post('/redemptions', { reward_id }),
  getMy: () => api.get('/redemptions/my'),
  getPending: () => api.get('/redemptions/pending'),
  approve: (id, status, observacoes) => api.put(`/redemptions/${id}/approve`, { status, observacoes }),
};

// ==================== REFERRALS ====================
export const referralsService = {
  getMyCode: () => api.get('/referrals/my-code'),
  validate: (code) => api.post(`/referrals/validate/${code}`),
  getStats: () => api.get('/referrals/stats'),
  getLeaderboard: (limit = 10) => api.get('/referrals/leaderboard', { params: { limit } }),
};

// ==================== PARTNERS ====================
export const partnersService = {
  getAll: () => api.get('/partners'),
  getById: (id) => api.get(`/partners/${id}`),
  checkClient: (cpf) => api.get(`/partners/check-client/${cpf}`),
  getMyTransactions: (params) => api.get('/partners/my-transactions', { params }),
  getMyReferredClients: (params) => api.get('/partners/my-referred-clients', { params }), // NOVO: Relatório de comissão para parceiro
  awardPoints: (user_cpf, valor_compra) => api.post('/partners/transaction', { user_cpf, valor_compra }),
  createCharge: (data) => api.post('/asaas/charges', data),
  createSubscription: (data) => api.post('/asaas/subscriptions', data), // Assinatura de 12 meses
  createInstallment: (data) => api.post('/asaas/installments', data), // NOVO: Carnê Anual

  // Payouts
  requestPayout: () => api.post('/payouts/request'), // NOVO: Solicitar saque de comissões
  getMyPayoutRequests: (params) => api.get('/payouts/my-requests', { params }), // NOVO: Obter minhas solicitações de saque
};

// ==================== ADMIN ====================
export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  getPointsReport: (params) => api.get('/admin/reports/points', { params }),
  createPartner: (data) => api.post('/admin/partners', data),
  activateUserManually: (id) => api.post(`/admin/users/${id}/activate-manual`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Commission Configs
  createCommissionConfig: (data) => api.post('/admin/commission-configs', data),
  getCommissionConfigs: (params) => api.get('/admin/commission-configs', { params }),
  getCommissionConfigById: (id) => api.get(`/admin/commission-configs/${id}`),
  updateCommissionConfig: (id, data) => api.put(`/admin/commission-configs/${id}`, data),
  deleteCommissionConfig: (id) => api.delete(`/admin/commission-configs/${id}`),
  assignCommissionConfig: (userId, configId) => api.post(`/admin/users/${userId}/assign-commission-config`, { config_id: configId }),

  // Payouts (Saques)
  getPayouts: (status) => api.get('/admin/payouts', { params: status ? { status } : {} }),
  approvePayoutRequest: (id) => api.put(`/admin/payouts/${id}/approve`),
  rejectPayoutRequest: (id, motivo) => api.put(`/admin/payouts/${id}/reject`, { motivo }),

  // System Configs
  getSystemConfigs: () => api.get('/admin/system-configs'),
  updateSystemConfigs: (data) => api.put('/admin/system-configs', data),

  // Subscription Management
  getUserSubscriptions: (userId) => api.get(`/users/${userId}/subscriptions`),
  cancelSubscription: (subscriptionId) => api.delete(`/asaas/subscriptions/${subscriptionId}`),

  // Payments/Boletos Management
  getAllPayments: (params) => api.get('/asaas/all-payments', { params }),
  getUserPayments: (userId) => api.get(`/asaas/payments/${userId}`),
  searchUserPayments: (query) => api.get(`/asaas/payments-search`, { params: { q: query } }),
  syncUserPayments: (userId) => api.post(`/asaas/sync-payments/${userId}`),
  deletePayment: (paymentId) => api.delete(`/asaas/payments/${paymentId}`),
};

export default api;
