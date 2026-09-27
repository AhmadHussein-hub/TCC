const express = require('express');
const router = express.Router();
const alexaController = require('../controllers/alexaController');



router.post('/', alexaController.receberRequisicao);

module.exports = router;