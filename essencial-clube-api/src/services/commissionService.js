console.log('--- EXECUTANDO commissionService.js v3 ---'); // MARCADOR DE VERSÃO PARA DEBUG
const db = require('../config/database');

const commissionService = {

    /**
     * Retrieves the active and applicable commission configuration for a given referrer at a specific date.
     * Prioritizes user-specific configurations, then role-specific, and finally 'all'.
     * @param {number} referrerId - The user ID of the referrer.
     * @param {Date} paymentDate - The date of the payment, used to check config validity dates.
     * @returns {Promise<object|null>} The applicable commission configuration, or null if none found.
     */
    getActiveConfigForUser: async (referrerId, paymentDate) => {
        // 1. Try to find a user-specific configuration (highest priority)
        const userConfigResult = await db.query(
            `SELECT cc.*
            FROM user_commission_config ucc
            JOIN commission_configs cc ON ucc.commission_config_id = cc.id
            WHERE ucc.user_id = $1
            AND cc.active = TRUE
            AND (cc.valid_from IS NULL OR cc.valid_from <= $2)
            AND (cc.valid_until IS NULL OR cc.valid_until >= $2)
            ORDER BY cc.created_at DESC LIMIT 1`,
            [referrerId, paymentDate]
        );

        if (userConfigResult.rows.length > 0) {
            console.log(`Found user-specific commission config for user ${referrerId}`);
            return userConfigResult.rows[0];
        }

        // 2. If no user-specific config, find role-specific config
        const referrerTypeResult = await db.query(`SELECT tipo FROM users WHERE id = $1`, [referrerId]);
        const referrerType = referrerTypeResult.rows[0]?.tipo;

        if (referrerType) {
            const roleConfigResult = await db.query(
                `SELECT *
                FROM commission_configs
                WHERE active = TRUE
                AND applies_to = $1
                AND (valid_from IS NULL OR valid_from <= $2)
                AND (valid_until IS NULL OR valid_until >= $2)
                ORDER BY created_at DESC LIMIT 1`,
                [referrerType, paymentDate]
            );
            if (roleConfigResult.rows.length > 0) {
                console.log(`Found role-specific commission config for role '${referrerType}'`);
                return roleConfigResult.rows[0];
            }
        }

        // 3. If no role-specific config, fallback to a global 'all' config
        const defaultConfigResult = await db.query(
            `SELECT *
            FROM commission_configs
            WHERE active = TRUE AND applies_to = 'all'
            AND (valid_from IS NULL OR valid_from <= $1)
            AND (valid_until IS NULL OR valid_until >= $1)
            ORDER BY created_at DESC LIMIT 1`,
            [paymentDate]
        );
        if (defaultConfigResult.rows.length > 0) {
            console.log(`Found global 'all' commission config`);
            return defaultConfigResult.rows[0];
        }

        console.log(`No applicable commission config found for user ${referrerId}`);
        return null;
    },

    /**
     * Calculates the commission for a single payment, based on a pre-determined commission type.
     * @param {number} referrerId - The user ID of the referrer.
     * @param {number} referredId - The user ID of the referred client.
     * @param {number} paymentValue - The value of the payment.
     * @param {Date} paymentDate - The date of the payment.
     * @param {number} paymentId - The ID of the asaas_payment record.
     * @param {string} commissionType - The type of commission ('first' or 'recurring').
     * @returns {Promise<object|null>} An object with the saved commission details or null.
     */
    calculateAndSaveCommission: async (referrerId, referredId, paymentValue, paymentDate, paymentId, commissionType) => {
        // Idempotency check: ensure commission for this payment doesn't already exist.
        const existingCommission = await db.query(
            `SELECT id FROM commissions WHERE payment_id = $1`,
            [paymentId]
        );

        if (existingCommission.rows.length > 0) {
            console.log(`Commission already exists for payment ${paymentId}. Skipping.`);
            return null;
        }

        const config = await commissionService.getActiveConfigForUser(referrerId, paymentDate);

        if (!config) {
            return null; // No commission to calculate
        }

        let commissionValue = 0;

        // Check recurring limit if it's a recurring payment
        if (commissionType === 'recurring' && config.recurring_limit !== null) {
            const confirmedPaymentsCountResult = await db.query(
                `SELECT COUNT(*) FROM commissions WHERE referrer_id = $1 AND referred_id = $2 AND commission_type = 'recurring'`,
                [referrerId, referredId]
            );
            const recurringCommissionsPaid = parseInt(confirmedPaymentsCountResult.rows[0].count);

            if (recurringCommissionsPaid >= config.recurring_limit) {
                console.log(`Recurring limit of ${config.recurring_limit} reached for referred client ${referredId} by referrer ${referrerId}. Config ID: ${config.id}`);
                return null; // Recurring limit reached
            }
        }

        if (commissionType === 'first') {
            if (config.first_payment_type === 'percentage') {
                commissionValue = paymentValue * (config.first_payment_value / 100);
            } else {
                commissionValue = config.first_payment_value;
            }
        } else { // 'recurring'
            if (config.recurring_payment_type === 'percentage') {
                commissionValue = paymentValue * (config.recurring_payment_value / 100);
            } else {
                commissionValue = config.recurring_payment_value;
            }
        }

        // Save the calculated commission to the 'commissions' table
        const saveResult = await db.query(
            `INSERT INTO commissions
            (referrer_id, referred_id, payment_id, config_id, commission_value, commission_type, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING *`,
            [referrerId, referredId, paymentId, config.id, commissionValue, commissionType]
        );

        console.log(`Commission calculated and saved for payment ${paymentId}: ${commissionValue} (${commissionType})`);
        return saveResult.rows[0];
    },
};

module.exports = commissionService;
