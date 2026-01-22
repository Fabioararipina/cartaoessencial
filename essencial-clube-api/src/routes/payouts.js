const express = require('express');
const router = express.Router();
const payoutsController = require('../controllers/payoutsController');
const { verifyToken, isPartner } = require('../middleware/auth'); // Payouts are typically requested by partners/ambassadors

// @route   POST /api/payouts/request
// @desc    Request a payout for pending commissions
// @access  Private (Partner/Ambassador)
router.post('/request', [verifyToken, isPartner], payoutsController.requestPayout);

// @route   GET /api/payouts/my-requests
// @desc    Get my payout requests
// @access  Private (Partner/Ambassador)
router.get('/my-requests', [verifyToken, isPartner], payoutsController.getMyPayoutRequests);

module.exports = router;
