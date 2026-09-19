const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// GET /api/ai/resumo/:id_paciente
router.get('/resumo/:id_paciente', aiController.getResumoPaciente);

module.exports = router;
