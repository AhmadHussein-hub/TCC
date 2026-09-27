const { getMessagingInstance } = require('../config/firebase');
const supabase = require('../config/database');

const pushNotificationService = {


    async alertarCuidadores(id_paciente, titulo, corpo, dadosExtras = {}) {
        try {
            
            const { data: vinculos, error: erroVinculo } = await supabase
                .from('vinculo_cuidador_paciente')
                .select('id_cuidador')
                .eq('id_paciente', id_paciente);

            if (erroVinculo || !vinculos.length) {
                console.log('Nenhum cuidador vinculado encontrado para o paciente', id_paciente);
                return;
            }

            const idsCuidadores = vinculos.map(v => v.id_cuidador);

            
            const { data: tokensData, error: erroTokens } = await supabase
                .from('push_token')
                .select('token_fcm')
                .in('id_cuidador', idsCuidadores)
                .eq('ativo', true);

            if (erroTokens || !tokensData.length) {
                console.log('Nenhum token ativo encontrado para os cuidadores');
                return;
            }

           
            const tokensList = tokensData.map(t => t.token_fcm);

            
            const message = {
                notification: {
                    title: titulo,
                    body: corpo
                },
                data: {
                    id_paciente: String(id_paciente),
                    ...dadosExtras 
                },
                tokens: tokensList 
            };

           
            const response = await getMessagingInstance().sendEachForMulticast(message);

            console.log(`${response.successCount} mensagens enviadas com sucesso, ${response.failureCount} falhas.`);

            

        } catch (error) {
            console.error('Erro ao enviar push notification:', error);
        }
    }
};

module.exports = pushNotificationService;