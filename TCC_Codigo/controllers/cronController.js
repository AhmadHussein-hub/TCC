const supabase = require('../config/database');
// const pushNotification = require('../services/pushNotification'); // Importe quando for habilitar os pushes

const cronController = {
    async verificarDoses(req, res) {
        console.log("=== INICIANDO VARREDURA DE TIMEOUT ===");

        // Segurança: A Vercel envia um header secreto para garantir que só ela roda o cron
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
            return res.status(401).json({ error: 'Acesso negado' });
        }

        try {
            const agora = new Date();

            // 1. Busca todas as doses pendentes que já passaram do horário
            const { data: doses, error } = await supabase
                .from('registro_consumo')
                .select(`
                    id_registro,
                    timestamp_agendado,
                    medicamento!inner ( id_paciente, nome_farmaco, limite_atraso_minutos )
                `)
                .eq('status_dose', 'PENDENTE')
                .lte('timestamp_agendado', agora.toISOString()); // Apenas horários no passado

            if (error) throw error;
            if (!doses || doses.length === 0) {
                return res.status(200).json({ message: 'Nenhuma dose pendente e atrasada encontrada.' });
            }

            let esquecidos = 0;

            // 2. Verifica uma por uma se estourou o limite de tolerância
            for (const dose of doses) {
                const agendado = new Date(dose.timestamp_agendado);
                const limite = dose.medicamento.limite_atraso_minutos;

                // Calcula a diferença em minutos
                const diferencaMinutos = (agora - agendado) / (1000 * 60);

                if (diferencaMinutos >= limite) {
                    // TIMEOUT ATINGIDO! O idoso esqueceu o remédio.
                    esquecidos++;

                    // A. Atualiza o status para OMITIDA
                    await supabase
                        .from('registro_consumo')
                        .update({ status_dose: 'OMITIDA' }) // Conforme seu CHECK constraint
                        .eq('id_registro', dose.id_registro);

                    // B. Registra no Log de Interação
                    await supabase.from('log_interacao').insert([{
                        id_paciente: dose.medicamento.id_paciente,
                        tipo_evento: 'MEDICAMENTO_ESQUECIDO',
                        dados: {
                            medicamento: dose.medicamento.nome_farmaco,
                            atraso_minutos: Math.round(diferencaMinutos)
                        }
                    }]);

                    // C. Dispara o Push Notification para o celular do Cuidador
                    /* await pushNotification.alertarCuidadores(
                        dose.medicamento.id_paciente, 
                        '⚠️ Remédio Esquecido!', 
                        `O paciente não confirmou o uso do ${dose.medicamento.nome_farmaco} no tempo limite.`
                    ); */
                }
            }

            return res.status(200).json({ message: `Varredura concluída. ${esquecidos} doses marcadas como esquecidas.` });

        } catch (error) {
            console.error("Erro no cron job:", error);
            return res.status(500).json({ error: 'Erro interno na varredura' });
        }
    }
};

module.exports = cronController;