const Alexa = require('ask-sdk-core');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const supabase = require('../config/database');
const pushNotification = require('../services/pushNotification');

// 1. Handler LaunchRequest (Apenas Saudações e Verificação de Permissão)
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const meuId = handlerInput.requestEnvelope.context.System.user.userId;
        console.log("🎯 MEU ALEXA USER ID É:", meuId);
        
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: LaunchRequest ===");
        let speakOutput = 'Olá! O servidor do seu projeto TCC está conectado. ';

        // Verifica permissão de Lembretes
        const permissions = handlerInput.requestEnvelope.context.System.user.permissions;
        if (!permissions || !permissions.consentToken) {
            return handlerInput.responseBuilder
                .speak('Por favor, habilite a permissão de Lembretes no aplicativo da Alexa para que eu possa te avisar na hora dos remédios.')
                .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
                .getResponse();
        }

        speakOutput += 'Para programar seus avisos diários, diga: configurar meus alarmes. Ou pergunte quais são os remédios de hoje.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withSimpleCard('Seu ID da Alexa (Copie abaixo)', meuId)
            .reprompt('Diga: configurar meus alarmes.')
            .getResponse();
    }
};

// 2. NOVO: Handler Configurar Lembretes (Cria as regras de recorrência RRULE)
const ConfigurarLembretesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConfigurarLembretesIntent';
    },
    async handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: ConfigurarLembretesIntent ===");
        const alexaUserId = handlerInput.requestEnvelope.context.System.user.userId;

        try {
            const permissions = handlerInput.requestEnvelope.context.System.user.permissions;
            if (!permissions || !permissions.consentToken) {
                return handlerInput.responseBuilder
                    .speak('Por favor, habilite a permissão de Lembretes no aplicativo e tente novamente.')
                    .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
                    .getResponse();
            }

            // 1. Busca o paciente
            const { data: paciente } = await supabase
                .from('paciente')
                .select('id_paciente')
                .eq('alexa_user_id', alexaUserId)
                .single();

            if (!paciente) {
                return handlerInput.responseBuilder.speak('Não encontrei seu cadastro no sistema.').getResponse();
            }

            // 2. Busca medicamentos ativos
            const { data: medicamentos, error } = await supabase
                .from('medicamento')
                .select('nome_farmaco, hora_inicio, frequencia_horas')
                .eq('id_paciente', paciente.id_paciente)
                .not('hora_inicio', 'is', null)
                .not('frequencia_horas', 'is', null)
                .gt('frequencia_horas', 0);

            if (error || !medicamentos || medicamentos.length === 0) {
                return handlerInput.responseBuilder.speak('Você não tem medicamentos configurados com horário e frequência.').getResponse();
            }

            const reminderServiceClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
            let lembretesCriados = 0;

            // 3. Cria um lembrete recorrente para cada medicamento
            for (const med of medicamentos) {
                const [horaStr, minutoStr] = med.hora_inicio.split(':');
                const horaInicial = parseInt(horaStr);
                const minuto = parseInt(minutoStr);
                
                const horasRecorrencia = [];
                let horaAtual = horaInicial;
                
                // Calcula as repetições limitadas a um ciclo de 24h
                while (horaAtual < 24 + horaInicial) {
                    horasRecorrencia.push(horaAtual % 24);
                    horaAtual += med.frequencia_horas;
                }

                const rrule = `FREQ=DAILY;BYHOUR=${horasRecorrencia.join(',')};BYMINUTE=${minuto}`;

                const reminderRequest = {
                    requestTime: new Date().toISOString(),
                    trigger: {
                        type: 'SCHEDULED_ABSOLUTE',
                        // A data base pode ser "hoje" porque a RRULE assume os horários
                        scheduledTime: new Date().toISOString().split('T')[0] + `T${horaStr.padStart(2, '0')}:${minutoStr.padStart(2, '0')}:00`,
                        timeZoneId: 'America/Sao_Paulo',
                        recurrence: {
                            recurrenceRules: [rrule]
                        }
                    },
                    alertInfo: {
                        spokenInfo: {
                            content: [{
                                locale: 'pt-BR',
                                text: `Atenção! Hora de tomar o seu medicamento: ${med.nome_farmaco}.`
                            }]
                        }
                    },
                    pushNotification: { status: 'ENABLED' }
                };

                try {
                    await reminderServiceClient.createReminder(reminderRequest);
                    lembretesCriados++;
                    console.log(`✅ Lembrete recorrente criado para ${med.nome_farmaco}: ${rrule}`);
                } catch (e) {
                    console.error(`❌ Erro ao criar lembrete para ${med.nome_farmaco}:`, e);
                }
            }

            return handlerInput.responseBuilder
                .speak(`Pronto! Configurei ${lembretesCriados} alarmes recorrentes. Eu vou te avisar todos os dias nos horários corretos.`)
                .getResponse();

        } catch (error) {
            console.error("Erro no ConfigurarLembretesIntent:", error);
            return handlerInput.responseBuilder.speak('Desculpe, tive um problema ao configurar seus lembretes.').getResponse();
        }
    }
};

