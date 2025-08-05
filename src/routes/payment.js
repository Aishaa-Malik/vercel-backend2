const express = require('express');
const router = express.Router();
const { verifyPayment } = require('../controllers/paymentController');

// Payment verification route
router.post('/verify-payment', verifyPayment);

module.exports = router;