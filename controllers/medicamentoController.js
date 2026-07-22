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
        // [CÓDIGO REAL DO SUPABASE]
        // const { data, error } = await supabase.from('Registro_Consumo').select('*');
        // if(error) throw error;
        
        // Retorno mockado baseado no que definimos para o Figma
        return res.status(200).json({
            sucesso: true,
            paciente: "Sr. João Silva",
            lembretes_do_dia: [
                { id: 1, remedio: "Losartana 50mg", horario: "08:00", status: "CONFIRMADA" },
                { id: 2, remedio: "Metformina 500mg", horario: "14:00", status: "PENDENTE" },
                { id: 3, remedio: "Vitamina D 1000UI", horario: "20:00", status: "OMITIDA" },
                { id: 4, remedio: "AAS 100mg", horario: "22:00", status: "PENDENTE" }
            ]
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