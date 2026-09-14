const admin = require('../config/firebase');
const supabase = require('../config/supabaseClient');

const pushNotificationService = {

    // Função principal para notificar os cuidadores de um paciente específico
    async alertarCuidadores(id_paciente, titulo, corpo, dadosExtras = {}) {
        try {
            // 1. Busca os cuidadores vinculados a este paciente
            const { data: vinculos, error: erroVinculo } = await supabase
                .from('vinculo_cuidador_paciente')
                .select('id_cuidador')
                .eq('id_paciente', id_paciente);

            if (erroVinculo || !vinculos.length) {
                console.log('Nenhum cuidador vinculado encontrado para o paciente', id_paciente);
                return;
            }

            const idsCuidadores = vinculos.map(v => v.id_cuidador);

            // 2. Pega os tokens FCM ativos desses cuidadores
            const { data: tokensData, error: erroTokens } = await supabase
                .from('push_token')
                .select('token_fcm')
                .in('id_cuidador', idsCuidadores)
                .eq('ativo', true);

            if (erroTokens || !tokensData.length) {
                console.log('Nenhum token ativo encontrado para os cuidadores');
                return;
            }

            // 3. Monta a lista de tokens (apenas as strings)
            const tokensList = tokensData.map(t => t.token_fcm);

            // 4. Monta o payload do Firebase (Mensagem)
            const message = {
                notification: {
                    title: titulo,
                    body: corpo
                },
                data: {
                    id_paciente: String(id_paciente),
                    ...dadosExtras // Ex: id_medicamento
                },
                tokens: tokensList // Envia em lote para todos os cuidadores de uma vez
            };

            // 5. Dispara a notificação via Firebase Admin
            const response = await admin.messaging().sendEachForMulticast(message);

            console.log(`${response.successCount} mensagens enviadas com sucesso, ${response.failureCount} falhas.`);

            // Opcional: Lidar com tokens expirados iterando sobre response.responses e removendo do Supabase os que deram erro.

        } catch (error) {
            console.error('Erro ao enviar push notification:', error);
        }
    }
};

module.exports = pushNotificationService;