    const Alexa = require('ask-sdk-core');
    const { ExpressAdapter } = require('ask-sdk-express-adapter');
    const supabase = require('../config/database');
    const pushNotification = require('../services/pushNotification'); // Importação habilitada

    // 1. Handler LaunchRequest (Início)
        const LaunchRequestHandler = {
        canHandle(handlerInput) {
            return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
        },
        handle(handlerInput) {
            // --- ADICIONE ESTAS DUAS LINHAS ---
            const meuId = handlerInput.requestEnvelope.context.System.user.userId;
            console.log("🎯 MEU ALEXA USER ID É:", meuId);
            // ----------------------------------

            console.log("=== NOVA REQUISIÇÃO DA ALEXA: LaunchRequest ===");
            const speakOutput = 'Olá! O servidor do seu projeto TCC está conectado e funcionando perfeitamente. Como posso ajudar?';

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
    };

    // 2. Handler Verificar Medicamentos
    const VerificarMedicamentosIntentHandler = {
        canHandle(handlerInput) {
            return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
                && Alexa.getIntentName(handlerInput.requestEnvelope) === 'VerificarMedicamentosIntent';
        },
        async handle(handlerInput) {
            console.log("=== NOVA REQUISIÇÃO DA ALEXA: VerificarMedicamentosIntent ===");
            const alexaUserId = handlerInput.requestEnvelope.context.System.user.userId;

            try {
                // 1. Valida de qual paciente é essa Alexa
                const { data: paciente, error: errorPaciente } = await supabase
                    .from('paciente')
                    .select('id_paciente')
                    .eq('alexa_user_id', alexaUserId)
                    .single();

                if (errorPaciente || !paciente) {
                    return handlerInput.responseBuilder.speak('Não encontrei seu cadastro no sistema.').getResponse();
                }

                // 2. Busca usando inner join para filtrar pelo paciente logado
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
                    data.forEach(registro => {
                        const dataHora = new Date(registro.timestamp_agendado);
                        // Ajuste de Fuso Horário (-3 horas para Brasília)
                        dataHora.setHours(dataHora.getHours() - 3);
                        const horaFormatada = dataHora.getHours() + " e " + dataHora.getMinutes();

                        speakOutput += `O ${registro.medicamento.nome_farmaco} às ${horaFormatada}. `;
                    });
                    speakOutput += 'Gostaria de confirmar que tomou algum deles?';
                } else {
                    speakOutput = 'Parabéns, você não tem nenhum remédio pendente para hoje! Posso ajudar com algo mais?';
                }

                return handlerInput.responseBuilder.speak(speakOutput).reprompt('Posso ajudar com mais alguma coisa?').getResponse();
            } catch (error) {
                console.error("Erro ao buscar no Supabase:", error);
                return handlerInput.responseBuilder.speak('Desculpe, tive um problema ao acessar seu banco.').getResponse();
            }
        }
    };

    // 3. Handler Confirmar Medicamento
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

    // 4. Handler Recusar Medicamento
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

    // 5. Handler Relatar Bem Estar
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

    // 6. Handler Emergência
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

    // 7. Error Handler
    const ErrorHandler = {
        canHandle() { return true; },
        handle(handlerInput, error) {
            console.error(`~~~~ Erro capturado pela Alexa: ${error.message}`);
            return handlerInput.responseBuilder.speak('Desculpe, ocorreu um erro no servidor.').reprompt('Por favor, tente novamente.').getResponse();
        }
    };

    // 8. CONSTRUÇÃO DA SKILL (Deve ficar sempre no final do arquivo)
    const skillBuilder = Alexa.SkillBuilders.custom()
        .withSkillId('amzn1.ask.skill.6cd8d640-3b4a-43c0-9263-0aa45601c114')
        .addRequestHandlers(
            LaunchRequestHandler,
            VerificarMedicamentosIntentHandler,
            ConfirmarMedicamentoIntentHandler,
            RecusarMedicamentoIntentHandler,
            RelatarBemEstarIntentHandler,
            EmergenciaIntentHandler
        )
        .addErrorHandlers(ErrorHandler);

    const skill = skillBuilder.create();
    const adapter = new ExpressAdapter(skill, false, false);
    exports.receberRequisicao = adapter.getRequestHandlers();