/**
 * ROTAS DO APLICATIVO MOBILE
 */
const express = require('express');
const router = express.Router();

const medicamentoController = require('../controllers/medicamentoController');

// GET /api/medicamentos/status -> Retorna a lista para o Dashboard
router.get('/status', medicamentoController.listarStatus);

// POST /api/medicamentos/agendar -> Salva o formulário de novo medicamento
router.post('/agendar', medicamentoController.agendarMedicamento);

module.exports = router;