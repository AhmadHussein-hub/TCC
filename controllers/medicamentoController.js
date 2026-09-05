/**
 * ============================================================================
 * CONTROLLER DO APLICATIVO MOBILE
 * ============================================================================
 * Lógica das requisições feitas pelo celular do Cuidador (o Dashboard no Figma)
 */

const supabase = require('../config/database');

const listarStatus = async (req, res) => {
    console.log("[API] App solicitou status dos medicamentos do dia.");

    try {
        // Busca os registros de consumo junto com os dados do medicamento
        const { data, error } = await supabase
            .from('registro_consumo')
            .select(`
                id_registro,
                timestamp_agendado,
                status_dose,
                medicamento (
                    nome_farmaco,
                    dosagem
                )
            `);

        if (error) {
            console.error("[ERRO SUPABASE]", error);
            throw error;
        }

        // Formata os dados para o dashboard
        const lembretes = data.map(registro => {
            return {
                id: registro.id_registro,
                remedio: `${registro.medicamento.nome_farmaco} ${registro.medicamento.dosagem}`,
                horario: new Date(registro.timestamp_agendado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                status: registro.status_dose
            };
        });

        return res.status(200).json({
            sucesso: true,
            paciente: "Paciente Teste", // Fixo por enquanto
            lembretes_do_dia: lembretes
        });

    } catch (error) {
        console.error("[API ERRO]", error);
        return res.status(500).json({ sucesso: false, erro: "Falha ao buscar dados do servidor." });
    }
};

// Exemplo de como a tela de "Agendar" salvaria no banco
const agendarMedicamento = async (req, res) => {
    const { nome, dosagem, horario } = req.body;
    
    console.log(`[API] Novo agendamento recebido: ${nome} às ${horario}`);
    // await supabase.from('Medicamentos').insert([{nome, dosagem, horario}]);
    
    return res.status(201).json({ sucesso: true, mensagem: "Agendado e sincronizado com a Alexa." });
};

module.exports = {
    listarStatus,
    agendarMedicamento
};