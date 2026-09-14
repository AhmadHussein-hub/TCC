const express = require('express');
const router = express.Router();
const alexaController = require('../controllers/alexaController');

// O expressAdapter já lida com o parse do JSON e a validação,
// então só passamos ele diretamente na rota POST
router.post('/', alexaController.receberRequisicao);

module.exports = router;