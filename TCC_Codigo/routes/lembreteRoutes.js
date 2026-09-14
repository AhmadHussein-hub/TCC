const express = require('express');
const router = express.Router();
const lembreteController = require('../controllers/lembreteController');

router.post('/', lembreteController.agendarLembrete);

module.exports = router;
