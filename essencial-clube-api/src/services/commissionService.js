const db = require('../config/database');

const commissionService = {

    /**
     * Retrieves the active and applicable commission configuration for a given referrer at a specific date.
     * Prioritizes user-specific configurations, then 'partner', 'ambassador', and finally 'all'.
     * @param {number} referrerId - The user ID of the referrer.
     * @param {Date} paymentDate - The date of the payment, used to check config validity dates.
     * @returns {Promise<object|null>} The applicable commission configuration, or null if none found.
     */
    getActiveConfigForUser: async (referrerId, paymentDate) => {
        // Try to find a user-specific configuration
        const userConfigResult = await db.query(
            `SELECT cc.*
            FROM user_commission_config ucc
            JOIN commission_configs cc ON ucc.commission_config_id = cc.id
            WHERE ucc.user_id = $1
            AND cc.active = TRUE
            AND (cc.valid_from IS NULL OR cc.valid_from <= $2)
            AND (cc.valid_until IS NULL OR cc.valid_until >= $2)
            ORDER BY cc.created_at DESC LIMIT 1`, // Order by created_at to get the latest if multiple for some reason
            [referrerId, paymentDate]
        );

        if (userConfigResult.rows.length > 0) {
            return userConfigResult.rows[0];
        }

        // If no user-specific config, try to find a general config that applies (e.g., 'partner', 'ambassador', 'all')
        // We'll need the referrer's user type to filter for 'partner'/'ambassador' specific configs
        const referrerTypeResult = await db.query(`SELECT tipo FROM users WHERE id = $1`, [referrerId]);
        const referrerType = referrerTypeResult.rows[0]?.tipo;

        if (referrerType) {
            const generalConfigResult = await db.query(
                `SELECT *
                FROM commission_configs
                WHERE active = TRUE
                AND (applies_to = 'all' OR applies_to = $1) -- $1 will be referrerType (e.g., 'partner')
                AND (valid_from IS NULL OR valid_from <= $2)
                AND (valid_until IS NULL OR valid_until >= $2)
                ORDER BY created_at DESC LIMIT 1`,
                [referrerType, paymentDate]
            );
            if (generalConfigResult.rows.length > 0) {
                return generalConfigResult.rows[0];
            }
        }
        
        // Fallback to a default config for 'all' if no specific one was found for the type
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
            return defaultConfigResult.rows[0];
        }

        return null; // No applicable configuration found
    },

    /**
     * Checks if a given payment is the first confirmed payment for a referred client.
     * @param {number} referredId - The user ID of the referred client.
     * @param {Date} paymentDate - The date of the current payment.
     * @returns {Promise<boolean>} True if it's the first payment, false otherwise.
     */
    isFirstPayment: async (referredId, paymentDate) => {
        // Count confirmed payments BEFORE the current paymentDate for the referred client
        const result = await db.query(
            `SELECT COUNT(*) FROM asaas_payments
            WHERE user_id = $1 AND status = 'confirmed' AND payment_date < $2`,
            [referredId, paymentDate]
        );
        return parseInt(result.rows[0].count) === 0;
    },

    /**
     * Gets the count of confirmed payments for a referred client before a specific date.
     * @param {number} referredId - The user ID of the referred client.
     * @param {Date} paymentDate - The date up to which to count payments.
     * @returns {Promise<number>} The number of confirmed payments.
     */
    getConfirmedPaymentCountBefore: async (referredId, paymentDate) => {
        const result = await db.query(
            `SELECT COUNT(*) FROM asaas_payments
            WHERE user_id = $1 AND status = 'confirmed' AND payment_date < $2`,
            [referredId, paymentDate]
        );
        return parseInt(result.rows[0].count);
    },

    /**
     * Calculates the commission for a single payment.
     * @param {number} referrerId - The user ID of the referrer.
     * @param {number} referredId - The user ID of the referred client.
     * @param {number} paymentValue - The value of the payment.
     * @param {Date} paymentDate - The date of the payment.
     * @param {number} paymentId - The ID of the asaas_payment record.
     * @returns {Promise<object|null>} An object { commission_value, commission_type, config_id } or null if no commission.
     */
    calculateAndSaveCommission: async (referrerId, referredId, paymentValue, paymentDate, paymentId) => {
        // IDEMPOTÊNCIA: Verificar se já existe comissão para este payment_id
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
            console.log(`No active commission config found for referrer ${referrerId} at ${paymentDate.toISOString()}`);
            return null; // No commission to calculate
        }

        const isFirst = await commissionService.isFirstPayment(referredId, paymentDate);
        let commissionValue = 0;
        let commissionType = isFirst ? 'first' : 'recurring';

        // Check recurring limit if it's a recurring payment
        if (!isFirst && config.recurring_limit !== null) {
            const confirmedPaymentsCount = await commissionService.getConfirmedPaymentCountBefore(referredId, paymentDate);
            if (confirmedPaymentsCount >= config.recurring_limit) {
                console.log(`Recurring limit reached for referred client ${referredId} by referrer ${referrerId}. Config ID: ${config.id}`);
                return null; // Recurring limit reached
            }
        }

        if (isFirst) {
            if (config.first_payment_type === 'percentage') {
                commissionValue = paymentValue * (config.first_payment_value / 100);
            } else {
                commissionValue = config.first_payment_value;
            }
        } else {
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

    // Potentially add more functions related to commission management (e.g., getting referrer earnings)
};

module.exports = commissionService;
