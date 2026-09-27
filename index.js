
require('dotenv').config();
const express = require('express');
const { getMessagingInstance } = require('./TCC_Codigo/config/firebase'); // já inicializa o Firebase ao ser importado

const supabase = require('./TCC_Codigo/config/database');




const { cronController, iniciarCronJobs } = require('./TCC_Codigo/controllers/cronController');

const alexaRoutes = require('./TCC_Codigo/routes/alexaRoutes');
const medicamentoRoutes = require('./TCC_Codigo/routes/medicamentoRoutes');
const lembreteRoutes = require('./TCC_Codigo/routes/lembreteRoutes');
const authRoutes = require('./TCC_Codigo/routes/authRoutes');
const cronRoutes = require('./TCC_Codigo/routes/cronRoutes');
const aiRoutes = require('./TCC_Codigo/routes/aiRoutes');


const app = express();
const PORT = process.env.PORT || 3000;


app.use('/api/alexa', alexaRoutes);


// Demais rotas (Todas precisam do express.json() para ler o body da requisição)
app.use('/api/medicamentos', express.json(), medicamentoRoutes);
app.use('/api/lembrete', express.json(), lembreteRoutes);
app.use('/api/auth', express.json(), authRoutes);
app.use('/api/ai', express.json(), aiRoutes);

app.use('/api/cron', express.json(), cronRoutes);


app.get('/', (req, res) => {
    res.send("Backend de Monitoramento TCC Online e Operante!");
});

app.get('/api/testar-omissao', async (req, res) => {
    try {
        console.log(">>> Iniciando verificação manual de doses pendentes...");

        const { data: dosesPendentes, error } = await supabase
            .from('registro_consumo')
            .select(`
                *,
                medicamento (
                    id_medicamento,
                    id_paciente
                )
            `)
            .eq('status_dose', 'PENDENTE');

        if (error) throw error;

        console.log(`>>> Doses pendentes encontradas: ${dosesPendentes.length}`);

        if (dosesPendentes.length > 0) {
            const idPaciente = dosesPendentes[0].medicamento ? dosesPendentes[0].medicamento.id_paciente : null;
            console.log(`>>> Analisando dose vinculada ao paciente ID: ${idPaciente}`);

            if (idPaciente) {
                const { data: vinculo } = await supabase
                    .from('vinculo_cuidador_paciente')
                    .select('id_cuidador')
                    .eq('id_paciente', idPaciente);

                if (vinculo && vinculo.length > 0) {
                    const idCuidador = vinculo[0].id_cuidador;

                    const { data: tokenData } = await supabase
                        .from('push_token')
                        .select('token_fcm')
                        .eq('id_cuidador', idCuidador)
                        .eq('ativo', true);

                    if (tokenData && tokenData.length > 0) {
                        const tokenFCM = tokenData[0].token_fcm;
                        console.log(`>>> Enviando push para o token: ${tokenFCM}`);

                      
                        await getMessagingInstance().send({
                            token: tokenFCM,
                            notification: {
                                title: 'URGENTE: ALERTA DE OMISSÃO',
                                body: 'O paciente não confirmou a medicação no horário previsto.'
                            }
                        });
                        console.log(">>> 🚀 Push enviado com sucesso pelo Firebase!");
                    }
                } else {
                    console.log(">>> Erro: Nenhum cuidador vinculado a este paciente.");
                }
            }
        }

        res.status(200).json({ mensagem: "Teste de omissão executado com sucesso!" });
    } catch (e) {
        console.error(">>> Erro no teste de omissão:", e);
        res.status(500).json({ erro: e.message });
    }
});


if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {


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

module.exports = app;