// 3. Handler Verificar Medicamentos
const VerificarMedicamentosIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'VerificarMedicamentosIntent';
    },
    async handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: VerificarMedicamentosIntent ===");
        const alexaUserId = handlerInput.requestEnvelope.context.System.user.userId;

        try {
            const { data: paciente, error: errorPaciente } = await supabase
                .from('paciente')
                .select('id_paciente')
                .eq('alexa_user_id', alexaUserId)
                .single();

            if (errorPaciente || !paciente) {
                return handlerInput.responseBuilder.speak('Não encontrei seu cadastro no sistema.').getResponse();
            }

            const { data, error } = await supabase
                .from('registro_consumo')
                .select(`
                    id_registro,
                    timestamp_agendado,
                    medicamento!inner ( nome_farmaco, dosagem, id_paciente )
                `)
                .eq('medicamento.id_paciente', paciente.id_paciente)
                .eq('status_dose', 'PENDENTE');

            if (error) throw error;

            let speakOutput = '';
            if (data && data.length > 0) {
                speakOutput = `Você tem ${data.length} remédios pendentes hoje. `;
                const registrosIds = [];

                data.forEach(registro => {
                    const dataHora = new Date(registro.timestamp_agendado);
                    dataHora.setHours(dataHora.getHours() - 3);
                    const horaFormatada = dataHora.getHours() + " e " + dataHora.getMinutes();

                    speakOutput += `O ${registro.medicamento.nome_farmaco} às ${horaFormatada}. `;
                    registrosIds.push(registro.id_registro);
                });

                speakOutput += 'Você gostaria de confirmar que tomou eles?';

                const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
                sessionAttributes.registrosParaConfirmar = registrosIds;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            } else {
                speakOutput = 'Parabéns, você não tem nenhum remédio pendente para hoje! Posso ajudar com algo mais?';
            }

            return handlerInput.responseBuilder.speak(speakOutput).reprompt('Diga sim para confirmar.').getResponse();
        } catch (error) {
            console.error("Erro ao buscar no Supabase:", error);
            return handlerInput.responseBuilder.speak('Desculpe, tive um problema ao acessar seu banco.').getResponse();
        }
    }
};

// 4. Handler para quando o usuário disser "Sim"
const SimIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent';
    },
    async handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: AMAZON.YesIntent (Confirmação) ===");
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const registros = sessionAttributes.registrosParaConfirmar;

        if (!registros || registros.length === 0) {
            return handlerInput.responseBuilder
                .speak('Não tenho certeza de qual remédio você está falando. Diga o nome do remédio para confirmar.')
                .getResponse();
        }

        try {
            await supabase
                .from('registro_consumo')
                .update({ status_dose: 'CONFIRMADA', timestamp_confirmacao: new Date().toISOString() })
                .in('id_registro', registros);

            handlerInput.attributesManager.setSessionAttributes({});

            return handlerInput.responseBuilder
                .speak('Pronto! Registrei no sistema que você tomou os remédios. Parabéns por cuidar da saúde!')
                .getResponse();
                
        } catch (error) {
            console.error("Erro ao confirmar via Sim:", error);
            return handlerInput.responseBuilder.speak('Tive um problema ao salvar no banco.').getResponse();
        }
    }
};

