const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota que a Amazon irá redirecionar após o usuário aprovar o acesso
router.get('/amazon/callback', authController.amazonCallback);

module.exports = router;
