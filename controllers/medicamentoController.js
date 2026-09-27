






const supabase = require('../config/database');

const listarStatus = async (req, res) => {
    console.log("[API] App solicitou status dos medicamentos do dia.");

    try {
        
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
            paciente: "Paciente Teste", 
            lembretes_do_dia: lembretes
        });

    } catch (error) {
        console.error("[API ERRO]", error);
        return res.status(500).json({ sucesso: false, erro: "Falha ao buscar dados do servidor." });
    }
};


const agendarMedicamento = async (req, res) => {
    const { nome, dosagem, horario } = req.body;
    
    console.log(`[API] Novo agendamento recebido: ${nome} às ${horario}`);
    
    
    return res.status(201).json({ sucesso: true, mensagem: "Agendado e sincronizado com a Alexa." });
};

module.exports = {
    listarStatus,
    agendarMedicamento
};