// 5. Handler Confirmar Medicamento (Com nome específico)
const ConfirmarMedicamentoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConfirmarMedicamentoIntent';
    },
    async handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: ConfirmarMedicamentoIntent ===");
        const nomeRemedio = Alexa.getSlotValue(handlerInput.requestEnvelope, 'remedio');
        const alexaUserId = handlerInput.requestEnvelope.context.System.user.userId;

        try {
            if (!nomeRemedio) {
                return handlerInput.responseBuilder.speak('Qual é o nome do remédio que você tomou?').reprompt('Diga o nome do remédio.').getResponse();
            }

            const { data: paciente, error: errorPaciente } = await supabase
                .from('paciente').select('id_paciente').eq('alexa_user_id', alexaUserId).single();

            if (errorPaciente || !paciente) {
                return handlerInput.responseBuilder.speak('Não encontrei seu cadastro no sistema.').getResponse();
            }

            const { data: medData, error: medError } = await supabase
                .from('medicamento').select('id_medicamento').eq('id_paciente', paciente.id_paciente).ilike('nome_farmaco', `%${nomeRemedio}%`).limit(1);

            if (medError || !medData || medData.length === 0) {
                return handlerInput.responseBuilder.speak(`Não encontrei o remédio ${nomeRemedio} na sua prescrição.`).getResponse();
            }

            const { data: regData, error: regError } = await supabase
                .from('registro_consumo').select('id_registro').eq('id_medicamento', medData[0].id_medicamento).eq('status_dose', 'PENDENTE').limit(1);

            if (regError || !regData || regData.length === 0) {
                return handlerInput.responseBuilder.speak(`Você não tem dose pendente para o remédio ${nomeRemedio}.`).getResponse();
            }

            await supabase
                .from('registro_consumo')
                .update({ status_dose: 'CONFIRMADA', timestamp_confirmacao: new Date().toISOString() })
                .eq('id_registro', regData[0].id_registro);

            return handlerInput.responseBuilder.speak(`Pronto! Registrei no sistema que você tomou o ${nomeRemedio}. Parabéns por cuidar da saúde!`).getResponse();
        } catch (error) {
            console.error("Erro ao confirmar:", error);
            return handlerInput.responseBuilder.speak('Tive um problema ao salvar no banco.').getResponse();
        }
    }
};

// 6. Handler Recusar Medicamento
const RecusarMedicamentoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RecusarMedicamentoIntent';
    },
    async handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: RecusarMedicamentoIntent ===");
        const nomeRemedio = Alexa.getSlotValue(handlerInput.requestEnvelope, 'remedio');
        const alexaUserId = handlerInput.requestEnvelope.context.System.user.userId;

        try {
            if (!nomeRemedio) {
                return handlerInput.responseBuilder.speak('Qual remédio você não vai tomar?').reprompt('Diga o nome do remédio.').getResponse();
            }

            const { data: paciente } = await supabase.from('paciente').select('id_paciente').eq('alexa_user_id', alexaUserId).single();
            if (!paciente) return handlerInput.responseBuilder.speak('Paciente não encontrado.').getResponse();

            const { data: medData } = await supabase.from('medicamento').select('id_medicamento').eq('id_paciente', paciente.id_paciente).ilike('nome_farmaco', `%${nomeRemedio}%`).limit(1);
            if (!medData || medData.length === 0) return handlerInput.responseBuilder.speak(`Não encontrei o remédio ${nomeRemedio}.`).getResponse();

            const { data: regData } = await supabase.from('registro_consumo').select('id_registro').eq('id_medicamento', medData[0].id_medicamento).eq('status_dose', 'PENDENTE').limit(1);
            if (!regData || regData.length === 0) return handlerInput.responseBuilder.speak(`Não há doses pendentes para ${nomeRemedio}.`).getResponse();

            await supabase
                .from('registro_consumo')
                .update({ status_dose: 'OMITIDA', timestamp_confirmacao: new Date().toISOString() })
                .eq('id_registro', regData[0].id_registro);

            return handlerInput.responseBuilder.speak(`Entendido. Registrei a recusa do ${nomeRemedio} e vou avisar o seu cuidador.`).getResponse();
        } catch (error) {
            console.error("Erro ao recusar:", error);
            return handlerInput.responseBuilder.speak('Tive um problema ao registrar a recusa.').getResponse();
        }
    }
};

