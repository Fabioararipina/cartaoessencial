# ESSENCIAL SAÚDE - Sistema de Pontos e Benefícios

## 📋 VISÃO GERAL

Sistema de fidelidade para cartão de benefícios de saúde com mecânica de gamificação, programa de indicações e rede de parceiros.

**Objetivo:** Reduzir inadimplência através de uso frequente, viralização por indicação e benefícios do dia a dia.

**MVP:** 15 dias de desenvolvimento

---

## 🎯 FUNCIONALIDADES PRINCIPAIS

### **CORE (Prioridade MVP)**
1. ✅ Sistema de pontos (ganho, expiração, resgate)
2. ✅ Cadastro e autenticação de usuários
3. ✅ Painel do parceiro (lançamento de pontos)
4. ✅ Painel do cliente (saldo, extrato, prêmios)
5. ✅ Sistema de indicação (link único, tracking)
6. ✅ Integração Asaas (pagamentos, webhooks)
7. ✅ Notificações (Push + Email)
8. ✅ Catálogo de prêmios e resgates

### **DIFERENCIAIS**
- Sistema de expiração inteligente (12 meses renovável)
- Reativação automática via Pix (cliente inativo paga na hora)
- Programa de embaixadores (afiliados)
- Gamificação (níveis, badges, missões)

---

## 🏗️ ARQUITETURA

### **TIPO DE APLICAÇÃO**
**PWA (Progressive Web App)**
- Site responsivo que funciona como app
- Instalável na tela inicial
- Push notifications
- Funciona offline (parcial)

### **STACK TECNOLÓGICA**

**Backend:**
```
- Node.js v18+
- Express.js (API REST)
- PostgreSQL (banco de dados)
- JWT (autenticação)
- BullMQ + Redis (filas de notificação)
```

**Frontend:**
```
- React 18
- Vite (build)
- Tailwind CSS (estilização)
- React Router (rotas)
- Axios (HTTP client)
- Firebase SDK (push notifications)
```

**Integrações:**
```
- Asaas API (pagamentos)
- Firebase Cloud Messaging (push)
- Resend (email)
- QR Code generator
```

**Hospedagem (sugestão):**
```
- Backend: Railway.app (grátis inicialmente)
- Frontend: Vercel (grátis)
- Banco: Railway PostgreSQL (grátis 500MB)
- Redis: Upstash (grátis 10k comandos/dia)
```

---

## 🗄️ DATABASE SCHEMA

### **Tabela: users**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(11),
    senha_hash VARCHAR(255) NOT NULL,
    tipo ENUM('cliente', 'parceiro', 'admin', 'embaixador') DEFAULT 'cliente',
    status ENUM('ativo', 'inativo', 'bloqueado') DEFAULT 'inativo',
    asaas_customer_id VARCHAR(50),
    referral_code VARCHAR(20) UNIQUE,
    referred_by INT,
    nivel ENUM('bronze', 'prata', 'ouro', 'diamante') DEFAULT 'bronze',
    total_indicacoes INT DEFAULT 0,
    fcm_token TEXT,
    last_payment TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by) REFERENCES users(id)
);
```

### **Tabela: partners**
```sql
CREATE TABLE partners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    nome_estabelecimento VARCHAR(100) NOT NULL,
    cnpj VARCHAR(14),
    categoria VARCHAR(50),
    endereco TEXT,
    desconto_oferecido VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### **Tabela: points_ledger**
```sql
CREATE TABLE points_ledger (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    points INT NOT NULL,
    type ENUM('purchase', 'referral', 'bonus', 'mission', 'birthday', 'redemption') NOT NULL,
    description VARCHAR(255),
    partner_id INT,
    transaction_value DECIMAL(10,2),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    expired BOOLEAN DEFAULT FALSE,
    renewable BOOLEAN DEFAULT TRUE,
    redeemed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (partner_id) REFERENCES partners(id),
    INDEX idx_user_active (user_id, expired, redeemed),
    INDEX idx_expiration (expires_at, expired)
);
```

