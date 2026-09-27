const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');


router.get('/amazon/callback', authController.amazonCallback);

module.exports = router;