// 7. Handler Relatar Bem Estar
const RelatarBemEstarIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RelatarBemEstarIntent';
    },
    async handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: RelatarBemEstarIntent ===");
        const alexaUserId = handlerInput.requestEnvelope.context.System.user.userId;

        try {
            const { data: paciente } = await supabase.from('paciente').select('id_paciente').eq('alexa_user_id', alexaUserId).single();
            if (!paciente) return handlerInput.responseBuilder.speak('Cadastro não encontrado.').getResponse();

            await supabase.from('log_interacao').insert([{
                id_paciente: paciente.id_paciente,
                tipo_evento: 'ALERTA_MAL_ESTAR',
                dados: { mensagem: "Paciente relatou não estar se sentindo bem." }
            }]);

            await pushNotification.alertarCuidadores(paciente.id_paciente, 'Alerta de Saúde', 'O paciente relatou não estar se sentindo bem agora.');

            return handlerInput.responseBuilder.speak('Sinto muito que não esteja bem. Já enviei um aviso para o aplicativo do seu cuidador.').getResponse();
        } catch (error) {
            console.error(error);
            return handlerInput.responseBuilder.speak('Não consegui enviar o aviso, por favor, tente ligar para alguém.').getResponse();
        }
    }
};

// 8. Handler Emergência
const EmergenciaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'EmergenciaIntent';
    },
    async handle(handlerInput) {
        console.log("=== NOVA REQUISIÇÃO DA ALEXA: EmergenciaIntent ===");
        const alexaUserId = handlerInput.requestEnvelope.context.System.user.userId;

        try {
            const { data: paciente } = await supabase.from('paciente').select('id_paciente').eq('alexa_user_id', alexaUserId).single();
            if (!paciente) return handlerInput.responseBuilder.speak('Cadastro não encontrado.').getResponse();

            await supabase.from('log_interacao').insert([{
                id_paciente: paciente.id_paciente,
                tipo_evento: 'EMERGENCIA_CRITICA',
                dados: { mensagem: "Paciente pediu socorro via Alexa." }
            }]);

            await pushNotification.alertarCuidadores(paciente.id_paciente, '🚨 EMERGÊNCIA 🚨', 'O paciente pediu SOCORRO pela Alexa!');

            return handlerInput.responseBuilder.speak('Calma, a notificação de emergência máxima acabou de ser enviada.').getResponse();
        } catch (error) {
            console.error(error);
            return handlerInput.responseBuilder.speak('Erro no sistema de emergência.').getResponse();
        }
    }
};

// 9. Error Handler
const ErrorHandler = {
    canHandle() { return true; },
    handle(handlerInput, error) {
        console.error(`~~~~ Erro capturado pela Alexa: ${error.message}`);
        return handlerInput.responseBuilder.speak('Desculpe, ocorreu um erro no servidor.').reprompt('Por favor, tente novamente.').getResponse();
    }
};

// 10. CONSTRUÇÃO DA SKILL
const skillBuilder = Alexa.SkillBuilders.custom()
    .withSkillId('amzn1.ask.skill.6cd8d640-3b4a-43c0-9263-0aa45601c114')
    .withApiClient(new Alexa.DefaultApiClient())
    .addRequestHandlers(
        LaunchRequestHandler,
        ConfigurarLembretesIntentHandler, // <-- Adicionado aqui para processar o novo comando de voz
        VerificarMedicamentosIntentHandler,
        SimIntentHandler,
        ConfirmarMedicamentoIntentHandler,
        RecusarMedicamentoIntentHandler,
        RelatarBemEstarIntentHandler,
        EmergenciaIntentHandler
    )
    .addErrorHandlers(ErrorHandler);

const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, false, false);
exports.receberRequisicao = adapter.getRequestHandlers();