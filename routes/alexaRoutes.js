/**
 * ROTAS DA ALEXA
 */
const express = require('express');
const router = express.Router();

// Importa o controlador (já empacotado como um adapter do Express)
const alexaController = require('../controllers/alexaController');

// A rota recebe POSTs diretamente da nuvem da Amazon
router.post('/', alexaController);

module.exports = router;