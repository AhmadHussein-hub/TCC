const Alexa = require('ask-sdk-core');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const supabase = require('../config/database');

// 1. Handler para quando a Alexa inicia a Skill (ex: "Alexa, abrir meu tcc")
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: LaunchRequest ===");
        const speakOutput = 'Olá! O servidor do seu projeto TCC está conectado e funcionando perfeitamente. Como posso ajudar?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput) // Mantém o microfone aberto
            .getResponse();
    }
};

// 1.5 Handler para verificar os medicamentos pendentes
const VerificarMedicamentosIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'VerificarMedicamentosIntent';
    },
    async handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: VerificarMedicamentosIntent ===");

        try {
            // Busca no banco de dados real
            const { data, error } = await supabase
                .from('registro_consumo')
                .select(`
                    id_registro,
                    timestamp_agendado,
                    medicamento (
                        nome_farmaco,
                        dosagem
                    )
                `)
                .eq('status_dose', 'PENDENTE');

            if (error) throw error;

            let speakOutput = '';
            if (data && data.length > 0) {
                speakOutput = `Você tem ${data.length} remédios pendentes hoje. `;
                data.forEach(registro => {
                    // Extrai a hora do timestamp para a Alexa falar de forma amigável
                    const dataHora = new Date(registro.timestamp_agendado);
                    const horaFormatada = dataHora.getHours() + " e " + dataHora.getMinutes(); // Fala amigável para a Alexa
                    
                    speakOutput += `O ${registro.medicamento.nome_farmaco} às ${horaFormatada}. `;
                });
                speakOutput += 'Gostaria de confirmar que tomou algum deles?';
            } else {
                speakOutput = 'Parabéns, você não tem nenhum remédio pendente para hoje! Posso ajudar com algo mais?';
            }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Posso ajudar com mais alguma coisa?') // Mantém aberto
                .getResponse();
        } catch (error) {
            console.error("Erro ao buscar no Supabase:", error);
            return handlerInput.responseBuilder
                .speak('Desculpe, tive um problema ao acessar seu banco de dados de medicamentos. Tente novamente mais tarde.')
                .getResponse();
        }
    }
};

// 1.6 Handler para confirmar que o medicamento foi tomado
const ConfirmarMedicamentoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConfirmarMedicamentoIntent';
    },
    async handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: ConfirmarMedicamentoIntent ===");
        
        // Pega o nome do remédio que o usuário falou (usando Slots)
        const nomeRemedio = Alexa.getSlotValue(handlerInput.requestEnvelope, 'remedio');

        try {
            // Se o usuário não disse o nome do remédio
            if (!nomeRemedio) {
                return handlerInput.responseBuilder
                    .speak('Qual é o nome do remédio que você tomou?')
                    .reprompt('Por favor, diga o nome do remédio.')
                    .getResponse();
            }

            // 1. Primeiro precisamos achar o id_medicamento pelo nome
            // Usamos ilike para ignorar maiúsculas/minúsculas na busca
            const { data: medData, error: medError } = await supabase
                .from('medicamento')
                .select('id_medicamento')
                .ilike('nome_farmaco', `%${nomeRemedio}%`)
                .limit(1);
            
            if (medError || !medData || medData.length === 0) {
                return handlerInput.responseBuilder
                    .speak(`Não encontrei o remédio ${nomeRemedio} na sua prescrição.`)
                    .getResponse();
            }

            const idMedicamento = medData[0].id_medicamento;

            // 2. Procura um registro de consumo PENDENTE para este medicamento
            const { data: regData, error: regError } = await supabase
                .from('registro_consumo')
                .select('id_registro')
                .eq('id_medicamento', idMedicamento)
                .eq('status_dose', 'PENDENTE')
                .limit(1);

            if (regError || !regData || regData.length === 0) {
                return handlerInput.responseBuilder
                    .speak(`Você não tem nenhuma dose pendente para o remédio ${nomeRemedio} hoje.`)
                    .getResponse();
            }

            const idRegistro = regData[0].id_registro;

            // 3. Atualiza o status para CONFIRMADA e grava a hora da confirmação
            const { error: updateError } = await supabase
                .from('registro_consumo')
                .update({ 
                    status_dose: 'CONFIRMADA',
                    timestamp_confirmacao: new Date().toISOString()
                })
                .eq('id_registro', idRegistro);

            if (updateError) throw updateError;

            return handlerInput.responseBuilder
                .speak(`Pronto! Registrei no sistema que você tomou o ${nomeRemedio}. Parabéns por cuidar da sua saúde!`)
                .getResponse();

        } catch (error) {
            console.error("Erro ao confirmar medicamento:", error);
            return handlerInput.responseBuilder
                .speak('Desculpe, tive um problema ao salvar no banco de dados. Tente novamente mais tarde.')
                .getResponse();
        }
    }
};

// 2. Handler genérico para capturar erros
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error(`~~~~ Erro capturado pela Alexa: ${error.message}`);
        const speakOutput = 'Desculpe, ocorreu um erro no servidor ao processar a requisição.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Por favor, tente novamente.')
            .getResponse();
    }
};

// 3. Constrói a Skill registrando os Handlers
const skillBuilder = Alexa.SkillBuilders.custom()
    .withSkillId('amzn1.ask.skill.6cd8d640-3b4a-43c0-9263-0aa45601c114') // <--- ADICIONAR ISSO AQUI
    .addRequestHandlers(
        LaunchRequestHandler,
        VerificarMedicamentosIntentHandler,
        ConfirmarMedicamentoIntentHandler
    )
    .addErrorHandlers(
        ErrorHandler
    );


const skill = skillBuilder.create();

// 4. Cria o adaptador Express
// Os booleanos (false, false) desativam a verificação rígida de segurança da Amazon 
// *apenas* para facilitar este primeiro teste via ngrok. 
// Para mandar para produção, mudaremos para (true, true) e a URL do servidor deve ser HTTPS.
const adapter = new ExpressAdapter(skill, false, false);

// 5. Exporta o handler para a rota
exports.receberRequisicao = adapter.getRequestHandlers();