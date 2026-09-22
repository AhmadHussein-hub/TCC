const cron = require('node-cron');
const supabase = require('../config/database');
const pushNotification = require('../services/pushNotification');

// ============================================================================
// FUNÇÃO CENTRAL: Gera os registros de consumo diários para todos os pacientes
// ============================================================================
// Como funciona:
//   1. Busca todos os medicamentos ativos (com hora_inicio e frequencia_horas)
//   2. Calcula todos os horários de dose para o dia de hoje
//   3. Insere um registro PENDENTE em `registro_consumo` para cada horário
//   4. Ignora se o registro já existir (segurança contra duplicatas)
//   5. Após criar os registros, agenda lembretes na Alexa usando o refresh_token
// ============================================================================
async function gerarRegistrosDiariosLogica() {
    console.log("=== INICIANDO GERAÇÃO DE REGISTROS DIÁRIOS ===");

    // Define o intervalo do dia de hoje no fuso de Brasília (UTC-3)
    const agora = new Date();
    const inicioHojeBRT = new Date();
    inicioHojeBRT.setUTCHours(3, 0, 0, 0); // 03:00 UTC = 00:00 BRT

    const fimHojeBRT = new Date();
    fimHojeBRT.setUTCHours(26, 59, 59, 999); // 26:59 UTC = 23:59 BRT

    // 1. Busca todos os medicamentos que têm hora_inicio definida
    const { data: medicamentos, error } = await supabase
        .from('medicamento')
        .select('id_medicamento, id_paciente, nome_farmaco, hora_inicio, frequencia_horas, limite_atraso_minutos')
        .not('hora_inicio', 'is', null)
        .not('frequencia_horas', 'is', null)
        .gt('frequencia_horas', 0);

    if (error) throw error;
    if (!medicamentos || medicamentos.length === 0) {
        console.log("Nenhum medicamento com horário definido encontrado.");
        return { criados: 0, ignorados: 0 };
    }

    console.log(`Processando ${medicamentos.length} medicamentos...`);

    let criados = 0;
    let ignorados = 0;

    // Agrupa registros criados por paciente para agendar lembretes em lote
    const registrosPorPaciente = {};

    for (const med of medicamentos) {
        // Calcula todos os horários de dose do dia
        const horariosDoDia = calcularHorariosDoDia(
            med.hora_inicio,
            med.frequencia_horas
        );

        for (const horario of horariosDoDia) {
            // Verifica se já existe um registro para esse medicamento nesse horário hoje
            // (janela de +/- 30 min para evitar duplicatas por pequenas diferenças de segundos)
            const janelInicio = new Date(horario.getTime() - 30 * 60 * 1000).toISOString();
            const janelaFim = new Date(horario.getTime() + 30 * 60 * 1000).toISOString();

            const { data: existente } = await supabase
                .from('registro_consumo')
                .select('id_registro')
                .eq('id_medicamento', med.id_medicamento)
                .gte('timestamp_agendado', janelInicio)
                .lte('timestamp_agendado', janelaFim)
                .limit(1);

            if (existente && existente.length > 0) {
                ignorados++;
                continue; // Registro já existe, pula
            }

            // Insere o novo registro PENDENTE
            const { error: insertError } = await supabase
                .from('registro_consumo')
                .insert([{
                    id_medicamento: med.id_medicamento,
                    timestamp_agendado: horario.toISOString(),
                    status_dose: 'PENDENTE'
                }]);

            if (insertError) {
                console.error(`Erro ao inserir registro para ${med.nome_farmaco} às ${horario.toISOString()}:`, insertError);
            } else {
                criados++;
                console.log(`✅ Registro criado: ${med.nome_farmaco} às ${horario.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);

                // Acumula para agendar lembrete na Alexa depois
                if (!registrosPorPaciente[med.id_paciente]) {
                    registrosPorPaciente[med.id_paciente] = [];
                }
                registrosPorPaciente[med.id_paciente].push({
                    nomeFarmaco: med.nome_farmaco,
                    horario: horario
                });
            }
        }
    }

    console.log(`=== GERAÇÃO CONCLUÍDA: ${criados} criados, ${ignorados} já existiam ===`);

    // 2. Para cada paciente que teve registros criados, agenda os lembretes na Alexa
    for (const idPaciente of Object.keys(registrosPorPaciente)) {
        await agendarLembretesNaAlexa(Number(idPaciente), registrosPorPaciente[idPaciente]);
    }

    return { criados, ignorados };
}

// ============================================================================
// Agenda lembretes diretamente na API da Alexa usando o refresh_token do paciente.
// Isso permite que a Alexa fale sozinha no horário certo, sem o usuário abrir a skill.
// ============================================================================
async function agendarLembretesNaAlexa(idPaciente, doses) {
    console.log(`🔔 Agendando ${doses.length} lembretes na Alexa para o paciente ${idPaciente}...`);

    // 1. Busca o refresh_token salvo para este paciente
    const { data: paciente, error } = await supabase
        .from('paciente')
        .select('amazon_refresh_token')
        .eq('id_paciente', idPaciente)
        .single();

    if (error || !paciente || !paciente.amazon_refresh_token) {
        console.warn(`⚠️  Paciente ${idPaciente} sem amazon_refresh_token. Lembretes da Alexa não serão criados.`);
        console.warn(`   → Para corrigir: o paciente precisa acessar o link de vinculação de conta Amazon uma vez.`);
        return;
    }

    // 2. Troca o refresh_token por um access_token fresco
    let accessToken;
    try {
        const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: paciente.amazon_refresh_token,
                client_id: process.env.AMAZON_CLIENT_ID,
                client_secret: process.env.AMAZON_CLIENT_SECRET
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error(`❌ Erro ao renovar token da Amazon para paciente ${idPaciente}:`, tokenData.error);
            return;
        }

        accessToken = tokenData.access_token;
    } catch (err) {
        console.error(`❌ Falha na requisição de token para paciente ${idPaciente}:`, err.message);
        return;
    }

    // 3. Para cada dose, cria um lembrete na API da Alexa
    let lembretesCriados = 0;
    for (const dose of doses) {
        // O timestamp está em UTC — informamos timeZoneId: 'UTC' para a Alexa
        // interpretar corretamente sem conversão dupla
        const horarioUTC = dose.horario.toISOString().split('.')[0]; // ex: "2026-09-21T12:00:00"

        const reminderPayload = {
            requestTime: new Date().toISOString(),
            trigger: {
                type: 'SCHEDULED_ABSOLUTE',
                scheduledTime: horarioUTC,
                timeZoneId: 'UTC'
            },
            alertInfo: {
                spokenInfo: {
                    content: [{
                        locale: 'pt-BR',
                        text: `Atenção! Hora de tomar o medicamento ${dose.nomeFarmaco}.`
                    }]
                }
            },
            pushNotification: { status: 'ENABLED' }
        };

        try {
            const response = await fetch('https://api.amazonalexa.com/v1/alerts/reminders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reminderPayload)
            });

            if (response.ok) {
                lembretesCriados++;
                console.log(`🔔 Lembrete Alexa criado: ${dose.nomeFarmaco} às ${dose.horario.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
            } else {
                const errBody = await response.json();
                console.error(`❌ Falha ao criar lembrete para ${dose.nomeFarmaco}:`, errBody);
            }
        } catch (err) {
            console.error(`❌ Erro na requisição de lembrete para ${dose.nomeFarmaco}:`, err.message);
        }
    }

    console.log(`🔔 ${lembretesCriados}/${doses.length} lembretes criados na Alexa para o paciente ${idPaciente}.`);
}

// ============================================================================
// Calcula todos os horários de dose de um medicamento para o dia de hoje
// Ex: hora_inicio="08:00", frequencia_horas=8 → [08:00, 16:00, 00:00 (do dia seguinte, ignorada)]
// ============================================================================
function calcularHorariosDoDia(horaInicioStr, frequenciaHoras) {
    const horarios = [];

    // Monta a data de hoje com o horário de início no fuso de Brasília
    const [horas, minutos] = horaInicioStr.split(':').map(Number);

    // Início do dia de hoje (meia-noite BRT = 03:00 UTC)
    const inicioDia = new Date();
    inicioDia.setUTCHours(3, 0, 0, 0);

    // Fim do dia de hoje (23:59:59 BRT = 02:59:59 UTC do dia seguinte)
    const fimDia = new Date();
    fimDia.setUTCHours(27, 0, 0, 0); // 27h UTC = 24h BRT = virada do dia

    // Primeira dose: hora_inicio de hoje em BRT → converte para UTC
    let proximaDose = new Date();
    // Seta no horário UTC equivalente ao horário BRT informado (BRT = UTC - 3)
    proximaDose.setUTCHours(horas + 3, minutos, 0, 0);

    // Se a primeira dose calculada ficou no dia anterior, ajusta para o dia correto
    if (proximaDose < inicioDia) {
        proximaDose = new Date(proximaDose.getTime() + 24 * 60 * 60 * 1000);
    }

    // Gera todos os horários dentro do dia de hoje
    while (proximaDose < fimDia) {
        horarios.push(new Date(proximaDose)); // Clona o objeto
        proximaDose = new Date(proximaDose.getTime() + frequenciaHoras * 60 * 60 * 1000);
    }

    return horarios;
}

// ============================================================================
// CONTROLLERS HTTP (chamados pelas rotas da Vercel e pelos cron jobs locais)
// ============================================================================
const cronController = {

    // Rota: GET /api/cron/gerar-registros-diarios
    // Chamada pela Vercel todo dia às 06:00 BRT
    async gerarRegistrosDiarios(req, res) {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
            return res.status(401).json({ error: 'Acesso negado' });
        }

        try {
            const resultado = await gerarRegistrosDiariosLogica();
            return res.status(200).json({
                message: `Registros diários gerados com sucesso.`,
                ...resultado
            });
        } catch (error) {
            console.error("Erro ao gerar registros diários:", error);
            return res.status(500).json({ error: 'Erro interno ao gerar registros' });
        }
    },

    // Rota: GET /api/cron/verificar-doses
    // Chamada pela Vercel a cada hora para detectar remédios esquecidos
    async verificarDoses(req, res) {
        console.log("=== INICIANDO VARREDURA DE TIMEOUT ===");

        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
            return res.status(401).json({ error: 'Acesso negado' });
        }

        try {
            const agora = new Date();

            // Busca todas as doses pendentes que já passaram do horário
            const { data: doses, error } = await supabase
                .from('registro_consumo')
                .select(`
                    id_registro,
                    timestamp_agendado,
                    medicamento!inner ( id_paciente, nome_farmaco, limite_atraso_minutos )
                `)
                .eq('status_dose', 'PENDENTE')
                .lte('timestamp_agendado', agora.toISOString());

            if (error) throw error;
            if (!doses || doses.length === 0) {
                return res.status(200).json({ message: 'Nenhuma dose pendente e atrasada encontrada.' });
            }

            let esquecidos = 0;

            for (const dose of doses) {
                const agendado = new Date(dose.timestamp_agendado);
                const limite = dose.medicamento.limite_atraso_minutos;
                const diferencaMinutos = (agora - agendado) / (1000 * 60);

                if (diferencaMinutos >= limite) {
                    esquecidos++;

                    await supabase
                        .from('registro_consumo')
                        .update({ status_dose: 'OMITIDA' })
                        .eq('id_registro', dose.id_registro);

                    await supabase.from('log_interacao').insert([{
                        id_paciente: dose.medicamento.id_paciente,
                        tipo_evento: 'MEDICAMENTO_ESQUECIDO',
                        dados: {
                            medicamento: dose.medicamento.nome_farmaco,
                            atraso_minutos: Math.round(diferencaMinutos)
                        }
                    }]);

                    await pushNotification.alertarCuidadores(
                        dose.medicamento.id_paciente,
                        '⚠️ Remédio Esquecido!',
                        `O paciente não confirmou o uso do ${dose.medicamento.nome_farmaco} no tempo limite.`
                    );
                }
            }

            return res.status(200).json({ message: `Varredura concluída. ${esquecidos} doses marcadas como esquecidas.` });

        } catch (error) {
            console.error("Erro no cron job:", error);
            return res.status(500).json({ error: 'Erro interno na varredura' });
        }
    }
};

