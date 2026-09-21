const router = require('express').Router();
const cronController = require('../controllers/cronController');

// Rota chamada pela Vercel todo dia às 06:00 BRT para criar os registros PENDENTE do dia
router.get('/gerar-registros-diarios', cronController.gerarRegistrosDiarios);

// Rota chamada pela Vercel a cada hora para marcar como OMITIDA doses esquecidas
router.get('/verificar-doses', cronController.verificarDoses);

module.exports = router;