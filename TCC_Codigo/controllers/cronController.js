const cron = require('node-cron');
const supabase = require('../config/database');
const pushNotification = require('../services/pushNotification');










async function gerarRegistrosDiariosLogica() {
    console.log("=== INICIANDO GERAÇÃO DE REGISTROS DIÁRIOS ===");

    
    const agora = new Date();
    const inicioHojeBRT = new Date();
    inicioHojeBRT.setUTCHours(3, 0, 0, 0); 

    const fimHojeBRT = new Date();
    fimHojeBRT.setUTCHours(26, 59, 59, 999); 

    
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

    for (const med of medicamentos) {
        
        const horariosDoDia = calcularHorariosDoDia(
            med.hora_inicio,
            med.frequencia_horas
        );

        for (const horario of horariosDoDia) {
            
            
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
                continue; 
            }

            
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
            }
        }
    }

    console.log(`=== GERAÇÃO CONCLUÍDA: ${criados} criados, ${ignorados} já existiam ===`);

    return { criados, ignorados };
}





function calcularHorariosDoDia(horaInicioStr, frequenciaHoras) {
    const horarios = [];

    
    const [horas, minutos] = horaInicioStr.split(':').map(Number);

    
    const inicioDia = new Date();
    inicioDia.setUTCHours(3, 0, 0, 0);

    
    const fimDia = new Date();
    fimDia.setUTCHours(27, 0, 0, 0); 

    
    let proximaDose = new Date();
    
    proximaDose.setUTCHours(horas + 3, minutos, 0, 0);

    
    if (proximaDose < inicioDia) {
        proximaDose = new Date(proximaDose.getTime() + 24 * 60 * 60 * 1000);
    }

    
    while (proximaDose < fimDia) {
        horarios.push(new Date(proximaDose)); 
        proximaDose = new Date(proximaDose.getTime() + frequenciaHoras * 60 * 60 * 1000);
    }

    return horarios;
}




const cronController = {

    
    
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

    
    
    async verificarDoses(req, res) {
        console.log("=== INICIANDO VARREDURA DE TIMEOUT ===");

        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
            return res.status(401).json({ error: 'Acesso negado' });
        }

        try {
            const agora = new Date();

            
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





const iniciarCronJobs = () => {

    
    cron.schedule('0 6 * * *', async () => {
        console.log('⏰ [CRON] Gerando registros diários de medicamentos...');
        try {
            const resultado = await gerarRegistrosDiariosLogica();
            console.log(`⏰ [CRON] Resultado: ${resultado.criados} criados, ${resultado.ignorados} já existiam.`);
        } catch (error) {
            console.error('⏰ [CRON] Erro ao gerar registros diários:', error);
        }
    }, { scheduled: true, timezone: "America/Sao_Paulo" });

    
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


module.exports = {
    gerarRegistrosDiarios: cronController.gerarRegistrosDiarios,
    verificarDoses: cronController.verificarDoses,
    iniciarCronJobs
};