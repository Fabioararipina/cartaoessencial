require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/config/database');

// Importar rotas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const partnerRoutes = require('./src/routes/partners');
const pointsRoutes = require('./src/routes/points');
const rewardsRoutes = require('./src/routes/rewards');
const redemptionsRoutes = require('./src/routes/redemptions');
const referralsRoutes = require('./src/routes/referrals');
const adminRoutes = require('./src/routes/admin');
const asaasRoutes = require('./src/routes/asaas'); // Importar rotas do Asaas
const payoutsRoutes = require('./src/routes/payouts'); // NOVO: Importar rotas de Payouts

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'https://cartao.primeatende.com.br'],
  credentials: true
}));
app.use(express.json()); // Para parsear JSON

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/redemptions', redemptionsRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/asaas', asaasRoutes); // Usar rotas do Asaas
app.use('/api/payouts', payoutsRoutes); // NOVO: Usar rotas de Payouts

app.get('/', (req, res) => {
  res.send('API Essencial Saúde no ar!');
});

// Teste de conexão com o banco de dados
async function testDbConnection() {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('Conexão com o banco de dados bem-sucedida:', result.rows[0]);
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err.stack);
  }
}

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  testDbConnection();
});
