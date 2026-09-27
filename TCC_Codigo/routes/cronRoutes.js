const router = require('express').Router();
const cronController = require('../controllers/cronController');


router.get('/gerar-registros-diarios', cronController.gerarRegistrosDiarios);


router.get('/verificar-doses', cronController.verificarDoses);

module.exports = router;