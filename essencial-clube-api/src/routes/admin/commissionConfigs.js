const express = require('express');
const router = express.Router();
const adminCommissionConfigsController = require('../../controllers/adminCommissionConfigsController');
const { verifyToken, isAdmin } = require('../../middleware/auth');

// All admin commission config routes require authentication + admin role
router.use(verifyToken);
router.use(isAdmin);

// @route   POST /api/admin/commission-configs
// @desc    Create a new commission configuration
// @access  Private (Admin)
router.post('/', adminCommissionConfigsController.createConfig);

// @route   GET /api/admin/commission-configs
// @desc    Get all commission configurations
// @access  Private (Admin)
router.get('/', adminCommissionConfigsController.getConfigs);

// @route   GET /api/admin/commission-configs/:id
// @desc    Get a specific commission configuration by ID
// @access  Private (Admin)
router.get('/:id', adminCommissionConfigsController.getConfigById);

// @route   PUT /api/admin/commission-configs/:id
// @desc    Update a commission configuration
// @access  Private (Admin)
router.put('/:id', adminCommissionConfigsController.updateConfig);

// @route   DELETE /api/admin/commission-configs/:id
// @desc    Delete a commission configuration
// @access  Private (Admin)
router.delete('/:id', adminCommissionConfigsController.deleteConfig);

module.exports = router;
