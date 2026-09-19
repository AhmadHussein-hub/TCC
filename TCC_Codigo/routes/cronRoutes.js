const router = require('express').Router();
const cronController = require('../controllers/cronController');

router.get('/verificar-doses', cronController.verificarDoses);

module.exports = router;