// ============================================================================
// CRON JOBS LOCAIS (apenas quando rodando no PC em modo de desenvolvimento)
// A Vercel usa o vercel.json com crons HTTP em vez deste bloco
// ============================================================================
const iniciarCronJobs = () => {

    // JOB 1: Todo dia às 06:00 BRT — Gera os registros PENDENTE do dia e agenda lembretes na Alexa
    cron.schedule('0 6 * * *', async () => {
        console.log('⏰ [CRON] Gerando registros diários de medicamentos...');
        try {
            const resultado = await gerarRegistrosDiariosLogica();
            console.log(`⏰ [CRON] Resultado: ${resultado.criados} criados, ${resultado.ignorados} já existiam.`);
        } catch (error) {
            console.error('⏰ [CRON] Erro ao gerar registros diários:', error);
        }
    }, { scheduled: true, timezone: "America/Sao_Paulo" });

    // JOB 2: A cada hora — Verifica doses que passaram do limite e não foram confirmadas
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ [CRON] Verificando doses com timeout...');
        try {
            const agora = new Date();
            const { data: doses } = await supabase
                .from('registro_consumo')
                .select('id_registro, timestamp_agendado, medicamento!inner(id_paciente, nome_farmaco, limite_atraso_minutos)')
                .eq('status_dose', 'PENDENTE')
                .lte('timestamp_agendado', agora.toISOString());

            if (!doses || doses.length === 0) return;

            for (const dose of doses) {
                const diferencaMinutos = (agora - new Date(dose.timestamp_agendado)) / (1000 * 60);
                if (diferencaMinutos >= dose.medicamento.limite_atraso_minutos) {
                    await supabase.from('registro_consumo').update({ status_dose: 'OMITIDA' }).eq('id_registro', dose.id_registro);
                    await supabase.from('log_interacao').insert([{ id_paciente: dose.medicamento.id_paciente, tipo_evento: 'MEDICAMENTO_ESQUECIDO', dados: { medicamento: dose.medicamento.nome_farmaco, atraso_minutos: Math.round(diferencaMinutos) } }]);
                    await pushNotification.alertarCuidadores(dose.medicamento.id_paciente, '⚠️ Remédio Esquecido!', `O paciente não confirmou o uso do ${dose.medicamento.nome_farmaco} no tempo limite.`);
                    console.log(`⏰ [CRON] ${dose.medicamento.nome_farmaco} marcado como OMITIDA.`);
                }
            }
        } catch (error) {
            console.error('⏰ [CRON] Erro na verificação de timeout:', error);
        }
    }, { scheduled: true, timezone: "America/Sao_Paulo" });

    console.log('✅ Cron Jobs locais iniciados (06:00 geração + de hora em hora verificação).');
};

// Única exportação no final do arquivo
module.exports = {
    gerarRegistrosDiarios: cronController.gerarRegistrosDiarios,
    verificarDoses: cronController.verificarDoses,
    iniciarCronJobs
};