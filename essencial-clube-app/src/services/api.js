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
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
  awardPoints: (user_cpf, valor_compra) => api.post('/partners/transaction', { user_cpf, valor_compra }),
};

// ==================== ADMIN ====================
export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  getPointsReport: (params) => api.get('/admin/reports/points', { params }),
  createPartner: (data) => api.post('/admin/partners', data),
};

export default api;
