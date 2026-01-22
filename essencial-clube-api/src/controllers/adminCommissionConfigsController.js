const db = require('../config/database');

// @desc    Create a new commission configuration
// @route   POST /api/admin/commission-configs
// @access  Private (Admin)
const createConfig = async (req, res) => {
    try {
        const {
            config_name, description, first_payment_type, first_payment_value,
            recurring_payment_type, recurring_payment_value, recurring_limit,
            applies_to, active, valid_from, valid_until, min_payout_amount
        } = req.body;

        const result = await db.query(
            `INSERT INTO commission_configs
            (config_name, description, first_payment_type, first_payment_value,
            recurring_payment_type, recurring_payment_value, recurring_limit,
            applies_to, active, valid_from, valid_until, min_payout_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                config_name, description, first_payment_type, first_payment_value,
                recurring_payment_type, recurring_payment_value, recurring_limit,
                applies_to, active, valid_from, valid_until, min_payout_amount
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating commission config:', err.stack);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// @desc    Get all commission configurations
// @route   GET /api/admin/commission-configs
// @access  Private (Admin)
const getConfigs = async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM commission_configs ORDER BY created_at DESC`);
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting commission configs:', err.stack);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// @desc    Get a specific commission configuration by ID
// @route   GET /api/admin/commission-configs/:id
// @access  Private (Admin)
const getConfigById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`SELECT * FROM commission_configs WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Commission configuration not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error getting commission config by ID:', err.stack);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


// @desc    Update a commission configuration
// @route   PUT /api/admin/commission-configs/:id
// @access  Private (Admin)
const updateConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            config_name, description, first_payment_type, first_payment_value,
            recurring_payment_type, recurring_payment_value, recurring_limit,
            applies_to, active, valid_from, valid_until, min_payout_amount
        } = req.body;

        const result = await db.query(
            `UPDATE commission_configs SET
            config_name = $1, description = $2, first_payment_type = $3, first_payment_value = $4,
            recurring_payment_type = $5, recurring_payment_value = $6, recurring_limit = $7,
            applies_to = $8, active = $9, valid_from = $10, valid_until = $11, 
            min_payout_amount = $12, updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *`,
            [
                config_name, description, first_payment_type, first_payment_value,
                recurring_payment_type, recurring_payment_value, recurring_limit,
                applies_to, active, valid_from, valid_until, min_payout_amount, id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Commission configuration not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating commission config:', err.stack);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// @desc    Delete a commission configuration
// @route   DELETE /api/admin/commission-configs/:id
// @access  Private (Admin)
const deleteConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`DELETE FROM commission_configs WHERE id = $1 RETURNING *`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Commission configuration not found.' });
        }
        res.status(204).send(); // No content for successful deletion
    } catch (err) {
        console.error('Error deleting commission config:', err.stack);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    createConfig,
    getConfigs,
    getConfigById,
    updateConfig,
    deleteConfig,
};
