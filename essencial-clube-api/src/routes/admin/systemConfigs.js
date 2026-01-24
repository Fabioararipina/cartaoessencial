const express = require('express');
const router = express.Router();
const { getSystemConfigs, updateSystemConfigs } = require('../../controllers/admin/systemConfigsController');

// A verificação de admin já é feita no router pai (admin.js)

// @route   GET /api/admin/system-configs
// @desc    Busca todas as configurações do sistema
// @access  Admin
router.get('/', getSystemConfigs);


// @route   PUT /api/admin/system-configs
// @desc    Atualiza as configurações do sistema
// @access  Admin
router.put('/', updateSystemConfigs);


module.exports = router;