### **Tabela: rewards**
```sql
CREATE TABLE rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    points_required INT NOT NULL,
    valor_equivalente DECIMAL(10,2),
    estoque INT DEFAULT -1,
    categoria ENUM('desconto', 'vale', 'produto', 'servico'),
    imagem_url VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabela: redemptions**
```sql
CREATE TABLE redemptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    reward_id INT NOT NULL,
    points_spent INT NOT NULL,
    status ENUM('pendente', 'aprovado', 'rejeitado', 'entregue') DEFAULT 'pendente',
    codigo_resgate VARCHAR(20) UNIQUE,
    observacoes TEXT,
    approved_by INT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reward_id) REFERENCES rewards(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

### **Tabela: transactions**
```sql
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    partner_id INT NOT NULL,
    user_id INT NOT NULL,
    valor_compra DECIMAL(10,2) NOT NULL,
    points_awarded INT NOT NULL,
    data_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_partner_date (partner_id, data_compra)
);
```

### **Tabela: referrals**
```sql
CREATE TABLE referrals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referrer_id INT NOT NULL,
    referred_id INT NOT NULL,
    status ENUM('pendente', 'convertido', 'cancelado') DEFAULT 'pendente',
    points_awarded INT DEFAULT 0,
    conversion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id),
    UNIQUE KEY unique_referral (referrer_id, referred_id)
);
```

### **Tabela: notifications**
```sql
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('expiration', 'referral', 'redemption', 'promo', 'payment') NOT NULL,
    priority ENUM('info', 'normal', 'important', 'critical') DEFAULT 'normal',
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(255),
    channels JSON,
    sent_push BOOLEAN DEFAULT FALSE,
    sent_email BOOLEAN DEFAULT FALSE,
    sent_sms BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_unread (user_id, read_at)
);
```

### **Tabela: asaas_payments**
```sql
CREATE TABLE asaas_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    asaas_payment_id VARCHAR(50) UNIQUE NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'received', 'overdue') DEFAULT 'pending',
    billing_type ENUM('BOLETO', 'PIX', 'CREDIT_CARD'),
    due_date DATE,
    payment_date TIMESTAMP,
    invoice_url TEXT,
    pix_qrcode TEXT,
    webhook_received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_status (status)
);
```

---

## 🔌 API ENDPOINTS

### **AUTENTICAÇÃO**

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/forgot-password
```

### **USUÁRIOS**

```
GET    /api/users/me
PUT    /api/users/me
GET    /api/users/:id/points
GET    /api/users/:id/points/history
GET    /api/users/referral-stats
```

### **PONTOS**

```
POST   /api/points/award           # Parceiro lança pontos
GET    /api/points/balance/:userId
GET    /api/points/expiring/:userId
POST   /api/points/renew/:userId   # Renovação automática
```

### **PARCEIROS**

```
GET    /api/partners
GET    /api/partners/:id
POST   /api/partners              # Admin cria parceiro
PUT    /api/partners/:id
POST   /api/partners/transaction  # Parceiro lança venda
```

### **PRÊMIOS**

```
GET    /api/rewards
GET    /api/rewards/:id
POST   /api/rewards               # Admin cria prêmio
POST   /api/redemptions           # Cliente resgata
GET    /api/redemptions/my
PUT    /api/redemptions/:id/approve  # Admin aprova
```

### **INDICAÇÕES**

```
GET    /api/referrals/my-code
POST   /api/referrals/validate/:code
GET    /api/referrals/stats
GET    /api/referrals/leaderboard
```

### **ASAAS (Webhooks e Gestão)**

```
POST   /api/asaas/webhook         # Recebe eventos do Asaas
POST   /api/asaas/create-charge   # Gera cobrança sob demanda
GET    /api/asaas/sync-customers  # Importa clientes do Asaas
GET    /api/asaas/payment-status/:userId
```

### **NOTIFICAÇÕES**

```
GET    /api/notifications
PUT    /api/notifications/:id/read
POST   /api/notifications/register-token  # FCM token
```

### **ADMIN**

```
GET    /api/admin/dashboard
GET    /api/admin/users
GET    /api/admin/redemptions/pending
PUT    /api/admin/users/:id/status
GET    /api/admin/reports/points
```

---

## 🔗 INTEGRAÇÕES

### **1. ASAAS (Pagamentos)**

**Credenciais necessárias:**
```env
ASAAS_API_KEY=sua_chave_aqui
ASAAS_WEBHOOK_TOKEN=token_seguro_webhook
```

**Fluxos principais:**

**A) Importar clientes existentes:**
```javascript
GET https://api.asaas.com/v3/customers
Headers: { access_token: ASAAS_API_KEY }
```

**B) Criar cobrança sob demanda:**
```javascript
POST https://api.asaas.com/v3/payments
Body: {
  customer: asaas_customer_id,
  billingType: "PIX",
  value: 49.90,
  dueDate: "2026-02-01"
}
Response: { id, invoiceUrl, pixQrCodeData }
```

**C) Webhook de confirmação:**
```javascript
POST /api/asaas/webhook
Body: {
  event: "PAYMENT_CONFIRMED",
  payment: { id, customer, value, paymentDate }
}

Ação: 
1. Marcar user.status = 'ativo'
2. Atualizar user.last_payment = NOW()
3. Se referral: dar 200 pontos ao indicador
```

**D) Configurar webhook no Asaas:**
```
URL: https://seudominio.com/api/asaas/webhook
Eventos: PAYMENT_CONFIRMED, PAYMENT_OVERDUE
Token: ASAAS_WEBHOOK_TOKEN
```

### **2. FIREBASE (Push Notifications)**

**Setup:**
```bash
npm install firebase firebase-admin
```

**Credenciais:**
```env
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_PRIVATE_KEY=chave_privada
FIREBASE_CLIENT_EMAIL=email@projeto.iam.gserviceaccount.com
```

**Frontend (registrar token):**
```javascript
import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging();
const token = await getToken(messaging, { 
  vapidKey: 'SUA_VAPID_KEY' 
});

// Enviar token pro backend
await axios.post('/api/notifications/register-token', { token });
```

**Backend (enviar push):**
```javascript
const admin = require('firebase-admin');

await admin.messaging().send({
  token: userFcmToken,
  notification: {
    title: '⚠️ Pontos expiram em 7 dias!',
    body: 'Você tem 150 pontos. Resgate agora!'
  },
  data: { 
    type: 'expiration',
    url: '/premios' 
  }
});
```

### **3. RESEND (Email)**

**Setup:**
```bash
npm install resend
```

**Credenciais:**
```env
RESEND_API_KEY=re_sua_chave
RESEND_FROM_EMAIL=contato@essencialclube.com.br
```

**Enviar email:**
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: user.email,
  subject: '⚠️ Seus pontos expiram em 7 dias!',
  html: templateHTML
});
```

---

## 📱 FLUXOS PRINCIPAIS

### **FLUXO 1: Cadastro via Indicação**

```
1. Cliente A compartilha link: /i/fabio123
2. Cliente B acessa link
3. Sistema registra: referred_by = Cliente A
4. Cliente B preenche cadastro
5. Sistema cria cliente no Asaas via API
6. Asaas gera cobrança (Pix/Boleto)
7. Cliente B paga
8. Webhook Asaas → Sistema marca B como ativo
9. Sistema dá 200 pontos pra Cliente A
10. Sistema dá 100 pontos bônus pra Cliente B
11. Push notification pra A: "João virou cliente! +200 pontos"
```

### **FLUXO 2: Lançamento de Pontos (Parceiro)**

```
1. Parceiro faz login
2. Acessa tela "Lançar Pontos"
3. Digita CPF do cliente
4. Sistema verifica:
   - Cliente existe? SIM
   - Cliente está ativo? SIM
5. Parceiro digita valor da compra: R$ 100,00
6. Sistema calcula: 100 ÷ 10 = 10 pontos
7. Salva em points_ledger:
   - points: 10
   - type: 'purchase'
   - expires_at: NOW() + 12 meses
   - renewable: true
8. Salva em transactions
9. Push pro cliente: "Você ganhou 10 pontos no Supermercado X!"
10. Renova todos pontos renováveis do cliente (expires_at = NOW() + 12m)
```

### **FLUXO 3: Cliente Inativo Quer Usar**

```
1. Cliente vai no parceiro (está inadimplente)
2. Parceiro digita CPF
3. Sistema retorna: status = 'inativo'
4. Sistema gera cobrança Asaas (Pix)
5. Retorna QR Code
6. Parceiro mostra QR pro cliente
7. Cliente paga via Pix
8. Webhook Asaas (5-30 segundos)
9. Sistema ativa cliente
10. Parceiro consulta CPF novamente
11. Agora status = 'ativo'
12. Lançamento de pontos liberado
```

### **FLUXO 4: Resgate de Prêmio**

```
1. Cliente acessa catálogo de prêmios
2. Escolhe: "Vale-compras R$ 50 (500 pontos)"
3. Sistema verifica saldo: 650 pontos (OK)
4. Cliente confirma resgate
5. Sistema:
   - Cria registro em redemptions (status: pendente)
   - Gera código único: ABC123XYZ
   - NÃO deduz pontos ainda (só após aprovação)
6. Notifica admin: "Novo resgate pendente"
7. Admin aprova
8. Sistema:
   - Deduz 500 pontos (cria registro negativo em points_ledger)
   - Atualiza redemption.status = 'aprovado'
9. Email pro cliente com código de resgate
10. Push: "Prêmio aprovado! Código: ABC123XYZ"
```

### **FLUXO 5: Expiração de Pontos**

```
CRON JOB (roda diariamente às 9h):

1. Busca pontos expirando em 30 dias
   → Cria notification (tipo: expiration, priority: normal)
   → Envia push + email

2. Busca pontos expirando em 7 dias
   → Cria notification (priority: important)
   → Envia push + email

3. Busca pontos expirando em 1 dia
   → Cria notification (priority: critical)
   → Envia SMS + push + email

4. Busca pontos com expires_at < NOW()
   → UPDATE points_ledger SET expired = TRUE
   
5. Envia resumo: "X pontos expiraram hoje"
```

---

## 🎮 MECÂNICA DE GAMIFICAÇÃO

### **NÍVEIS (baseado em indicações)**

```javascript
const NIVEIS = {
  bronze: { min: 0, max: 5, pontosPorIndicacao: 200, desconto: 0 },
  prata: { min: 6, max: 15, pontosPorIndicacao: 250, desconto: 10 },
  ouro: { min: 16, max: 30, pontosPorIndicacao: 300, desconto: 20 },
  diamante: { min: 31, max: Infinity, pontosPorIndicacao: 400, desconto: 100 }
};

function calcularNivel(totalIndicacoes) {
  if (totalIndicacoes >= 31) return 'diamante';
  if (totalIndicacoes >= 16) return 'ouro';
  if (totalIndicacoes >= 6) return 'prata';
  return 'bronze';
}
```

### **EXPIRAÇÃO E RENOVAÇÃO**

```javascript
// Política de expiração
const EXPIRATION_RULES = {
  purchase: { months: 12, renewable: true },
  referral: { months: 24, renewable: true },
  bonus: { months: 6, renewable: false },
  mission: { months: 6, renewable: false }
};

// Renovação automática (quando cliente faz compra)
async function renovarPontos(userId) {
  await db.query(`
    UPDATE points_ledger 
    SET expires_at = DATE_ADD(NOW(), INTERVAL 12 MONTH)
    WHERE user_id = ? 
    AND renewable = TRUE 
    AND expired = FALSE
    AND redeemed = FALSE
  `, [userId]);
}
```

### **CÁLCULO DE PONTOS**

```javascript
// Regra básica: R$ 10 = 1 ponto
function calcularPontos(valorCompra) {
  return Math.floor(valorCompra / 10);
}

// Pontos de indicação (quando indicado paga primeira mensalidade)
const PONTOS_INDICACAO = {
  bronze: 200,
  prata: 250,
  ouro: 300,
  diamante: 400
};
```

---

## 📅 CRONOGRAMA DE DESENVOLVIMENTO (15 DIAS)

### **SPRINT 1: Base (Dias 1-5)**

**Dia 1:**
- [ ] Setup repositório Git
- [ ] Configurar ambiente (Node, PostgreSQL, Redis)
- [ ] Criar estrutura de pastas
- [ ] Instalar dependências

**Dia 2:**
- [ ] Criar todas as tabelas do banco
- [ ] Seeds iniciais (admin, prêmios exemplo)
- [ ] Configurar variáveis de ambiente

**Dia 3:**
- [ ] Autenticação (register, login, JWT)
- [ ] Middleware de auth
- [ ] Endpoints básicos de usuário

**Dia 4:**
- [ ] Sistema de pontos (award, balance, history)
- [ ] Lógica de expiração
- [ ] Testes básicos

**Dia 5:**
- [ ] Integração Asaas (webhook, criar cobrança)
- [ ] Importar clientes existentes
- [ ] Testar fluxo de pagamento

### **SPRINT 2: Core Features (Dias 6-10)**

**Dia 6:**
- [ ] Painel parceiro (frontend + backend)
- [ ] Lançamento de pontos
- [ ] Consulta de cliente (ativo/inativo)

**Dia 7:**
- [ ] Sistema de indicação
- [ ] Geração de link único
- [ ] Tracking de conversão

**Dia 8:**
- [ ] Catálogo de prêmios
- [ ] Resgate de prêmios
- [ ] Aprovação (admin)

**Dia 9:**
- [ ] Painel cliente (saldo, extrato, prêmios)
- [ ] QR Code do cartão
- [ ] Responsivo mobile

**Dia 10:**
- [ ] Notificações push (FCM setup)
- [ ] Notificações email (Resend)
- [ ] Cron job de expiração

### **SPRINT 3: Polish & Deploy (Dias 11-15)**

**Dia 11:**
- [ ] Painel admin (dashboard, aprovações)
- [ ] Relatórios básicos
- [ ] Gestão de parceiros

**Dia 12:**
- [ ] PWA config (manifest, service worker)
- [ ] Instalação na home
- [ ] Funcionalidade offline básica

**Dia 13:**
- [ ] Testes completos (todos os fluxos)
- [ ] Correção de bugs
- [ ] Ajustes de UX

**Dia 14:**
- [ ] Deploy backend (Railway)
- [ ] Deploy frontend (Vercel)
- [ ] Configurar domínio

**Dia 15:**
- [ ] Testes em produção
- [ ] Documentação final
- [ ] Treinamento de 2 parceiros piloto

---

## 🚀 SETUP INICIAL

### **1. Clonar e instalar**

```bash
# Backend
mkdir essencial-clube-api
cd essencial-clube-api
npm init -y
npm install express pg jsonwebtoken bcrypt cors dotenv
npm install axios bull bullmq ioredis
npm install firebase-admin resend qrcode
npm install -D nodemon

# Frontend
npx create-vite essencial-clube-app --template react
cd essencial-clube-app
npm install
npm install axios react-router-dom tailwindcss
npm install firebase qrcode.react
```

### **2. Variáveis de ambiente (.env)**

```env
# Server
PORT=3000
NODE_ENV=development
JWT_SECRET=chave_super_secreta_trocar

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=root
DB_PASSWORD=senha
DB_NAME=cartao_essencial

# Redis
REDIS_URL=redis://localhost:6379

# Asaas
ASAAS_API_KEY=sua_chave_asaas
ASAAS_WEBHOOK_TOKEN=token_seguro_webhook
ASAAS_API_URL=https://api.asaas.com/v3

# Firebase
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_PRIVATE_KEY=chave_privada
FIREBASE_CLIENT_EMAIL=email@projeto.iam.gserviceaccount.com

# Resend
RESEND_API_KEY=re_sua_chave
RESEND_FROM_EMAIL=contato@essencialclube.com.br

# App
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

### **3. Estrutura de pastas**

```
essencial-clube-api/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── firebase.js
│   │   └── asaas.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── pointsController.js
│   │   ├── partnersController.js
│   │   ├── rewardsController.js
│   │   ├── referralsController.js
│   │   └── asaasController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validateRequest.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Points.js
│   │   ├── Partner.js
│   │   ├── Reward.js
│   │   └── Referral.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── points.js
│   │   ├── partners.js
│   │   ├── rewards.js
│   │   ├── referrals.js
│   │   └── asaas.js
│   ├── services/
│   │   ├── notificationService.js
│   │   ├── emailService.js
│   │   ├── pushService.js
│   │   └── asaasService.js
│   ├── jobs/
│   │   ├── expirationCheck.js
│   │   └── notificationQueue.js
│   └── utils/
│       ├── validators.js
│       └── helpers.js
├── .env
├── package.json
└── server.js

essencial-clube-app/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   ├── Dashboard/
│   │   ├── Points/
│   │   ├── Rewards/
│   │   └── Referrals/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Home.jsx
│   │   ├── Premios.jsx
│   │   ├── Indicar.jsx
│   │   └── Parceiro/
│   ├── services/
│   │   ├── api.js
│   │   └── firebase.js
│   ├── contexts/
│   │   └── AuthContext.jsx
│   └── App.jsx
├── public/
│   ├── manifest.json
│   ├── firebase-messaging-sw.js
│   └── icons/
└── package.json
```

---

## 🧪 TESTES CRÍTICOS

### **Checklist de testes manuais:**

**Autenticação:**
- [ ] Cadastro novo cliente
- [ ] Login com credenciais válidas
- [ [ ] Login com credenciais inválidas
- [ ] Refresh token

**Pontos:**
- [ ] Parceiro lança pontos (cliente ativo)
- [ ] Parceiro tenta lançar (cliente inativo)
- [ ] Consultar saldo
- [ ] Ver extrato
- [ ] Renovação automática após compra

**Asaas:**
- [ ] Webhook de pagamento confirmado
- [ ] Gerar cobrança Pix sob demanda
- [ ] Importar clientes existentes
- [ ] Ativação automática após pagamento

**Indicação:**
- [ ] Gerar link único
- [ ] Cadastro via link
- [ ] Conversão (dar pontos após primeiro pagamento)
- [ ] Subir de nível

**Resgate:**
- [ ] Listar prêmios disponíveis
- [ ] Resgatar com saldo suficiente
- [ ] Tentar resgatar sem saldo
- [ ] Aprovação pelo admin
- [ ] Dedução de pontos

**Notificações:**
- [ ] Push notification (desktop)
- [ ] Push notification (mobile)
- [ ] Email de boas-vindas
- [ ] Email de expiração (30d, 7d)

---

## 📊 MÉTRICAS E MONITORING

### **KPIs para dashboard admin:**

```javascript
// Métricas principais
- Total de clientes ativos
- Total de pontos em circulação
- Pontos expirando próximos 30 dias
- Taxa de resgate (% de pontos resgatados vs emitidos)
- Resgates pendentes de aprovação
- Top 10 indicadores
- Receita recorrente mensal (MRR)
- Churn rate (cancelamentos)
- CAC (custo aquisição via indicação = R$ 0)
```

---

## 🔐 SEGURANÇA

### **Checklist de segurança:**

- [ ] Senhas hash com bcrypt (salt rounds: 10)
- [ ] JWT com expiração (15min access, 7d refresh)
- [ ] Validação de input (todos endpoints)
- [ ] Rate limiting (express-rate-limit)
- [ ] CORS configurado (whitelist de domínios)
- [ ] Webhook Asaas verificado (token)
- [ ] SQL injection protection (prepared statements)
- [ ] XSS protection (sanitize inputs)
- [ ] HTTPS obrigatório em produção

---

## 📝 OBSERVAÇÕES FINAIS

### **Prioridades:**
1. Sistema de pontos funcionando (core)
2. Integração Asaas (pagamentos)
3. Painel parceiro (lançamento)
4. Indicação (viralização)
5. Notificações (engajamento)

### **Pode deixar para depois (pós-MVP):**
- Sistema de missões/desafios
- Badges e conquistas
- Programa de embaixadores completo
- App nativo (Android/iOS)
- Dashboard analytics avançado

### **Decisões técnicas importantes:**
- **PWA vs App Nativo:** Começar PWA, migrar depois se necessário
- **Fila de notificações:** Redis + BullMQ (escalável)
- **Hospedagem:** Railway (backend) + Vercel (frontend) = R$ 0 inicial
- **Email:** Resend (3k grátis/mês suficiente pra começar)
- **Push:** Firebase FCM (grátis ilimitado)

---

## 🎯 PRÓXIMOS PASSOS

1. Gemini CLI: Ler este README
2. Gerar estrutura base do projeto
3. Implementar endpoints core
4. Fabio: Testar cada funcionalidade conforme pronta
5. Iterar e ajustar

**Objetivo:** Sistema funcionando em 15 dias para lançamento piloto com 10 parceiros e 100 primeiros clientes.

---

**Versão:** 1.0  
**Data:** Janeiro 2026  
**Autor:** Claude + Fabio

## 📝 LOG DE DESENVOLVIMENTO (Atualizado em 20/01/2026)

### **Infraestrutura** ✅
- Estrutura de pastas do Backend e Frontend criada
- Dependências NPM instaladas
- Banco de dados: **PostgreSQL** (alterado de MySQL)
- Arquivo `init.sql` criado e executado
- Servidor configurado com `nodemon` para desenvolvimento
- Seeds executados (`seed.js`, `seed_partner_client.js`)

---

### **Backend - Status dos Endpoints** ✅ COMPLETO

#### **Autenticação** (`/api/auth`)
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/auth/register` | POST | Cadastro de usuário (com indicação opcional de parceiro/admin) | ✅ |
| `/api/auth/login` | POST | Login com JWT (1h expiração) | ✅ |
| `/api/auth/refresh` | POST | Atualiza token de acesso | ✅ |

#### **Usuários** (`/api/users`)
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/users/me` | GET | Dados do usuário logado | ✅ |

#### **Pontos** (`/api/points`)
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/points/balance/:userId` | GET | Consultar saldo de pontos | ✅ |
| `/api/points/history/:userId` | GET | Extrato de pontos (paginado) | ✅ |
| `/api/points/expiring/:userId` | GET | Pontos próximos de expirar | ✅ |
| `/api/points/renew/:userId` | POST | Renovar pontos renováveis | ✅ |

#### **Prêmios** (`/api/rewards`)
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/rewards` | GET | Listar catálogo de prêmios | ✅ |
| `/api/rewards/:id` | GET | Detalhes de um prêmio | ✅ |
| `/api/rewards` | POST | Admin cria prêmio | ✅ |
| `/api/rewards/:id` | PUT | Admin atualiza prêmio | ✅ |

#### **Resgates** (`/api/redemptions`)
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/redemptions` | POST | Cliente resgata prêmio | ✅ |
| `/api/redemptions/my` | GET | Meus resgates | ✅ |
| `/api/redemptions/pending` | GET | Resgates pendentes (Admin) | ✅ |
| `/api/redemptions/:id/approve` | PUT | Aprovar/rejeitar resgate | ✅ |

#### **Indicações** (`/api/referrals`)
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/referrals/my-code` | GET | Obter meu código de indicação | ✅ |
| `/api/referrals/validate/:code` | POST | Validar código (público) | ✅ |
| `/api/referrals/stats` | GET | Estatísticas de indicações | ✅ |
| `/api/referrals/leaderboard` | GET | Ranking de indicadores | ✅ |
| `/api/referrals/convert/:referredId` | POST | Converter indicação (Admin) | ✅ |

#### **Parceiros** (`/api/partners`)
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/partners` | GET | Listar parceiros ativos | ✅ |
| `/api/partners/:id` | GET | Detalhes do parceiro | ✅ |
| `/api/partners/check-client/:cpf` | GET | Verificar status do cliente | ✅ |
| `/api/partners/my-transactions` | GET | Histórico de transações | ✅ |
| `/api/partners/transaction` | POST | Lançar pontos para cliente | ✅ |

#### **Admin** (`/api/admin`)
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/admin/dashboard` | GET | Métricas do sistema | ✅ |
| `/api/admin/users` | GET | Listar usuários (filtros) | ✅ |
| `/api/admin/users/:id/status` | PUT | Atualizar status usuário | ✅ |
| `/api/admin/redemptions/pending` | GET | Resgates pendentes | ✅ |
| `/api/admin/reports/points` | GET | Relatório de pontos | ✅ |
| `/api/admin/users/:id/activate-manual` | POST | Ativa manualmente um usuário (com pontos de indicação) | ✅ |
| `/api/admin/users/:id` | PUT | Atualizar detalhes completos de um usuário | ✅ |
| `/api/admin/users/:id` | DELETE | Excluir um usuário | ✅ |
| `/api/admin/partners` | POST | Criar novo parceiro | ✅ |

#### **Integrações (Fase 2)** - PENDENTE
| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/asaas/webhook` | POST | Receber eventos Asaas | ❌ |
| `/api/asaas/create-charge` | POST | Gerar cobrança Pix | ❌ |
| `/api/notifications/register-token` | POST | Registrar FCM token | ❌ |

---

### Frontend - Status ✅ DESIGN PREMIUM APLICADO

**Cores da Marca:**
- Primária: `#5287fb` (azul)
- Secundária: `#74ca4f` (verde)

**Estrutura Implementada:**

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `src/services/api.js` | Serviço HTTP com Axios | ✅ |
| `src/contexts/AuthContext.jsx` | Contexto de autenticação | ✅ |
| `src/components/PrivateRoute.jsx` | Proteção de rotas | ✅ |
| `src/components/Layout/MainLayout.jsx` | Layout principal (header + nav) | ✅ |

**Páginas Implementadas:**

| Página | Rota | Descrição | Status |
|--------|------|-----------|--------|
| Login | `/login` | Tela de autenticação | ✅ |
| Cadastro | `/cadastro` | Tela de registro de novos usuários | ✅ |
| Dashboard | `/dashboard` | Painel do cliente (saldo, histórico) | ✅ COMPLETO (Refatorado para Material-UI, problemas de renderização e warnings do Grid corrigidos, Card de saldo com gradiente de cor da marca) |
| Prêmios | /premios | Catálogo e resgate | ✅ COMPLETO (Layout refatorado para Flexbox manual com MUI Box para resolver conflitos de CSS, cards com altura fixa e imagens com ajuste automático para evitar cortes, visual WooCommerce-like alcançado) |
| Indicar | `/indicar` | Código, QR, ranking | ✅ COMPLETO (Refatorado para Material-UI, gradiente de cor da marca aplicado) |
| Perfil | `/perfil` | Dados do usuário | ✅ COMPLETO (Refatorado para Material-UI) |
| Parceiro Home | `/parceiro` | Dashboard do parceiro (com cadastro de cliente pelo parceiro) | ✅ COMPLETO (Dashboard completo com métricas, gráfico de barras 7 dias, indicadores de tendência) |
| Lançar Pontos | `/parceiro/lancar` | Fluxo de lançamento | ✅ COMPLETO (Refatorado para Material-UI com Stepper) |
| Histórico | `/parceiro/historico` | Histórico de transações do parceiro | ✅ COMPLETO (Filtros por nome, CPF e período, paginação, resumo de totais) |

| Admin Dashboard | `/admin` | Painel administrativo com KPIs | ✅ COMPLETO (CSS padronizado com Dashboard cliente, gradient, ações rápidas) |
| Admin Usuários | `/admin/usuarios` | Gestão completa de usuários (CRUD, ativação manual de pagamento) | ✅ |
| Admin Resgates | `/admin/resgates` | Aprovação de resgates | ✅ COMPLETO (Container md, aprovar/rejeitar, tabs) |
| Admin Parceiros | `/admin/parceiros` | Gestão de parceiros | ✅ COMPLETO (Container md, listagem, cadastro de novos parceiros) |
| Admin Prêmios | `/admin/premios` | Gestão de prêmios (criação, edição, listagem) | ✅ COMPLETO (Frontend) |

**Páginas Pendentes:**
- `/extrato` - Extrato completo de pontos do cliente
- `/cadastro` - Cadastro de novo usuário

---

### **Próximos Passos**

1. **Testar fluxos completos** (login → dashboard → resgate)
2. **Implementar telas Admin** (dashboard, aprovar resgates)
3. **Implementar cadastro de usuário**
4. **Integrações** (Asaas para pagamentos)
5. **PWA** (manifest, service worker, offline)

---

## 🔑 CREDENCIAIS DE TESTE

Para facilitar os testes, as seguintes credenciais foram configuradas pelos scripts de `seed`:

### **Admin**
- **Email:** `admin@essencialclube.com.br`
- **Senha:** `admin123`
- **Acesso:** Painel administrativo completo (`/admin`)

### **Cliente de Teste**
- **Email:** `cliente@email.com`
- **Senha:** `cliente123`
- **CPF:** `11122233344`
- **Acesso:** Dashboard do cliente (`/dashboard`)

### **Parceiro de Teste**
- **Email:** `parceiro@email.com`
- **Senha:** `parceiro123`
- **Acesso:** Painel do parceiro (`/parceiro`)

### **Como criar os usuários de teste:**
```bash
cd essencial-clube-api
node src/utils/seed.js
```

---

## 🔧 TROUBLESHOOTING

### **Problema: Servidor travado (requisições não respondem)**

**Sintomas:**
- Login fica "carregando" infinitamente
- Requisições HTTP não retornam resposta
- `curl` para o backend trava

**Causa:**
O servidor Node.js pode travar quando:
1. Muitas conexões TCP ficam pendentes (ESTABLISHED, CLOSE_WAIT)
2. O servidor é reiniciado várias vezes sem fechar o anterior
3. Pool de conexões do PostgreSQL satura

**Solução:**

1. **Verificar se a porta 3000 está ocupada:**
```bash
netstat -ano | findstr :3000
```

2. **Identificar o PID do processo:**
```
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
                                                  ^^^^^
                                                  Este é o PID
```

3. **Matar o processo travado (Windows PowerShell):**
```powershell
Stop-Process -Id 12345 -Force
```

4. **Reiniciar o backend:**
```bash
cd essencial-clube-api
npm run dev
```

5. **Testar se está respondendo:**
```bash
curl http://localhost:3000/
# Deve retornar: "API Essencial Saúde no ar!"
```

---

### **Comandos úteis para diagnóstico**

```bash
# Ver processos na porta 3000 (Windows)
netstat -ano | findstr :3000

# Ver processos Node rodando (Windows PowerShell)
Get-Process node

# Matar todos os processos Node (Windows PowerShell)
Stop-Process -Name node -Force

# Testar login via terminal
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@email.com","senha":"cliente123"}'

# Verificar conexão com PostgreSQL
cd essencial-clube-api
node -e "require('./src/config/database').query('SELECT NOW()').then(r => console.log('OK:', r.rows[0])).catch(e => console.error('ERRO:', e.message))"
```

---

### **Prevenção**

1. **Sempre parar o servidor antes de reiniciar** (Ctrl+C no terminal)
2. **Usar apenas um terminal** para rodar o backend
3. **Verificar se a porta está livre** antes de iniciar
4. **Fechar o navegador** se fizer muitas requisições de teste

---

### **Problemas de Layout/Funcionalidade Recentes**

**Problema: "Cliente Asaas não encontrado para este usuário."**
- **Onde ocorre:** Geralmente ao tentar gerar um pagamento PIX para um cliente inativo no painel do parceiro (`/parceiro/lancar`).
- **Possíveis Causas:**
    1.  O usuário foi cadastrado antes da integração completa do Asaas.
    2.  Houve um erro na comunicação com a API do Asaas durante o registro do usuário, e o `asaas_customer_id` não foi salvo.
    3.  O usuário em questão não é do tipo 'cliente' (apenas clientes são registrados no Asaas automaticamente).
- **Passos para Depuração:**
    1.  **Verifique o Banco de Dados:** Acesse a tabela `users` e confira se a coluna `asaas_customer_id` está preenchida para o cliente que está gerando o erro. Se estiver `NULL`/vazia, o Asaas ID não foi salvo.
    2.  **Teste um Novo Cadastro:** Crie um *novo* cliente (pela página `/cadastro` ou pelo botão "Cadastrar Cliente" no painel do parceiro). Verifique se este novo cliente tem um `asaas_customer_id` no DB e se o pagamento PIX pode ser gerado para ele.

**Problema: "Botão Novo Usuário não funciona" (em Admin/Usuários)**
- **Onde ocorre:** Ao clicar no botão "Novo Usuário" na página de "Gestão de Usuários" (`/admin/usuarios`).
- **Possíveis Causas:** Um erro de JavaScript no frontend que impede o diálogo de abrir ou o formulário de funcionar.
- **Passos para Depuração:**
    1.  **Abra o Console do Navegador:** Acesse a página, abra as Ferramentas do Desenvolvedor (F12) e vá para a aba "Console".
    2.  **Clique no botão "Novo Usuário":** Observe se alguma mensagem de erro (em vermelho) aparece no console. Envie a mensagem completa, incluindo a linha do arquivo.

---

## 👨‍💻 OBSERVAÇÕES DE DESENVOLVIMENTO

**Linguagem:** Toda a comunicação entre o Gemini e o usuário será em Português do Brasil (pt-BR).
**Metodologia:** O Gemini sempre explicará o que planeja fazer e solicitará permissão antes de executar qualquer comando ou alteração no código.

---

## 📝 LOG DE DESENVOLVIMENTO - 22/01/2026

### **Resumo do Dia**

Hoje, focamos em corrigir bugs críticos e implementar o sistema de comissionamento para parceiros, que foi uma evolução da funcionalidade de "Parceiro poder ver seus indicados".

#### **Correções de Bugs:**
1.  **Cadastro de Usuário:**
    *   Resolvemos o erro "Cliente Asaas não encontrado" ao desacoplar a criação do cliente no Asaas do registro de usuário. Agora, o cadastro no sistema é independente.
    *   Corrigimos um erro crítico de `db.getClient is not a function` que impedia o registro de novos usuários e o processamento de webhooks. A forma de obter uma conexão com o banco de dados para transações foi padronizada para `db.connect()`.
    *   Corrigimos a lógica de indicação para garantir que, quando um parceiro cadastra um cliente diretamente, um registro de `referral` seja criado corretamente, o que era a causa do painel de comissões aparecer vazio.

2.  **Bugs de Frontend:**
    *   Resolvemos múltiplos `ReferenceError` no frontend que impediam a renderização das páginas, relacionados a ícones e logos não importados (`StarsIcon`, `logo`).
    *   Corrigimos um erro de roteamento no backend que fazia com que a rota `/api/partners/my-referred-clients` fosse incorretamente interpretada.
    *   Corrigimos um `TypeError` no frontend causado por um valor numérico sendo tratado como string (`toFixed`).

#### **Implementação do Sistema de Comissões Configuráveis:**
Implementamos um sistema de ponta a ponta para que parceiros possam receber comissões financeiras por suas indicações, com regras configuráveis pelo administrador.

1.  **Banco de Dados:**
    *   Adicionamos as tabelas `commission_configs`, `commissions`, e `payout_requests`.
    *   Adicionamos a coluna `min_payout_amount` para definir um valor mínimo de saque por regra de comissão.
    *   Adicionamos a coluna `payout_info` na tabela `users` para armazenar os dados de pagamento (e.g., chave PIX) do parceiro.

2.  **Backend:**
    *   **API do Admin:** Criamos uma API completa (`/api/admin/commission-configs`) para o Admin gerenciar as Configurações de Comissão (criar, ler, atualizar, deletar).
    *   **Serviço de Comissão:** Implementamos o `commissionService` com a lógica para calcular as comissões (primeira e recorrente) com base nas regras ativas.
    *   **Integração com Pagamentos:** Atualizamos o `asaasController` para que, ao receber um webhook de pagamento confirmado (simulado), ele utilize o `commissionService` para calcular e salvar a comissão na nova tabela `commissions`.
    *   **Painel do Parceiro:** O endpoint `/api/partners/my-referred-clients` foi totalmente refeito para retornar um relatório detalhado de indicações, pagamentos e comissões calculadas, incluindo um sumário.
    *   **Solicitação de Saque:** Criamos o backend para a funcionalidade de "Solicitar Saque", que verifica o saldo pendente contra o valor mínimo e cria um registro de solicitação.

3.  **Frontend:**
    *   **Painel do Admin:** Criamos a página "Configurações de Comissão" (`/admin/commission-configs`), permitindo que o administrador crie e edite as regras de comissão, incluindo o novo campo de valor mínimo para saque.
    *   **Painel do Parceiro:** Criamos o "Painel de Comissões" (`/parceiro/comissoes`), que exibe um resumo financeiro e uma lista detalhada dos clientes indicados e suas respectivas comissões.
    *   **Perfil do Usuário:** Atualizamos a página "Perfil" (`/perfil`) para permitir que o parceiro adicione e edite suas informações de pagamento (atualmente em formato JSON).

### **Próximos Passos (Plano para 23/01/2026):**

1.  ~~**Melhorar a Entrada de Dados de Pagamento:** Substituir o campo de texto JSON na página de Perfil por campos individuais e mais amigáveis (ex: "Chave PIX", "Tipo de Chave").~~
    ✅ CONCLUÍDO
2.  ~~**Testar o Fluxo de Solicitação de Saque:** Realizar o teste completo de um parceiro clicando em "Solicitar Saque" e verificar se o registro é criado corretamente no backend.~~
    ✅ CONCLUÍDO
3.  ~~**Implementar a Gestão de Saques do Admin:**~~
    ✅ CONCLUÍDO
    *   ~~Criar uma nova página no painel do Admin (`/admin/payouts`) para listar as solicitações de saque pendentes.~~
    *   ~~Implementar a lógica (backend e frontend) para o admin "Aprovar" um saque, o que mudaria o status das comissões relacionadas para 'paid'.~~
4.  **Depurar o Webhook Real do Asaas:** A funcionalidade de comissão agora depende criticamente do webhook. Precisaremos configurar e testar a integração real para garantir que os pagamentos confirmados no Asaas disparem o cálculo de comissão automaticamente.

---

## 📝 LOG DE DESENVOLVIMENTO - 22/01/2026 (Sessão 2)

### **Resumo da Sessão**

Nesta sessão, concluímos as tarefas pendentes do sistema de comissões, melhorando a experiência do usuário e implementando a gestão completa de saques.

#### **1. Formulário de Dados de Pagamento (Perfil) - MELHORADO**

Substituímos o campo JSON confuso por campos individuais e amigáveis:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Tipo de Chave PIX | Dropdown | CPF, CNPJ, E-mail, Telefone, Chave Aleatória |
| Chave PIX | Texto | Valor da chave (com placeholder dinâmico) |
| Nome do Titular | Texto | Nome de quem vai receber (opcional) |
| Banco | Texto | Banco onde a chave está cadastrada (opcional) |

**Arquivos alterados:**
- `essencial-clube-app/src/pages/Perfil.jsx` - Formulário com campos individuais
- `essencial-clube-api/src/controllers/usersController.js` - Retorna `payout_info` no `getMe`

#### **2. Gestão de Saques do Admin - IMPLEMENTADO**

**Backend - Novos Endpoints:**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/admin/payouts` | GET | Listar todas as solicitações de saque (filtro por status) |
| `/api/admin/payouts/:id/approve` | PUT | Aprovar saque (marca comissões como 'paid') |
| `/api/admin/payouts/:id/reject` | PUT | Rejeitar saque (libera comissões para nova solicitação) |

**Frontend - Nova Página:**
- `essencial-clube-app/src/pages/Admin/AdminPayouts.jsx`
- Rota: `/admin/payouts`
- Menu lateral: "Saques" com ícone de carteira

**Funcionalidades:**
- Tabela com todas as solicitações de saque
- Filtro por status (Tabs: Todos, Pendentes, Aprovados, Rejeitados)
- Modal de detalhes com dados PIX do parceiro
- Botões de Aprovar/Rejeitar com confirmação
- Campo opcional de motivo ao rejeitar

#### **3. Correção de Bug - Valores Incorretos no Painel do Parceiro**

**Problema:** O painel do parceiro mostrava R$ 19,96 ao invés de R$ 39,92.

**Causa:** Registros faltantes na tabela `referrals` para alguns clientes indicados. A query do summary faz JOIN com `referrals`, então só contabilizava clientes com registro nessa tabela.

**Solução:** Inseridos os registros faltantes na tabela `referrals` para sincronizar com `users.referred_by`.

#### **4. Fluxo Completo Testado e Funcionando**

1. ✅ Parceiro acessa `/perfil` e cadastra dados PIX (campos amigáveis)
2. ✅ Parceiro acessa `/parceiro/comissoes` e vê resumo correto
3. ✅ Parceiro clica "Solicitar Saque" → Solicitação criada
4. ✅ Admin acessa `/admin/payouts` e vê solicitação pendente
5. ✅ Admin aprova saque → Comissões marcadas como 'paid'
6. ✅ Parceiro vê atualização: "Pendente: R$ 0,00 | Já Pago: R$ 39,92"

### **Próximos Passos:**

1. **Integração Real com Asaas:** Configurar e testar webhook real para que pagamentos confirmados disparem o cálculo de comissão automaticamente.
2. **Notificações:** Implementar notificações (push/email) quando um saque for aprovado/rejeitado.
3. **Histórico de Saques do Parceiro:** Adicionar visualização do histórico de saques na página `/parceiro/comissoes`.
4. **Relatórios:** Dashboard do admin com métricas de comissões (total pago, pendente, por período).

---

## 📝 LOG DE DESENVOLVIMENTO - 23/01/2026

### **Resumo da Sessão**

Nesta sessão, focamos em uma depuração profunda e na implementação de uma nova funcionalidade crítica de negócio. Começamos investigando por que novas assinaturas não estavam sendo criadas corretamente e, após resolver isso, implementamos o fluxo completo de cancelamento de assinatura com multa configurável.

#### **1. Correção do Fluxo de Criação de Assinatura (Deep Dive)**

*   **Problema Inicial:** O sistema estava criando uma cobrança única em vez de uma assinatura de 12 meses.
*   **Investigação:**
    1.  A análise inicial mostrou que o frontend (`LancarPontos.jsx`) parecia estar chamando a função correta (`createSubscription`).
    2.  No entanto, o log de rede do navegador do usuário indicava uma chamada para o endpoint de cobrança única (`/charges`), uma contradição direta.
    3.  A causa raiz foi descoberta na configuração do servidor Nginx, que estava servindo uma versão antiga do frontend a partir de um diretório incorreto (`/frontend` em vez de `/essencial-clube-app/dist`).
    4.  Após corrigir o Nginx, um segundo problema surgiu: a API passou a ser chamada em `localhost`, causando erro de conexão. Isso foi devido à ausência de um arquivo `.env.production` durante o processo de `build` no servidor.
    5.  Com a criação do `.env.production` e um novo `build`, o fluxo de criação de assinatura foi corrigido, mas o webhook de confirmação de pagamento falhou.
    6.  O log (`violates check constraint "asaas_payments_billing_type_check"`) revelou o problema final: a assinatura era criada com `billingType: 'UNDEFINED'`, um valor que o banco de dados não aceitava.
*   **Solução Final:**
    *   Corrigimos o `asaasController.js` para que, ao criar a assinatura, ele salve a primeira cobrança no banco de dados com `billing_type = NULL` se o valor for 'UNDEFINED', evitando a falha.
    *   O fluxo completo (Criação de Assinatura -> Pagamento -> Webhook -> Ativação de Cliente -> Cálculo de Comissão) foi **validado e confirmado como funcional**.

#### **2. Implementação do Cancelamento de Assinatura com Multa**

Implementamos um sistema de ponta a ponta para permitir que um administrador cancele a assinatura de um cliente e, opcionalmente, aplique uma multa configurável.

1.  **Banco de Dados:**
    *   Criamos um novo script SQL (`create_system_configs_table.sql`) que adiciona a tabela `system_configs`.
    *   Esta tabela armazena configurações globais, incluindo a `CANCELLATION_FEE_PERCENTAGE` (multa de cancelamento), com um valor padrão de '0'.

2.  **Backend:**
    *   **API de Configuração:** Criamos uma API completa (`GET` e `PUT` em `/api/admin/system-configs`) para o Admin gerenciar as configurações do sistema.
    *   **Lógica de Cancelamento com Multa:** Modificamos a função `cancelAsaasSubscription` para:
        1.  Ler o percentual da multa do banco de dados.
        2.  Se a multa for > 0, buscar os detalhes da assinatura no Asaas.
        3.  Calcular o valor da multa e criar uma nova cobrança avulsa para o cliente no Asaas.
        4.  Prosseguir com o cancelamento da assinatura.
    *   **API de Consulta:** Criamos o endpoint `GET /api/users/:id/subscriptions` para permitir que o frontend busque as assinaturas de um usuário específico.

3.  **Frontend:**
    *   **Página de Configuração:** Criamos a página "Configurações do Sistema" (`/admin/system-configs`), acessível pelo menu do admin, onde é possível visualizar e definir o percentual da multa de cancelamento.
    *   **Gestão de Assinaturas do Usuário:** Na página "Gestão de Usuários" (`/admin/usuarios`), adicionamos:
        *   Um novo ícone de "cancelar cartão" na coluna de ações de cada cliente.
        *   Um modal (pop-up) que, ao clicar no ícone, lista as assinaturas ativas do cliente.
        *   Um botão "Cancelar" dentro do modal que executa a função de cancelamento, com uma janela de confirmação.

### **Próximos Passos (Próxima Sessão)**

1.  **Deploy das Alterações:** O usuário precisa seguir as instruções no arquivo `proximos_passos.txt` para colocar todas as correções e a nova funcionalidade de cancelamento em produção.
2.  **Teste em Produção:** Validar o fluxo de configuração da multa e cancelamento de uma assinatura.
3.  **Iniciar Implementação do Carnê:** Com o sistema de assinaturas estável e completo, podemos iniciar o desenvolvimento da funcionalidade de "Carnê" (Parcelamento), conforme o plano já discutido.

---

## 📝 LOG DE DEPURAÇÃO - 24/01/2026

### **Problema: A interface do frontend não atualiza**

Após implementar um novo fluxo de cadastro de usuário em várias etapas no arquivo `Register.jsx`, a interface exibida no navegador continua sendo a antiga, de etapa única, causando a criação automática de assinaturas.

**Diagnóstico e Verificações Realizadas:**

1.  **Código Fonte no Servidor:** Verificamos o conteúdo do arquivo `/var/www/cartaoessencial/essencial-clube-app/src/pages/Register.jsx` no servidor. **Confirmado:** O arquivo contém o novo código com a lógica de múltiplas etapas.
2.  **Processo de Build:** O comando `npm run build` foi executado com sucesso na pasta `/var/www/cartaoessencial/essencial-clube-app`, gerando novos arquivos na pasta `dist` com timestamps recentes.
3.  **Configuração do Nginx:** Verificamos o arquivo `/etc/nginx/sites-available/cartaoessencial`. **Confirmado:** A diretiva `root` aponta corretamente para a pasta `/var/www/cartaoessencial/essencial-clube-app/dist`. Não há regras de cache agressivas configuradas no Nginx.
4.  **Artefatos do Build:** Verificamos o conteúdo do `index.html` e os nomes dos arquivos na pasta `dist`. **Confirmado:** O `index.html` aponta para os arquivos JavaScript e CSS recém-gerados pelo processo de build.
5.  **Cache do Navegador:** O teste foi realizado em janela anônima, o que minimiza a chance de ser um problema de cache do navegador.

### **Conclusão e Próximo Passo**

Todas as verificações no servidor (código-fonte, build, configuração do Nginx) indicam que ele está pronto para servir a nova versão da aplicação.

A causa mais provável para a exibição da interface antiga é uma **camada de cache externa**, como um serviço de **CDN (ex: Cloudflare)**, que está servindo uma cópia antiga do site e não está sendo atualizada.

**Ação Pendente para Amanhã:**

*   Verificar se existe um serviço de CDN (como Cloudflare) na frente do domínio `cartao.primeatende.com.br`.
*   Se existir, acessar seu painel e executar a limpeza de cache ("Purge Cache").

---

## 📝 LOG DE DESENVOLVIMENTO - 25/01/2026

### **Resumo da Sessao**

Nesta sessao, implementamos o **Sistema de Dependentes do Cartao**, uma funcionalidade importante que permite que titulares adicionem familiares ao plano.

#### **Sistema de Dependentes - IMPLEMENTADO**

**Regras de Negocio:**
- R$ 49,90/mes cobre o titular + ate 3 dependentes gratuitos
- A partir do 4o dependente: +R$ 9,99/mes por dependente extra
- Dependente tem cadastro completo (login proprio, CPF, acumula pontos)
- Ao adicionar/remover dependentes: sistema recalcula valor e pode regenerar carne
- Admin pode configurar todos esses valores na tela de Configuracoes

**1. Banco de Dados:**

Novo arquivo: `add_dependents_system.sql`

```sql
-- Coluna para relacionar dependente ao titular
ALTER TABLE users ADD COLUMN holder_id INT REFERENCES users(id) ON DELETE SET NULL;

-- Configuracoes do plano
INSERT INTO system_configs (config_key, config_value, description) VALUES
('PLAN_BASE_VALUE', '49.90', 'Valor da mensalidade do plano'),
('FREE_DEPENDENTS_LIMIT', '3', 'Quantidade de dependentes gratuitos'),
('EXTRA_DEPENDENT_VALUE', '9.99', 'Valor por dependente extra'),
('INSTALLMENT_COUNT', '12', 'Quantidade de parcelas do carne');
```

**2. Backend - Novos Endpoints:**

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/users/me/dependents` | GET | Listar dependentes do titular |
| `/api/users/me/dependents` | POST | Adicionar novo dependente |
| `/api/users/me/dependents/:id` | DELETE | Remover dependente |
| `/api/users/me/plan` | GET | Informacoes do plano (valor, dependentes) |
| `/api/asaas/regenerate-installment/:userId` | POST | Regenerar carne com novo valor |

**3. Frontend:**

| Arquivo | Descricao |
|---------|-----------|
| `MeusDependentes.jsx` | Nova pagina para gerenciar dependentes |
| `AdminSystemConfigs.jsx` | Atualizado com campos do plano |
| `MainLayout.jsx` | Menu "Dependentes" adicionado |
| `App.jsx` | Rota `/dependentes` adicionada |
| `api.js` | Novos servicos de dependentes |

**4. Fluxo de Regeneracao do Carne:**

```
1. Titular adiciona 4o dependente
   ↓
2. Calcula: R$ 49,90 + R$ 9,99 = R$ 59,89/mes
   ↓
3. Busca parcelas PENDING (ex: 10 restantes)
   ↓
4. Cancela no Asaas (DELETE /payments/{id})
   ↓
5. Remove do banco local
   ↓
6. Gera novo carne: 10 parcelas de R$ 59,89
   ↓
7. Salva novas parcelas
   ↓
8. Retorna link do novo carne
```

#### **Correcao: Link de Indicacao com localhost**

**Problema:** O link de indicacao na pagina `/indicar` mostrava `localhost:5173` em vez da URL de producao.

**Causa:** A variavel `FRONTEND_URL` nao estava configurada no `.env` do servidor.

**Solucao:** Adicionado `FRONTEND_URL=https://cartao.primeatende.com.br` no `.env` do backend e reiniciado PM2.

---

## 🚀 MIGRACAO PARA ASAAS PRODUCAO

### **Quando mudar de Sandbox para Producao:**

1. **Alterar no `.env` do servidor:**
```env
# DE (Sandbox):
ASAAS_API_URL=https://sandbox.asaas.com/api/v3
ASAAS_API_KEY=$aact_hmlg_...

# PARA (Producao):
ASAAS_API_URL=https://api.asaas.com/api/v3
ASAAS_API_KEY=$aact_prod_...
```

2. **Configurar Webhook no Painel Asaas Producao:**
   - URL: `https://apicartao.primeatende.com.br/api/asaas/webhook`
   - Token: Mesmo `ASAAS_WEBHOOK_TOKEN` do `.env`
   - Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`

3. **Reiniciar backend:**
```bash
pm2 restart all
```

---

## 📥 IMPORTACAO DOS 400 CLIENTES EXISTENTES DO ASAAS

### **IMPORTANTE: O webhook NAO importa dados historicos!**

O webhook so captura **eventos futuros** (novos pagamentos, confirmacoes, etc). Os 400 clientes existentes no Asaas de producao **NAO serao importados automaticamente**.

### **Opcao A: Sync Manual (um por um)**

Usar o botao "Sincronizar" na tela Admin > Boletos para cada usuario.
- Vantagem: Simples, sem codigo
- Desvantagem: Demorado para 400 clientes

### **Opcao B: Script de Importacao em Massa (RECOMENDADO)**

Criar um script que:
1. Busca todos os clientes do Asaas (`GET /customers`)
2. Para cada cliente:
   - Verifica se ja existe no nosso banco (por CPF)
   - Se nao existe: cria o usuario
   - Atualiza o `asaas_customer_id`
3. Busca todos os pagamentos de cada cliente (`GET /payments?customer=...`)
4. Importa os pagamentos para a tabela `asaas_payments`

**Comando para executar (quando o script for criado):**
```bash
cd /var/www/cartaoessencial/essencial-clube-api
node src/utils/importAsaasClients.js
```

### **Dados que serao importados:**

| Asaas | Nossa Tabela | Campo |
|-------|--------------|-------|
| Customer ID | users | asaas_customer_id |
| Nome | users | nome |
| CPF | users | cpf |
| Email | users | email |
| Telefone | users | telefone |
| Payments | asaas_payments | todos os campos |

### **Dados que NAO serao importados (precisam ser feitos manualmente):**

- Senhas (usuarios precisarao fazer "Esqueci minha senha")
- Indicacoes/Referrals (se houver historico)
- Pontos acumulados (se houver sistema anterior)

---

## 📋 CHECKLIST PARA GO-LIVE PRODUCAO

- [ ] Alterar `ASAAS_API_URL` e `ASAAS_API_KEY` para producao
- [ ] Configurar webhook no painel Asaas producao
- [ ] Executar script de importacao dos 400 clientes
- [ ] Testar criacao de novo cliente (fluxo completo)
- [ ] Testar pagamento e ativacao via webhook
- [ ] Testar sistema de dependentes
- [ ] Verificar links de indicacao com URL correta
- [ ] Backup do banco de dados antes de qualquer alteracao