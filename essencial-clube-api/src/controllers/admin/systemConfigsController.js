const db = require('../../config/database');

// @desc    Obter todas as configurações do sistema
// @route   GET /api/admin/system-configs
// @access  Private (Admin)
const getSystemConfigs = async (req, res) => {
    try {
        const result = await db.query('SELECT config_key, config_value, description FROM system_configs');
        // Transforma o array de resultados em um objeto para facilitar o uso no frontend
        const configs = result.rows.reduce((acc, row) => {
            acc[row.config_key] = {
                value: row.config_value,
                description: row.description
            };
            return acc;
        }, {});
        res.json(configs);
    } catch (error) {
        console.error('Erro ao buscar configurações do sistema:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Atualizar uma ou mais configurações do sistema
// @route   PUT /api/admin/system-configs
// @access  Private (Admin)
const updateSystemConfigs = async (req, res) => {
    const configsToUpdate = req.body; // Espera um objeto: { "KEY": "VALUE", "ANOTHER_KEY": "ANOTHER_VALUE" }

    if (typeof configsToUpdate !== 'object' || Object.keys(configsToUpdate).length === 0) {
        return res.status(400).json({ error: 'Dados de configuração inválidos.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        for (const key in configsToUpdate) {
            if (Object.hasOwnProperty.call(configsToUpdate, key)) {
                const value = configsToUpdate[key];
                
                await client.query(
                    'UPDATE system_configs SET config_value = $1, updated_at = NOW() WHERE config_key = $2',
                    [value, key]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Configurações atualizadas com sucesso.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar configurações do sistema:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar configurações.' });
    } finally {
        client.release();
    }
};

module.exports = {
    getSystemConfigs,
    updateSystemConfigs,
};
