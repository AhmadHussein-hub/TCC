const Alexa = require('ask-sdk-core');
const { ExpressAdapter } = require('ask-sdk-express-adapter');

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
    handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: VerificarMedicamentosIntent ===");

        // Simulando a busca no banco de dados (os mesmos dados mockados do dashboard)
        const medicamentos = [
            { remedio: "Losartana 50 miligramas", horario: "8 da manhã", status: "CONFIRMADA" },
            { remedio: "Metformina 500 miligramas", horario: "2 da tarde", status: "PENDENTE" },
            { remedio: "Vitamina D 1000 unidades", horario: "8 da noite", status: "OMITIDA" },
            { remedio: "AAS 100 miligramas", horario: "10 da noite", status: "PENDENTE" }
        ];

        // Filtra apenas os pendentes
        const pendentes = medicamentos.filter(m => m.status === "PENDENTE");

        let speakOutput = '';
        if (pendentes.length > 0) {
            speakOutput = `Você tem ${pendentes.length} remédios pendentes hoje. `;
            pendentes.forEach(m => {
                speakOutput += `O ${m.remedio} às ${m.horario}. `;
            });
            speakOutput += 'Gostaria de confirmar que tomou algum deles?';
        } else {
            speakOutput = 'Parabéns, você não tem nenhum remédio pendente para hoje! Posso ajudar com algo mais?';
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Posso ajudar com mais alguma coisa?') // Mantém aberto
            .getResponse();
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
        VerificarMedicamentosIntentHandler
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