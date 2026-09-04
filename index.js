/**
 * ============================================================================
 * ARQUIVO PRINCIPAL DO SERVIDOR (Adaptado para Vercel e Local)
 * ============================================================================
 */

require('dotenv').config();
const express = require('express');

// Importação dos arquivos de rotas
const alexaRoutes = require('./routes/alexaRoutes');
const medicamentoRoutes = require('./routes/medicamentoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// O Express precisa entender JSON para as requisições do App Mobile
// Removido app.use(express.json()) global, pois a Alexa faz seu próprio parser com validação de segurança.

// Injeção das Rotas na aplicação
app.use('/api/alexa', alexaRoutes);
app.use('/api/medicamentos', express.json(), medicamentoRoutes);

// Rota de saúde para testar se o servidor está online
app.get('/', (req, res) => {
    res.send("Backend de Monitoramento TCC Online e Operante!");
});

// Se estiver rodando localmente (fora da Vercel), liga o servidor na porta
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`========================================================`);
        console.log(`🚀 Servidor de Backend do TCC Iniciado!`);
        console.log(`📡 Porta: ${PORT}`);
        console.log(`🎤 Rota Alexa: POST http://localhost:${PORT}/api/alexa`);
        console.log(`📱 Rota App:   GET http://localhost:${PORT}/api/medicamentos/status`);
        console.log(`========================================================`);
    });
}

// Exporta o aplicativo Express para o Vercel conseguir gerenciar as requisições serverless
module.exports = app;