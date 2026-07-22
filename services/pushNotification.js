/**
 * ============================================================================
 * SERVIÇO DE NOTIFICAÇÕES (PUSH NOTIFICATIONS)
 * ============================================================================
 * Isola a lógica de enviar alertas para o celular do cuidador.
 */

// const axios = require('axios'); // Descomentar se for usar chamadas HTTP reais

const enviarAlertaCuidador = async (titulo, mensagem) => {
    try {
        console.log(`\n================= 🚨 ALERTA PUSH 🚨 =================`);
        console.log(`Título: ${titulo}`);
        console.log(`Mensagem: ${mensagem}`);
        console.log(`=====================================================\n`);

        // [EXEMPLO REAL - FIREBASE CLOUD MESSAGING OU EXPO PUSH]
        /*
        await axios.post('https://fcm.googleapis.com/fcm/send', {
            to: process.env.TOKEN_DO_CELULAR_DO_CUIDADOR,
            notification: {
                title: titulo,
                body: mensagem
            }
        }, {
            headers: { 'Authorization': `key=${process.env.FIREBASE_SERVER_KEY}` }
        });
        */
        
        return true;
    } catch (error) {
        console.error("Erro ao enviar notificação push:", error);
        return false;
    }
};

module.exports = {
    enviarAlertaCuidador
};