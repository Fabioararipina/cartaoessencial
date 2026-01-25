const asaasService = require('../services/asaasService');
const db = require('../config/database');
const commissionService = require('../services/commissionService'); // NOVO: Importar commissionService

// @desc    Cria um cliente no Asaas e salva o ID no DB
// @route   POST /api/asaas/customers
// @access  Private (Admin/Partner - idealmente chamado internamente ou por rota específica)
const createAsaasCustomer = async (req, res) => {
    const { userId, nome, email, cpf, telefone } = req.body;

    if (!userId || !nome || !email || !cpf) {
        return res.status(400).json({ error: 'Dados incompletos para criar cliente Asaas.' });
    }

    try {
        const asaasCustomer = await asaasService.createCustomer({ nome, email, cpf, telefone });

        await db.query(
            'UPDATE users SET asaas_customer_id = $1 WHERE id = $2',
            [asaasCustomer.id, userId]
        );

        res.status(201).json({ message: 'Cliente Asaas criado e associado ao usuário.', asaasCustomerId: asaasCustomer.id });
    } catch (error) {
        console.error('Erro no controller createAsaasCustomer:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Cria uma cobrança no Asaas
// @route   POST /api/asaas/charges
// @access  Private (Admin/Partner)
const createAsaasCharge = async (req, res) => {
    const { userId, value, dueDate, description } = req.body;

    if (!userId || !value || !dueDate) {
        return res.status(400).json({ error: 'Dados incompletos para criar cobrança Asaas.' });
    }

    try {
        let userResult = await db.query('SELECT id, nome, email, cpf, telefone, asaas_customer_id FROM users WHERE id = $1', [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado no nosso sistema.' });
        }

        let user = userResult.rows[0];
        let asaasCustomerId = user.asaas_customer_id;

        // Se o usuário não tem um ID Asaas, crie um agora (on-demand)
        if (!asaasCustomerId) {
            console.log(`Cliente Asaas não encontrado para o usuário ${userId}. Criando um novo...`);
            const asaasCustomer = await asaasService.createCustomer({
                nome: user.nome,
                email: user.email,
                cpf: user.cpf,
                telefone: user.telefone
            });
            
            asaasCustomerId = asaasCustomer.id;

            // Salva o novo ID no nosso banco de dados
            await db.query(
                'UPDATE users SET asaas_customer_id = $1 WHERE id = $2',
                [asaasCustomerId, userId]
            );
            console.log(`Cliente Asaas ${asaasCustomerId} criado e salvo para o usuário ${userId}.`);
        }

        const charge = await asaasService.createCharge({
            asaas_customer_id: asaasCustomerId,
            value,
            dueDate,
            description,
            externalReference: `user_${userId}_${Date.now()}`
        });

        // Opcional: Salvar informações da cobrança no nosso DB
        await db.query(
            `INSERT INTO asaas_payments (user_id, asaas_payment_id, valor, status, billing_type, due_date, invoice_url, pix_qrcode)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                userId,
                charge.id,
                charge.value,
                charge.status.toLowerCase(), // Convertido para minúsculas
                charge.billingType,
                charge.dueDate,
                charge.invoiceUrl,
                charge.pixQrCode ? charge.pixQrCode.payload : null
            ]
        );

        res.status(201).json({ message: 'Cobrança Asaas criada com sucesso!', charge });
    } catch (error) {
        console.error('Erro no controller createAsaasCharge:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Recebe e processa webhooks do Asaas
// @route   POST /api/asaas/webhook
// @access  Public (validar token)
const handleWebhook = async (req, res) => {
    const asaasSignature = req.headers['asaas-access-token'];
    const isInternalTest = req.headers['x-internal-test'] === 'true';

    // Bypass signature check for internal tests
    if (!isInternalTest && !asaasService.verifyWebhookSignature(asaasSignature)) {
        console.warn('Webhook Asaas recebido com token inválido:', asaasSignature);
        return res.status(403).json({ error: 'Token de webhook inválido.' });
    }

    const event = req.body.event;
    const payment = req.body.payment;

    if (!payment || !payment.id) {
        return res.status(400).json({ error: 'Dados de pagamento ausentes no webhook.' });
    }

    const client = await db.connect(); // Usar transação para múltiplas operações
    try {
        await client.query('BEGIN');

        // 1. Atualizar o status do pagamento no nosso DB
        const paymentRecord = await client.query(
            `UPDATE asaas_payments SET status = $1, payment_date = $2, webhook_received_at = NOW()
             WHERE asaas_payment_id = $3 RETURNING user_id`,
            [payment.status.toLowerCase(), payment.clientPaymentDate || payment.date, payment.id]
        );

        if (paymentRecord.rows.length === 0) {
            // Se o pagamento não foi encontrado no nosso DB, pode ser um pagamento de fora ou um erro.
            // Poderíamos criar um registro aqui se a política permitir. Por agora, apenas logamos.
            console.warn(`Webhook Asaas: Pagamento ${payment.id} não encontrado no DB para atualização.`);
            
            // Tratar exclusão de pagamento mesmo se não encontrado (garantir limpeza)
            if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
                await client.query(
                    'DELETE FROM asaas_payments WHERE asaas_payment_id = $1',
                    [payment.id]
                );
                await client.query('COMMIT');
                console.log(`Webhook Asaas: Pagamento ${payment.id} (não rastreado) deletado do sistema.`);
                return res.status(200).json({ message: 'Pagamento removido do sistema.' });
            }

            await client.query('ROLLBACK');
            return res.status(200).json({ message: 'Webhook processado, pagamento não encontrado no DB.' });
        }

        const userId = paymentRecord.rows[0].user_id;
        let activatedUser = null;

        // Tratar exclusão de pagamento
        if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
            // Deletar o pagamento do nosso banco
            await client.query(
                'DELETE FROM asaas_payments WHERE asaas_payment_id = $1',
                [payment.id]
            );

            await client.query('COMMIT');
            console.log(`Webhook Asaas: Pagamento ${payment.id} deletado do sistema.`);
            return res.status(200).json({ message: 'Pagamento removido do sistema.' });
        }

        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            // 2. Ativar o usuário (se já não estiver ativo) e registrar o último pagamento.
            await client.query(
                'UPDATE users SET status = $1, last_payment = NOW() WHERE id = $2',
                ['ativo', userId]
            );

            // Buscar os dados do usuário que pagou, para verificar se ele foi indicado.
            const paidUserResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            const paidUser = paidUserResult.rows[0];

            // NOVO: Calcular e salvar comissão e pontos se houver um indicador
            if (paidUser && paidUser.referred_by) {
                const referrerId = paidUser.referred_by;
                const referredId = paidUser.id; // The user who made the payment
                const paymentValue = payment.value;

                // Fetch referrer details including their 'tipo'
                const referrerQueryResult = await client.query(
                    'SELECT id, nome, tipo, nivel, total_indicacoes FROM users WHERE id = $1',
                    [referrerId]
                );

                if (referrerQueryResult.rows.length === 0) {
                    console.warn(`Referrer ${referrerId} not found. Skipping commission/points calculation.`);
                } else {
                    const referrer = referrerQueryResult.rows[0];

                    // Parsear data corretamente - usar confirmedDate ou paymentDate ou data atual
                    let paymentDate;
                    const rawDate = payment.confirmedDate || payment.clientPaymentDate || payment.paymentDate || payment.dateCreated;
                    if (rawDate) {
                        paymentDate = new Date(rawDate);
                        // Verificar se a data é válida (não é NaN e não é epoch/1970)
                        if (isNaN(paymentDate.getTime()) || paymentDate.getFullYear() < 2000) {
                            console.warn(`Invalid payment date from Asaas: ${rawDate}, using current date`);
                            paymentDate = new Date();
                        }
                    } else {
                        console.warn('No payment date from Asaas, using current date');
                        paymentDate = new Date();
                    }

                    const asaasPaymentId = payment.id; // Asaas payment ID

                    // Find the ID of the asaas_payments record in our DB using the asaasPaymentId
                    const ourPaymentRecord = await client.query(
                        `SELECT id FROM asaas_payments WHERE asaas_payment_id = $1`,
                        [asaasPaymentId]
                    );
                    const ourDbPaymentId = ourPaymentRecord.rows[0]?.id;

                    // Determina se a comissão é de 'primeiro pagamento' ou 'recorrente'
                    const referralResult = await client.query(
                        `SELECT id, status FROM referrals WHERE referrer_id = $1 AND referred_id = $2`,
                        [referrerId, referredId]
                    );

                    const isFirstPayment = referralResult.rows.length > 0 && referralResult.rows[0].status === 'pendente';
                    const commissionType = isFirstPayment ? 'first' : 'recurring';

                    // --- CÁLCULO DE COMISSÃO (PARA TODOS OS PAGAMENTOS) ---
                    if (ourDbPaymentId) {
                        await commissionService.calculateAndSaveCommission(
                            referrerId,
                            referredId,
                            paymentValue,
                            paymentDate,
                            ourDbPaymentId,
                            commissionType // Passando o tipo de comissão
                        );
                    } else {
                        console.warn(`Commission calculation skipped: Asaas payment ID ${asaasPaymentId} not found in our local DB.`);
                    }

                    // --- CONCESSÃO DE PONTOS E ATUALIZAÇÃO DO STATUS DA INDICAÇÃO (APENAS 1ª VEZ) ---
                    if (referrer.tipo === 'cliente' && isFirstPayment) {
                        const PONTOS_INDICACAO = {
                            bronze: 200, prata: 250, ouro: 300, diamante: 400
                        };
                        const pointsToAward = PONTOS_INDICACAO[referrer.nivel] || PONTOS_INDICACAO.bronze;
    
                        await client.query(`
                            INSERT INTO points_ledger (user_id, points, type, description, earned_at, expires_at, renewable, redeemed)
                            VALUES ($1, $2, 'referral', $3, NOW(), NOW() + INTERVAL '12 months', TRUE, FALSE)
                        `, [referrerId, pointsToAward, `Pontos por indicação do cliente ${paidUser.nome}`]);

                        await client.query(`
                            UPDATE users SET total_indicacoes = total_indicacoes + 1 WHERE id = $1
                        `, [referrerId]);

                        // Atualiza a indicação para 'convertido' para não dar pontos/comissão de 1ª venda novamente
                        await client.query(`
                            UPDATE referrals
                            SET status = 'convertido', points_awarded = $1, conversion_date = NOW()
                            WHERE id = $2
                        `, [pointsToAward, referralResult.rows[0].id]);
                        
                        console.log(`Points (${pointsToAward}) awarded to client referrer ${referrerId} for referring ${referredId}.`);
                    }
                }
            }
        }

        await client.query('COMMIT');
        console.log(`Webhook Asaas processado com sucesso: ${event} para pagamento ${payment.id}`);
        return res.status(200).json({ message: 'Webhook processado com sucesso.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao processar webhook Asaas:', error);
        return res.status(500).json({ error: 'Erro interno ao processar webhook.' });
    } finally {
        client.release();
    }
};

// @desc    Cria uma assinatura recorrente no Asaas (modelo de 12 meses)
// @route   POST /api/asaas/subscriptions
// @access  Private (Admin/Partner)
const createAsaasSubscription = async (req, res) => {
    console.log('--- EXECUTANDO O CÓDIGO COM O TESTE DE LOG ---'); // <--- ADICIONE ESTA LINHA
    const { userId, value, nextDueDate, billingType, description } = req.body;

    if (!userId || !value) {
        return res.status(400).json({ error: 'Dados incompletos para criar assinatura.' });
    }

    try {
        let userResult = await db.query(
            'SELECT id, nome, email, cpf, telefone, asaas_customer_id FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        let user = userResult.rows[0];
        let asaasCustomerId = user.asaas_customer_id;

        // Se o usuário não tem um ID Asaas, crie um agora
        if (!asaasCustomerId) {
            console.log(`Cliente Asaas não encontrado para o usuário ${userId}. Criando...`);
            const asaasCustomer = await asaasService.createCustomer({
                nome: user.nome,
                email: user.email,
                cpf: user.cpf,
                telefone: user.telefone
            });

            asaasCustomerId = asaasCustomer.id;
            await db.query(
                'UPDATE users SET asaas_customer_id = $1 WHERE id = $2',
                [asaasCustomerId, userId]
            );
        }

        // Calcular data da primeira cobrança (hoje ou data informada)
        const dueDate = nextDueDate || new Date().toISOString().split('T')[0];

        const subscription = await asaasService.createSubscription({
            asaas_customer_id: asaasCustomerId,
            value,
            nextDueDate: dueDate,
            billingType: billingType || 'UNDEFINED', // Permite escolher PIX, Boleto ou Cartão
            cycle: 'MONTHLY',
            maxPayments: 12, // 12 meses
            description: description || `Assinatura Essencial Saúde - ${user.nome}`,
            externalReference: `subscription_user_${userId}_${Date.now()}`
        });

        // Salvar assinatura no nosso banco
        await db.query(
            `INSERT INTO asaas_subscriptions
             (user_id, asaas_subscription_id, valor, ciclo, status, billing_type, next_due_date, max_payments)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                userId,
                subscription.id,
                subscription.value,
                subscription.cycle,
                subscription.status,
                subscription.billingType,
                subscription.nextDueDate,
                12
            ]
        );

        // Buscar a primeira cobrança da assinatura para obter link da fatura
        let firstPayment = null;
        try {
            const paymentsResponse = await asaasService.getSubscriptionPayments(subscription.id);
            if (paymentsResponse.data && paymentsResponse.data.length > 0) {
                firstPayment = paymentsResponse.data[0];

                // Se for PIX, buscar QR Code
                if (firstPayment.billingType === 'PIX' || billingType === 'PIX') {
                    try {
                        const pixData = await asaasService.getPixQrCode(firstPayment.id);
                        firstPayment.pixQrCode = pixData.encodedImage;
                        firstPayment.pixCopyPaste = pixData.payload;
                    } catch (pixError) {
                        console.warn('Não foi possível obter QR Code PIX:', pixError.message);
                    }
                }
            }

            // INSERIR A PRIMEIRA COBRANÇA NO NOSSO BANCO DE DADOS para que o webhook a encontre
            if (firstPayment) {
                let billingTypeForDb = firstPayment.billingType;
                const allowedTypes = ['BOLETO', 'PIX', 'CREDIT_CARD'];
                if (!allowedTypes.includes(billingTypeForDb)) {
                    billingTypeForDb = null; // Garante que não viole a constraint ENUM
                }

                await db.query(
                    `INSERT INTO asaas_payments (user_id, asaas_payment_id, valor, status, billing_type, due_date, invoice_url, pix_qrcode)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (asaas_payment_id) DO NOTHING`, // Prevenir erros de duplicata
                    [
                        userId,
                        firstPayment.id,
                        firstPayment.value,
                        firstPayment.status.toLowerCase(),
                        billingTypeForDb, // Usa a variável tratada
                        firstPayment.dueDate,
                        firstPayment.invoiceUrl,
                        firstPayment.pixCopyPaste || null // Usar o payload do QR Code
                    ]
                );
            }
        } catch (paymentError) {
            console.warn('Não foi possível buscar cobranças da assinatura:', paymentError.message);
        }

        res.status(201).json({
            message: 'Assinatura criada com sucesso!',
            subscription: {
                id: subscription.id,
                value: subscription.value,
                cycle: subscription.cycle,
                nextDueDate: subscription.nextDueDate,
                status: subscription.status,
                // Dados da primeira cobrança para exibir no frontend
                invoiceUrl: firstPayment?.invoiceUrl,
                pixQrCode: firstPayment?.pixQrCode,
                pixCopyPaste: firstPayment?.pixCopyPaste,
                firstPaymentId: firstPayment?.id
            }
        });
    } catch (error) {
        console.error('Erro ao criar assinatura:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Cancela uma assinatura no Asaas, aplicando multa se configurado
// @route   DELETE /api/asaas/subscriptions/:subscriptionId
// @access  Private (Admin)
const cancelAsaasSubscription = async (req, res) => {
    const { subscriptionId } = req.params;

    try {
        // 1. Buscar a configuração de multa do banco de dados
        const configResult = await db.query(
            "SELECT config_value FROM system_configs WHERE config_key = 'CANCELLATION_FEE_PERCENTAGE'"
        );
        
        const feePercentage = parseFloat(configResult.rows[0]?.config_value || '0');

        // 2. Se a multa for maior que zero, criar a cobrança da multa
        if (feePercentage > 0) {
            // Buscar detalhes da assinatura para obter o valor e o ID do cliente
            const subscription = await asaasService.getSubscription(subscriptionId);
            if (!subscription) {
                return res.status(404).json({ error: 'Assinatura não encontrada no Asaas.' });
            }

            const penaltyValue = (subscription.value * feePercentage) / 100;
            const ASAAS_MIN_CHARGE = 5.00; // Valor mínimo de cobrança no Asaas para "Pergunte ao Cliente"

            if (penaltyValue > 0) {
                if (penaltyValue < ASAAS_MIN_CHARGE) {
                    console.warn(`Multa de cancelamento (${penaltyValue.toFixed(2)}) abaixo do mínimo do Asaas (${ASAAS_MIN_CHARGE}). Cobrança de multa não será gerada.`);
                    // Não gera a cobrança se for menor que o mínimo
                } else {
                    // Criar uma nova cobrança avulsa para a multa
                    await asaasService.createCharge({
                        asaas_customer_id: subscription.customer,
                        billingType: 'UNDEFINED', // Cliente escolhe como pagar
                        value: penaltyValue,
                        dueDate: new Date().toISOString().split('T')[0], // Vence hoje
                        description: `Multa por cancelamento da assinatura ${subscription.id}`,
                        externalReference: `cancel_fee_${subscription.id}`
                    });
                }
            }
        }

        // Etapa de multa finalizada.

        // NOVO: 3. Buscar e deletar cobranças pendentes da assinatura
        const payments = await asaasService.getSubscriptionPayments(subscriptionId);
        if (payments && payments.data) {
            const pendingPayments = payments.data.filter(p => p.status === 'PENDING');
            console.log(`Encontradas ${pendingPayments.length} cobranças pendentes para deletar.`);
            for (const payment of pendingPayments) {
                await asaasService.deletePayment(payment.id);
            }
        }

        // 4. Cancelar a assinatura no Asaas
        await asaasService.cancelSubscription(subscriptionId);

        // 5. Atualizar o status da assinatura no nosso banco de dados
        await db.query(
            `UPDATE asaas_subscriptions
             SET status = 'INACTIVE', cancelled_at = NOW(), updated_at = NOW()
             WHERE asaas_subscription_id = $1`,
            [subscriptionId]
        );

        res.json({ message: 'Assinatura cancelada com sucesso. Cobranças pendentes removidas e multa gerada, se aplicável.' });
    } catch (error) {
        console.error('Erro ao cancelar assinatura:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Cria um carnê (parcelamento) no Asaas
// @route   POST /api/asaas/installments
// @access  Private (Admin/Partner)
const createAsaasInstallment = async (req, res) => {
    const { userId, description } = req.body;
    const installmentCount = 12; // Fixo em 12 parcelas
    const installmentValue = 49.90; // Valor de cada parcela. TODO: buscar de uma config

    if (!userId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório para criar carnê.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        let userResult = await client.query('SELECT id, nome, email, cpf, telefone, asaas_customer_id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        let user = userResult.rows[0];
        let asaasCustomerId = user.asaas_customer_id;

        if (!asaasCustomerId) {
            console.log(`Cliente Asaas não encontrado para o usuário ${userId}. Criando...`);
            const asaasCustomer = await asaasService.createCustomer({
                nome: user.nome, email: user.email, cpf: user.cpf, telefone: user.telefone
            });
            asaasCustomerId = asaasCustomer.id;
            await client.query('UPDATE users SET asaas_customer_id = $1 WHERE id = $2', [asaasCustomerId, userId]);
        }

        const firstDueDate = new Date();
        firstDueDate.setDate(firstDueDate.getDate() + 3); // Vencimento da primeira parcela em 3 dias

        // Criar o pagamento parcelado no Asaas
        const firstPayment = await asaasService.createInstallment({
            asaas_customer_id: asaasCustomerId,
            installmentValue,
            installmentCount,
            firstDueDate: firstDueDate.toISOString().split('T')[0],
            description: description || `Plano Anual (Carnê) Essencial Saúde - ${user.nome}`,
            externalReference: `installment_user_${userId}_${Date.now()}`
        });

        // O Asaas retorna o primeiro pagamento com um campo 'installment' contendo o ID do parcelamento
        // Precisamos buscar todas as parcelas usando esse ID
        const installmentId = firstPayment.installment;

        if (!installmentId) {
            throw new Error('Asaas não retornou o ID do parcelamento.');
        }

        // Aguardar um pouco para o Asaas processar todas as parcelas
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Buscar todas as parcelas do carnê usando o endpoint correto
        // Tentar até 3 vezes se não retornar todas as parcelas
        let allPayments = [];
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const allPaymentsResponse = await asaasService.asaasApi.get(`/installments/${installmentId}/payments?limit=20`);
                allPayments = allPaymentsResponse.data?.data || [];

                console.log(`Tentativa ${attempts}: Encontradas ${allPayments.length} parcelas para o carnê ${installmentId}`);

                if (allPayments.length >= installmentCount) {
                    break; // Encontrou todas as parcelas
                }

                // Se não encontrou todas, aguarda mais um pouco e tenta novamente
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            } catch (fetchError) {
                console.warn(`Erro ao buscar parcelas (tentativa ${attempts}):`, fetchError.message);
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
        }

        if (allPayments.length === 0) {
            // Se não conseguiu buscar, pelo menos salva o primeiro pagamento
            console.warn('Não foi possível buscar parcelas, salvando apenas o primeiro pagamento');
            allPayments.push(firstPayment);
        }

        // Ordenar parcelas por installmentNumber para garantir ordem correta
        allPayments.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));

        console.log(`Total de parcelas a salvar: ${allPayments.length}`);

        // Debug: mostrar estrutura da primeira parcela
        if (allPayments.length > 0) {
            console.log('Estrutura da primeira parcela:', JSON.stringify(allPayments[0], null, 2));
        }

        // Salvar todas as parcelas no nosso banco de dados
        for (const payment of allPayments) {
            await client.query(
                `INSERT INTO asaas_payments (user_id, asaas_payment_id, valor, status, billing_type, due_date, invoice_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (asaas_payment_id) DO NOTHING`,
                [
                    userId, payment.id, payment.value, payment.status.toLowerCase(),
                    payment.billingType, payment.dueDate, payment.invoiceUrl
                ]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Carnê criado com sucesso!',
            installment: {
                id: installmentId,
                totalValue: installmentValue * installmentCount,
                installmentCount: installmentCount,
                installmentValue: installmentValue,
                // URL do carnê completo (todos os boletos)
                bankSlipUrl: firstPayment.bankSlipUrl,
                // URL do primeiro boleto individual
                invoiceUrl: firstPayment.invoiceUrl,
                payments: allPayments.map(p => ({
                    id: p.id,
                    value: p.value,
                    dueDate: p.dueDate,
                    status: p.status,
                    invoiceUrl: p.invoiceUrl
                }))
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar carnê:', error.stack);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

// @desc    Cria um carnê (parcelamento) no Asaas para um usuário recém cadastrado (PÚBLICO)
// @route   POST /api/asaas/public/installments
// @access  Public
const createPublicAsaasInstallment = async (req, res) => {
    const { userId, description } = req.body;
    const installmentCount = 12; // Fixo em 12 parcelas
    const installmentValue = 49.90; // Valor de cada parcela. TODO: buscar de uma config

    if (!userId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório para criar carnê.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        let userResult = await client.query('SELECT id, nome, email, cpf, telefone, asaas_customer_id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        let user = userResult.rows[0];
        let asaasCustomerId = user.asaas_customer_id;

        if (!asaasCustomerId) {
            console.log(`Cliente Asaas não encontrado para o usuário ${userId}. Criando...`);
            const asaasCustomer = await asaasService.createCustomer({
                nome: user.nome, email: user.email, cpf: user.cpf, telefone: user.telefone
            });
            asaasCustomerId = asaasCustomer.id;
            await client.query('UPDATE users SET asaas_customer_id = $1 WHERE id = $2', [asaasCustomerId, userId]);
        }

        const firstDueDate = new Date();
        firstDueDate.setDate(firstDueDate.getDate() + 3); // Vencimento da primeira parcela em 3 dias

        // Criar o pagamento parcelado no Asaas
        const firstPayment = await asaasService.createInstallment({
            asaas_customer_id: asaasCustomerId,
            installmentValue,
            installmentCount,
            firstDueDate: firstDueDate.toISOString().split('T')[0],
            description: description || `Plano Anual (Carnê) Essencial Saúde - ${user.nome}`,
            externalReference: `installment_user_${userId}_${Date.now()}`
        });

        // O Asaas retorna o primeiro pagamento com um campo 'installment' contendo o ID do parcelamento
        // Precisamos buscar todas as parcelas usando esse ID
        const installmentId = firstPayment.installment;

        if (!installmentId) {
            throw new Error('Asaas não retornou o ID do parcelamento.');
        }

        // Aguardar um pouco para o Asaas processar todas as parcelas
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Buscar todas as parcelas do carnê usando o endpoint correto
        // Tentar até 3 vezes se não retornar todas as parcelas
        let allPayments = [];
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const allPaymentsResponse = await asaasService.asaasApi.get(`/installments/${installmentId}/payments?limit=20`);
                allPayments = allPaymentsResponse.data?.data || [];

                console.log(`Tentativa ${attempts}: Encontradas ${allPayments.length} parcelas para o carnê ${installmentId}`);

                if (allPayments.length >= installmentCount) {
                    break; // Encontrou todas as parcelas
                }

                // Se não encontrou todas, aguarda mais um pouco e tenta novamente
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            } catch (fetchError) {
                console.warn(`Erro ao buscar parcelas (tentativa ${attempts}):`, fetchError.message);
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
        }

        if (allPayments.length === 0) {
            // Se não conseguiu buscar, pelo menos salva o primeiro pagamento
            console.warn('Não foi possível buscar parcelas, salvando apenas o primeiro pagamento');
            allPayments.push(firstPayment);
        }

        // Ordenar parcelas por installmentNumber para garantir ordem correta
        allPayments.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));

        console.log(`Total de parcelas a salvar: ${allPayments.length}`);

        // Debug: mostrar estrutura da primeira parcela
        if (allPayments.length > 0) {
            console.log('Estrutura da primeira parcela:', JSON.stringify(allPayments[0], null, 2));
        }

        // Salvar todas as parcelas no nosso banco de dados
        for (const payment of allPayments) {
            await client.query(
                `INSERT INTO asaas_payments (user_id, asaas_payment_id, valor, status, billing_type, due_date, invoice_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (asaas_payment_id) DO NOTHING`,
                [
                    userId, payment.id, payment.value, payment.status.toLowerCase(),
                    payment.billingType, payment.dueDate, payment.invoiceUrl
                ]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Carnê criado com sucesso!',
            installment: {
                id: installmentId,
                totalValue: installmentValue * installmentCount,
                installmentCount: installmentCount,
                installmentValue: installmentValue,
                // URL do carnê completo (todos os boletos)
                bankSlipUrl: firstPayment.bankSlipUrl,
                // URL do primeiro boleto individual
                invoiceUrl: firstPayment.invoiceUrl,
                payments: allPayments.map(p => ({
                    id: p.id,
                    value: p.value,
                    dueDate: p.dueDate,
                    status: p.status,
                    invoiceUrl: p.invoiceUrl
                }))
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar carnê:', error.stack);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

// @desc    Lista todos os boletos/pagamentos de um usuário
// @route   GET /api/asaas/payments/:userId
// @access  Private (Admin/Partner ou próprio usuário)
const getUserPayments = async (req, res) => {
    const { userId } = req.params;
    const { status, installment } = req.query; // Filtros opcionais

    try {
        let query = `
            SELECT
                ap.id,
                ap.asaas_payment_id,
                ap.valor,
                ap.status,
                ap.billing_type,
                ap.due_date,
                ap.payment_date,
                ap.invoice_url,
                ap.pix_qrcode,
                ap.created_at,
                u.nome as cliente_nome,
                u.cpf as cliente_cpf
            FROM asaas_payments ap
            JOIN users u ON ap.user_id = u.id
            WHERE ap.user_id = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        if (status) {
            query += ` AND ap.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY ap.due_date ASC`;

        const result = await db.query(query, params);

        res.json({
            payments: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Erro ao buscar pagamentos do usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
    }
};

// @desc    Busca pagamentos por ID, CPF ou Email do usuário
// @route   GET /api/asaas/payments-search?q=valor
// @access  Private (Admin/Partner)
const searchUserPayments = async (req, res) => {
    const { q } = req.query;

    if (!q || !q.trim()) {
        return res.status(400).json({ error: 'Informe um ID, CPF ou Email para buscar.' });
    }

    const searchTerm = q.trim();

    try {
        // Primeiro, encontrar o usuário por ID, CPF ou Email
        let userQuery;
        let userParams;

        // Verificar se é número (ID) ou texto (CPF/Email)
        if (/^\d+$/.test(searchTerm)) {
            // Busca por ID ou CPF (apenas números)
            userQuery = `SELECT id, nome, cpf, email FROM users WHERE id = $1 OR cpf = $1 LIMIT 1`;
            userParams = [searchTerm];
        } else if (searchTerm.includes('@')) {
            // Busca por Email
            userQuery = `SELECT id, nome, cpf, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`;
            userParams = [searchTerm];
        } else {
            // Busca por CPF (pode ter pontos/traços)
            const cpfLimpo = searchTerm.replace(/\D/g, '');
            userQuery = `SELECT id, nome, cpf, email FROM users WHERE cpf = $1 LIMIT 1`;
            userParams = [cpfLimpo];
        }

        const userResult = await db.query(userQuery, userParams);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado com esse ID, CPF ou Email.' });
        }

        const user = userResult.rows[0];

        // Agora buscar os pagamentos desse usuário
        const paymentsQuery = `
            SELECT
                ap.id,
                ap.asaas_payment_id,
                ap.valor,
                ap.status,
                ap.billing_type,
                ap.due_date,
                ap.payment_date,
                ap.invoice_url,
                ap.pix_qrcode,
                ap.created_at,
                u.nome as cliente_nome,
                u.cpf as cliente_cpf,
                u.id as user_id
            FROM asaas_payments ap
            JOIN users u ON ap.user_id = u.id
            WHERE ap.user_id = $1
            ORDER BY ap.due_date ASC
        `;

        const paymentsResult = await db.query(paymentsQuery, [user.id]);

        res.json({
            user: {
                id: user.id,
                nome: user.nome,
                cpf: user.cpf,
                email: user.email
            },
            payments: paymentsResult.rows,
            total: paymentsResult.rows.length
        });
    } catch (error) {
        console.error('Erro ao buscar pagamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
    }
};

// @desc    Busca o link do boleto diretamente no Asaas (para garantir URL atualizada)
// @route   GET /api/asaas/payment/:paymentId/bankslip
// @access  Private
const getPaymentBankSlip = async (req, res) => {
    const { paymentId } = req.params;

    try {
        // Buscar detalhes do pagamento no Asaas
        const payment = await asaasService.getPaymentStatus(paymentId);

        res.json({
            id: payment.id,
            bankSlipUrl: payment.bankSlipUrl,
            invoiceUrl: payment.invoiceUrl,
            status: payment.status,
            value: payment.value,
            dueDate: payment.dueDate
        });
    } catch (error) {
        console.error('Erro ao buscar boleto:', error);
        res.status(500).json({ error: 'Erro ao buscar boleto.' });
    }
};

// @desc    Sincroniza boletos de um usuário com o Asaas (busca do Asaas e atualiza no banco)
// @route   POST /api/asaas/sync-payments/:userId
// @access  Private (Admin/Partner)
const syncUserPayments = async (req, res) => {
    const { userId } = req.params;

    try {
        // Buscar o asaas_customer_id do usuário
        const userResult = await db.query(
            'SELECT id, nome, asaas_customer_id FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const user = userResult.rows[0];

        if (!user.asaas_customer_id) {
            return res.status(400).json({ error: 'Usuário não possui cliente Asaas vinculado.' });
        }

        // Buscar todos os pagamentos do cliente no Asaas
        const asaasResponse = await asaasService.asaasApi.get(`/payments?customer=${user.asaas_customer_id}&limit=100`);
        const asaasPayments = asaasResponse.data?.data || [];

        console.log(`Sincronizando ${asaasPayments.length} pagamentos do Asaas para o usuário ${userId}`);

        // NOVO: Criar um Set com todos os IDs de pagamento vindos do Asaas
        const asaasPaymentIds = new Set(asaasPayments.map(p => p.id));

        // NOVO: Buscar todos os pagamentos locais deste usuário
        const localPaymentsResult = await db.query(
            'SELECT id, asaas_payment_id FROM asaas_payments WHERE user_id = $1',
            [userId]
        );

        // NOVO: Deletar pagamentos locais que não existem mais no Asaas (órfãos)
        let deleted = 0;
        for (const localPayment of localPaymentsResult.rows) {
            if (!asaasPaymentIds.has(localPayment.asaas_payment_id)) {
                console.log(`Deletando pagamento órfão: ${localPayment.asaas_payment_id} (ID local: ${localPayment.id})`);
                await db.query('DELETE FROM asaas_payments WHERE id = $1', [localPayment.id]);
                deleted++;
            }
        }

        let inserted = 0;
        let updated = 0;

        for (const payment of asaasPayments) {
            // Verificar se já existe no banco
            const existingResult = await db.query(
                'SELECT id, status FROM asaas_payments WHERE asaas_payment_id = $1',
                [payment.id]
            );

            if (existingResult.rows.length === 0) {
                // Inserir novo

                // Tratar billing_type para evitar erro de constraint
                const allowedBillingTypes = ['BOLETO', 'PIX', 'CREDIT_CARD'];
                let billingTypeForDb = payment.billingType;
                if (!allowedBillingTypes.includes(billingTypeForDb)) {
                    billingTypeForDb = null;
                }

                await db.query(
                    `INSERT INTO asaas_payments (user_id, asaas_payment_id, valor, status, billing_type, due_date, invoice_url, payment_date)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        userId,
                        payment.id,
                        payment.value,
                        payment.status.toLowerCase(),
                        billingTypeForDb,
                        payment.dueDate,
                        payment.invoiceUrl,
                        payment.paymentDate || null
                    ]
                );
                inserted++;
            } else {
                // Atualizar status se mudou
                if (existingResult.rows[0].status !== payment.status.toLowerCase()) {
                    await db.query(
                        `UPDATE asaas_payments SET status = $1, payment_date = $2, invoice_url = $3, updated_at = NOW()
                         WHERE asaas_payment_id = $4`,
                        [payment.status.toLowerCase(), payment.paymentDate || null, payment.invoiceUrl, payment.id]
                    );
                    updated++;
                }
            }
        }

        res.json({
            message: 'Sincronização concluída!',
            userId,
            userName: user.nome,
            totalFromAsaas: asaasPayments.length,
            inserted,
            updated,
            deleted // NOVO: Incluir contagem de deletados na resposta
        });

    } catch (error) {
        console.error('Erro ao sincronizar pagamentos:', error);
        res.status(500).json({ error: 'Erro ao sincronizar pagamentos com o Asaas.' });
    }
};

// @desc    Deleta um pagamento do sistema e do Asaas
// @route   DELETE /api/asaas/payments/:paymentId
// @access  Private (Admin)
const deletePayment = async (req, res) => {
    const { paymentId } = req.params; // ID interno do nosso banco

    try {
        // 1. Buscar o pagamento no nosso banco
        const paymentResult = await db.query(
            'SELECT id, asaas_payment_id, status FROM asaas_payments WHERE id = $1',
            [paymentId]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pagamento não encontrado.' });
        }

        const payment = paymentResult.rows[0];

        // 2. Se tiver ID do Asaas e status pendente, deletar do Asaas primeiro
        if (payment.asaas_payment_id && payment.status === 'pending') {
            console.log(`[deletePayment] Tentando deletar boleto ${payment.asaas_payment_id} no Asaas...`);
            try {
                const response = await asaasService.deletePayment(payment.asaas_payment_id);
                console.log(`[deletePayment] Boleto ${payment.asaas_payment_id} deletado com sucesso do Asaas.`, response);
            } catch (asaasError) {
                console.error(
                    `[deletePayment] Erro CRÍTICO ao deletar boleto ${payment.asaas_payment_id} do Asaas:`,
                    asaasError.message,
                    asaasError.response?.data
                );

                // Retornar erro para o usuário e NÃO continuar
                return res.status(502).json({
                    error: 'Erro ao se comunicar com o Asaas para deletar o pagamento. O boleto NÃO foi deletado.',
                    details: asaasError.message
                });
            }
        }

        // 3. Deletar do nosso banco SÓ DEPOIS de ter certeza que foi deletado do Asaas
        await db.query('DELETE FROM asaas_payments WHERE id = $1', [paymentId]);
        console.log(`[deletePayment] Pagamento ${paymentId} deletado do banco de dados local.`);

        res.json({ message: 'Pagamento deletado com sucesso.' });

    } catch (error) {
        console.error('[deletePayment] Erro geral ao deletar pagamento:', error);
        res.status(500).json({ error: 'Erro ao deletar pagamento.' });
    }
};

// @desc    Lista todos os boletos/pagamentos com filtros e resumo
// @route   GET /api/asaas/all-payments
// @access  Private (Admin)
const getAllPayments = async (req, res) => {
    const { status, search, limit = 50, offset = 0 } = req.query;

    try {
        // 1. Buscar resumo geral (cards)
        const summaryResult = await db.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'pending') as pendentes,
                COUNT(*) FILTER (WHERE status IN ('received', 'confirmed')) as pagos,
                COUNT(*) FILTER (WHERE status = 'overdue') as vencidos,
                COALESCE(SUM(valor) FILTER (WHERE status = 'pending'), 0) as valor_pendente,
                COALESCE(SUM(valor) FILTER (WHERE status IN ('received', 'confirmed')), 0) as valor_pago,
                COALESCE(SUM(valor) FILTER (WHERE status = 'overdue'), 0) as valor_vencido
            FROM asaas_payments
        `);

        // 2. Construir query de pagamentos com filtros
        let query = `
            SELECT
                ap.id,
                ap.asaas_payment_id,
                ap.valor,
                ap.status,
                ap.billing_type,
                ap.due_date,
                ap.payment_date,
                ap.invoice_url,
                ap.created_at,
                u.id as user_id,
                u.nome as cliente_nome,
                u.cpf as cliente_cpf,
                u.email as cliente_email
            FROM asaas_payments ap
            JOIN users u ON ap.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Filtro por status
        if (status && status !== 'todos') {
            if (status === 'pagos') {
                query += ` AND ap.status IN ('received', 'confirmed')`;
            } else {
                query += ` AND ap.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }
        }

        // Filtro por busca (nome, cpf ou email)
        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            query += ` AND (u.nome ILIKE $${paramIndex} OR u.cpf LIKE $${paramIndex + 1} OR u.email ILIKE $${paramIndex + 2})`;
            params.push(searchTerm, search.trim().replace(/\D/g, '') + '%', searchTerm);
            paramIndex += 3;
        }

        // Ordenação e paginação
        query += ` ORDER BY ap.due_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const paymentsResult = await db.query(query, params);

        // 3. Contar total para paginação
        let countQuery = `
            SELECT COUNT(*) as total
            FROM asaas_payments ap
            JOIN users u ON ap.user_id = u.id
            WHERE 1=1
        `;
        const countParams = [];
        let countParamIndex = 1;

        if (status && status !== 'todos') {
            if (status === 'pagos') {
                countQuery += ` AND ap.status IN ('received', 'confirmed')`;
            } else {
                countQuery += ` AND ap.status = $${countParamIndex}`;
                countParams.push(status);
                countParamIndex++;
            }
        }

        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            countQuery += ` AND (u.nome ILIKE $${countParamIndex} OR u.cpf LIKE $${countParamIndex + 1} OR u.email ILIKE $${countParamIndex + 2})`;
            countParams.push(searchTerm, search.trim().replace(/\D/g, '') + '%', searchTerm);
        }

        const countResult = await db.query(countQuery, countParams);

        res.json({
            summary: {
                total: parseInt(summaryResult.rows[0].total),
                pendentes: parseInt(summaryResult.rows[0].pendentes),
                pagos: parseInt(summaryResult.rows[0].pagos),
                vencidos: parseInt(summaryResult.rows[0].vencidos),
                valorPendente: parseFloat(summaryResult.rows[0].valor_pendente),
                valorPago: parseFloat(summaryResult.rows[0].valor_pago),
                valorVencido: parseFloat(summaryResult.rows[0].valor_vencido)
            },
            payments: paymentsResult.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Erro ao buscar todos os pagamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
    }
};

module.exports = {
    createAsaasCustomer,
    createAsaasCharge,
    handleWebhook,
    createAsaasSubscription,
    cancelAsaasSubscription,
    createAsaasInstallment,
    createPublicAsaasInstallment,
    getUserPayments,
    searchUserPayments,
    getPaymentBankSlip,
    syncUserPayments,
    deletePayment,
    getAllPayments,
};

