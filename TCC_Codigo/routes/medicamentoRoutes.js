


const express = require('express');
const router = express.Router();

const medicamentoController = require('../controllers/medicamentoController');


router.get('/status', medicamentoController.listarStatus);


router.post('/agendar', medicamentoController.agendarMedicamento);

module.exports = router;