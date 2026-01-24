require('dotenv').config({ path: '../../.env' });
const bcrypt = require('bcrypt');
const db = require('../config/database');

async function createSeeds() {
  const client = await db.query('SELECT NOW()'); // A simple query to get a client from the pool
  console.log('Iniciando a criação de seeds...');

  try {
    await db.query('BEGIN');
    const saltRounds = 10;

    // --- 1. Criar Usuário Admin ---
    const adminPassword = 'admin123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    await db.query(
        `INSERT INTO users (cpf, nome, email, senha_hash, tipo, status, nivel)
         VALUES ('00000000000', 'Admin Geral', 'admin@essencialclube.com.br', $1, 'admin', 'ativo', 'diamante')
         ON CONFLICT ON CONSTRAINT users_cpf_key DO UPDATE SET senha_hash = $1, status = 'ativo', email = 'admin@essencialclube.com.br'`, [adminHashedPassword]
    );
    console.log('Usuário Admin criado/atualizado.');

    // --- 2. Criar Usuário Parceiro ---
    const partnerPassword = 'parceiro123';
    const partnerHashedPassword = await bcrypt.hash(partnerPassword, saltRounds);
    const partnerResult = await db.query(
        `INSERT INTO users (cpf, nome, email, senha_hash, tipo, status, nivel)
         VALUES ('11111111111', 'Parceiro Teste', 'parceiro@email.com', $1, 'parceiro', 'ativo', 'bronze')
         ON CONFLICT ON CONSTRAINT users_cpf_key DO UPDATE SET senha_hash = $1, status = 'ativo', email = 'parceiro@email.com'
         RETURNING id`, [partnerHashedPassword]
    );
    const partnerUserId = partnerResult.rows[0].id;
    console.log('Usuário Parceiro criado/atualizado com ID:', partnerUserId);
    
    // Associar dados de parceiro na tabela 'partners'
    await db.query(
        `INSERT INTO partners (user_id, nome_estabelecimento, cnpj, categoria, endereco, desconto_oferecido)
         VALUES ($1, 'Supermercado Parceiro', '12345678000199', 'Supermercado', 'Rua Parceira, 456', '10%')
         ON CONFLICT (user_id) DO NOTHING`,
        [partnerUserId]
    );
    console.log('Dados do estabelecimento parceiro criados/atualizados.');

    // --- 3. Criar Usuário Cliente ---
    const clientPassword = 'cliente123';
    const clientHashedPassword = await bcrypt.hash(clientPassword, saltRounds);
    await db.query(
        `INSERT INTO users (cpf, nome, email, senha_hash, tipo, status, nivel, referred_by)
         VALUES ('11122233344', 'Cliente Teste', 'cliente@email.com', $1, 'cliente', 'ativo', 'bronze', $2)
         ON CONFLICT ON CONSTRAINT users_cpf_key DO UPDATE SET senha_hash = $1, status = 'ativo', email = 'cliente@email.com'`, [clientHashedPassword, partnerUserId]
    );
    console.log('Usuário Cliente criado/atualizado.');
    
    // --- 4. Criar Prêmio de Exemplo ---
    await db.query(
      `INSERT INTO rewards (nome, descricao, points_required, valor_equivalente, categoria, ativo)
       VALUES ('Vale-Compras R$20', 'Vale-compras para usar em qualquer parceiro da rede.', 200, 20.00, 'vale', true)
       ON CONFLICT (nome) DO NOTHING`
    );
    console.log('Prêmio de exemplo criado/ignorado.');

    await db.query('COMMIT');
    console.log('Seeds criados com sucesso!');

  } catch (err) {
    // Em caso de erro, desfaz a transação
    await db.query('ROLLBACK');
    console.error('Erro ao criar seeds:', err.stack);
  } finally {
    // Encerra a conexão com o banco
    // A implementação do 'pool.end()' deve ser gerenciada no database.js se necessário
    console.log('Processo de seeding finalizado.');
  }
}

createSeeds();
