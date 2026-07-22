/**
 * ============================================================================
 * CONTROLLER DA ALEXA (Inteligência de Voz)
 * ============================================================================
 * Recebe a voz, interpreta e decide o que fazer.
 */

const { ExpressAdapter } = require('ask-sdk-express-adapter');
const Alexa = require('ask-sdk-core');
const supabase = require('../config/database');
const { enviarAlertaCuidador } = require('../services/pushNotification');

// 1. Handler de Abertura
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Olá! Bem-vindo ao assistente do cuidador. Qual remédio você quer confirmar que tomou?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// 2. Handler Principal: Confirmar a Dose
const ConfirmarDoseIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConfirmarDoseIntent';
    },
    async handle(handlerInput) {
        // Captura o nome do remédio dito pelo idoso
        const remedioFalado = handlerInput.requestEnvelope.request.intent.slots.Remedio?.value || "o remédio";

        console.log(`[ALEXA] Comando de voz recebido: Paciente diz ter tomado -> ${remedioFalado}`);

        try {
            // Salva a confirmação no banco de dados
            await supabase.from('Registro_Consumo').insert([
                { 
                    nome_farmaco: remedioFalado, 
                    status_dose: 'CONFIRMADA',
                    timestamp_confirmacao: new Date().toISOString()
                }
            ]);

            // Envia um push notification de "Sucesso" silencioso (opcional, só para manter o dashboard atualizado)
            // await enviarAlertaCuidador("Dose Confirmada", `O paciente tomou ${remedioFalado}.`);

            const speakOutput = `Registrei que você tomou ${remedioFalado} e avisei o sistema. Tenha um bom dia!`;
            return handlerInput.responseBuilder.speak(speakOutput).getResponse();

        } catch (error) {
            console.error("Erro na integração Alexa/Banco:", error);
            return handlerInput.responseBuilder
                .speak('Desculpe, não consegui salvar no sistema agora. Tente novamente.')
                .getResponse();
        }
    }
};

// Handler de Erro Genérico
const ErrorHandler = {
    canHandle() { return true; },
    handle(handlerInput, error) {
        console.error(`[ALEXA ERRO]: ${error.message}`);
        return handlerInput.responseBuilder
            .speak('Desculpe, eu não entendi. Pode repetir?')
            .reprompt('Desculpe, eu não entendi. Pode repetir?')
            .getResponse();
    }
};

// Empacota a skill
const skillBuilder = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ConfirmarDoseIntentHandler
    )
    .addErrorHandlers(ErrorHandler);

const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, true, true);

// Exporta o adaptador (O express precisa dele para criar a rota)
module.exports = adapter.getRequestHandlers();