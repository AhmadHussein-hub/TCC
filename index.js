/**
 * ============================================================================
 * ARQUIVO PRINCIPAL DO SERVIDOR (Unificado para Vercel e Local)
 * ============================================================================
 */

require('dotenv').config();
const express = require('express');

// Importação dos Controllers
// ATENÇÃO: Ajuste os caminhos colocando './TCC_Codigo/...' caso essas pastas estejam dentro de TCC_Codigo
const { cronController, iniciarCronJobs } = require('./TCC_Codigo/controllers/cronController'); 

const alexaRoutes = require('./TCC_Codigo/routes/alexaRoutes');
const medicamentoRoutes = require('./TCC_Codigo/routes/medicamentoRoutes');
const lembreteRoutes = require('./TCC_Codigo/routes/lembreteRoutes');
const authRoutes = require('./TCC_Codigo/routes/authRoutes');
const cronRoutes = require('./TCC_Codigo/routes/cronRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// CONFIGURAÇÃO DE ROTAS
// ============================================================================

// Rota da Alexa (Sem express.json() global, pois a Alexa faz seu próprio parser)
app.use('/api/alexa', alexaRoutes);
// app.use('/api/alexa-skill', alexaRoutes); // Descomente se precisar manter as duas URLs

// Demais rotas (Todas precisam do express.json() para ler o body da requisição)
app.use('/api/medicamentos', express.json(), medicamentoRoutes);
app.use('/api/lembrete', express.json(), lembreteRoutes);
app.use('/api/auth', express.json(), authRoutes);

// A NOSSA ROTA DO CRON PARA A VERCEL CHAMAR
app.use('/api/cron', express.json(), cronRoutes);

// Rota de saúde para testar se o servidor está online
app.get('/', (req, res) => {
    res.send("Backend de Monitoramento TCC Online e Operante!");
});

// ============================================================================
// INICIALIZAÇÃO (Apenas Local - A Vercel ignora este bloco)
// ============================================================================
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    
    // Inicia o node-cron em background apenas quando rodar no seu PC
    iniciarCronJobs(); 
    
    app.listen(PORT, () => {
        console.log(`========================================================`);
        console.log(`🚀 Servidor de Backend do TCC Iniciado!`);
        console.log(`📡 Porta: ${PORT}`);
        console.log(`🎤 Rota Alexa: POST http://localhost:${PORT}/api/alexa`);
        console.log(`📱 Rota App:   GET http://localhost:${PORT}/api/medicamentos`);
        console.log(`⏰ Cron Local: Ativado via node-cron`);
        console.log(`========================================================`);
    });
}

// Exporta o aplicativo Express para a Vercel conseguir gerenciar as requisições serverless
module.exports = app;