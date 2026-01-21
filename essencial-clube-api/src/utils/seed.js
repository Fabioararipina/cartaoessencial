require('dotenv').config({ path: '../../.env' });
const bcrypt = require('bcrypt');
const db = require('../config/database');

async function createSeeds() {
  const client = await db.query('SELECT NOW()'); // A simple query to get a client from the pool
  console.log('Iniciando a criação de seeds...');

  try {
    // Inicia a transação
    await db.query('BEGIN');

    // 1. Criar usuário Admin
    const saltRounds = 10;
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const adminResult = await db.query(
      `INSERT INTO users (cpf, nome, email, senha_hash, tipo, status, nivel)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['00000000000', 'Admin Geral', 'admin@essencialclube.com.br', hashedPassword, 'admin', 'ativo', 'diamante']
    );

    let adminId;
    if (adminResult.rows.length > 0) {
      adminId = adminResult.rows[0].id;
      console.log('Usuário Admin criado com ID:', adminId);
    } else {
      const existingAdmin = await db.query('SELECT id FROM users WHERE email = $1', ['admin@essencialclube.com.br']);
      adminId = existingAdmin.rows[0].id;
      console.log('Usuário Admin já existe com ID:', adminId);
    }


    // 2. Criar Parceiro de Exemplo
    if (adminId) {
        await db.query(
            `INSERT INTO partners (user_id, nome_estabelecimento, cnpj, categoria, endereco, desconto_oferecido)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [adminId, 'Supermercado Exemplo', '12345678000199', 'Supermercado', 'Rua Exemplo, 123', '5%']
        );
        console.log('Parceiro de exemplo criado.');
    }


    // 3. Criar Prêmio de Exemplo
    await db.query(
      `INSERT INTO rewards (nome, descricao, points_required, valor_equivalente, categoria, ativo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      ['Vale-Compras R$20', 'Vale-compras para usar em qualquer parceiro da rede.', 200, 20.00, 'vale', true]
    );
    console.log('Prêmio de exemplo criado.');

    // Finaliza a transação
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
