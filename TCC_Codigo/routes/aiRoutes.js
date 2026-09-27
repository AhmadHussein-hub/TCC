const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');


router.get('/resumo/:id_paciente', aiController.getResumoPaciente);

module.exports = router;
