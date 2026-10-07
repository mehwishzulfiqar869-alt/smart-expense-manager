const express = require('express');
const router = express.Router();
const { scanReceipt } = require('../controllers/ocrController');
const { protect}  = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// @route   POST /api/ocr/scan-receipt
router.post('/scan-receipt', scanReceipt);

module.exports = router;