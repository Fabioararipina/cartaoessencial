require('dotenv').config({ path: '../../.env' });
const bcrypt = require('bcrypt');
const db = require('../config/database');

async function createPartnerAndClientSeeds() {
  console.log('Iniciando a criação de seeds de parceiro e cliente...');

  try {
    await db.query('BEGIN');

    // 1. Criar usuário Cliente
    const clientPassword = 'cliente123';
    const clientHashedPassword = await bcrypt.hash(clientPassword, 10);
    const clientResult = await db.query(
      `INSERT INTO users (cpf, nome, email, senha_hash, tipo, status, nivel)
       VALUES ($1, $2, $3, $4, 'cliente', 'ativo', 'bronze')
       ON CONFLICT (cpf) DO NOTHING
       RETURNING id`,
      ['11122233344', 'Cliente de Teste', 'cliente@email.com', clientHashedPassword]
    );
     if (clientResult.rowCount > 0) {
        console.log('--- Usuário CLIENTE de teste criado ---');
        console.log('Email: cliente@email.com');
        console.log('Senha: cliente123');
        console.log('CPF: 11122233344');
        console.log('------------------------------------');
    } else {
        console.log('Usuário CLIENTE de teste (CPF 11122233344) já existe.');
    }


    // 2. Criar usuário Parceiro
    const partnerPassword = 'parceiro123';
    const partnerHashedPassword = await bcrypt.hash(partnerPassword, 10);
    const partnerUserResult = await db.query(
      `INSERT INTO users (cpf, nome, email, senha_hash, tipo, status, nivel)
       VALUES ($1, $2, $3, $4, 'parceiro', 'ativo', 'bronze')
       ON CONFLICT (cpf) DO NOTHING
       RETURNING id`,
      ['22233344455', 'Parceiro de Teste', 'parceiro@email.com', partnerHashedPassword]
    );

    let partnerUserId;
    if (partnerUserResult.rows.length > 0) {
        partnerUserId = partnerUserResult.rows[0].id;
        console.log('--- Usuário PARCEIRO de teste criado ---');
        console.log(`ID do usuário parceiro: ${partnerUserId}`);
        console.log('Email: parceiro@email.com');
        console.log('Senha: parceiro123');
        console.log('------------------------------------');
    } else {
        const existingPartnerUser = await db.query('SELECT id FROM users WHERE cpf = $1', ['22233344455']);
        if(existingPartnerUser.rows.length === 0){
            throw new Error("Não foi possível criar ou encontrar o usuário parceiro de teste.");
        }
        partnerUserId = existingPartnerUser.rows[0].id;
        console.log(`Usuário PARCEIRO de teste (CPF 22233344455) já existe com ID ${partnerUserId}.`);
    }

    // 3. Criar registro na tabela 'partners' associado ao usuário parceiro
    const partnerRecordResult = await db.query(
        `INSERT INTO partners (user_id, nome_estabelecimento, cnpj, categoria, endereco, desconto_oferecido)
         VALUES ($1, 'Pizzaria Teste', '98765432000199', 'Restaurante', 'Rua Teste, 456', '10%')
         ON CONFLICT (user_id) DO NOTHING`,
        [partnerUserId]
    );
    if(partnerRecordResult.rowCount > 0){
        console.log('Registro de estabelecimento parceiro criado para o usuário parceiro.');
    } else {
        console.log('Estabelecimento parceiro para este usuário já existe.');
    }


    await db.query('COMMIT');
    console.log('Seeds de parceiro e cliente criados com sucesso!');

  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Erro ao criar seeds de parceiro/cliente:', err.stack);
  } finally {
    console.log('Processo de seeding finalizado.');
  }
}

createPartnerAndClientSeeds();
