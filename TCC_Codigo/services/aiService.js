const { GoogleGenAI } = require('@google/genai');
const supabase = require('../config/database');

const aiService = {
    async gerarResumoPaciente(id_paciente) {
        try {
            // Verifica se a chave foi configurada
            if (!process.env.GEMINI_API_KEY) {
                throw new Error("Chave da API do Gemini (GEMINI_API_KEY) não configurada.");
            }

            // Inicia o cliente do Gemini
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

            // 1. Buscar as interações e registros recentes (últimos 7 dias) do paciente
            const seteDiasAtras = new Date();
            seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
            const { data: medicamentos, error: errMed } = await supabase
                .from('medicamento')
                .select('id_medicamento, nome_farmaco')
                .eq('id_paciente', id_paciente);
                
            if (errMed || !medicamentos || medicamentos.length === 0) {
                return "Nenhum medicamento encontrado para este paciente.";
            }
            
            const idsMedicamentos = medicamentos.map(m => m.id_medicamento);

            const { data: registrosCorretos, error: errRegistros2 } = await supabase
                .from('registro_consumo')
                .select('status_dose, timestamp_agendado, id_medicamento')
                .in('id_medicamento', idsMedicamentos)
                .gte('timestamp_agendado', seteDiasAtras.toISOString());

            const { data: interacoes, error: errInteracoes } = await supabase
                .from('log_interacao')
                .select('tipo_evento, dados, created_at')
                .eq('id_paciente', id_paciente)
                .gte('created_at', seteDiasAtras.toISOString());

            if (errRegistros2 || errInteracoes) {
                console.error("Erro ao buscar dados para IA:", errRegistros2, errInteracoes);
                throw new Error("Falha ao consultar histórico do paciente.");
            }

            // 2. Montar os dados de forma legível para a IA
            const resumoDados = {
                doses_confirmadas: registrosCorretos.filter(r => r.status_dose === 'CONFIRMADA').length,
                doses_esquecidas: registrosCorretos.filter(r => r.status_dose === 'OMITIDA').length,
                doses_pendentes: registrosCorretos.filter(r => r.status_dose === 'PENDENTE').length,
                alertas: interacoes.map(i => `${i.tipo_evento} - ${JSON.stringify(i.dados)} em ${i.created_at}`)
            };

            const prompt = `
Você é um assistente virtual de saúde. Seu objetivo é ajudar um cuidador a entender o estado atual do seu paciente idoso.
Abaixo estão os dados dos últimos 7 dias de medicamentos do paciente e os alertas disparados.

Doses Confirmadas: ${resumoDados.doses_confirmadas}
Doses Omitidas (Esquecidas/Não tomadas): ${resumoDados.doses_esquecidas}
Doses Pendentes Futuras ou Atrasadas: ${resumoDados.doses_pendentes}

Alertas de Mal Estar / Emergência recentes:
${resumoDados.alertas.length > 0 ? resumoDados.alertas.join('\n') : 'Nenhum alerta.'}

Faça um breve resumo (no máximo 3 parágrafos curtos) em linguagem simples, respeitosa e empática para o cuidador.
Diga se a adesão aos medicamentos está boa e se ele deve se preocupar com algum alerta. Se houve emergência, sugira ter atenção redobrada.
            `;

            // 3. Chamar a API do Gemini
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: prompt,
            });

            return response.text;
        } catch (error) {
            console.error("Erro no serviço de IA:", error);
            throw error;
        }
    }
};

module.exports = aiService;
