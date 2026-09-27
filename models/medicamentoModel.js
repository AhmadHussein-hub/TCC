









const supabase = require('../config/database');






const buscarStatusDoDia = async (pacienteId) => {
    try {
        
        






























        
        return [
            { id: 1, remedio: "Losartana 50mg", horario: "08:00", status: "CONFIRMADA" },
            { id: 2, remedio: "Metformina 500mg", horario: "14:00", status: "PENDENTE" },
            { id: 3, remedio: "Vitamina D 1000UI", horario: "20:00", status: "OMITIDA" },
            { id: 4, remedio: "AAS 100mg", horario: "22:00", status: "PENDENTE" }
        ];

    } catch (error) {
        console.error("Erro no Model ao buscar status do dia:", error);
        throw error; 
    }
};






const salvarNovoAgendamento = async (dados) => {
    try {
        
        














        
        console.log(`[MODEL MOCK] Simulando insert no banco para: ${dados.nome}`);
        return { id: Math.floor(Math.random() * 100), ...dados };

    } catch (error) {
        console.error("Erro no Model ao salvar agendamento:", error);
        throw error;
    }
};






const atualizarStatusDose = async (nomeRemedio, novoStatus) => {
    try {
        
        










       console.log(`[MODEL MOCK] Status do remédio ${nomeRemedio} atualizado para ${novoStatus} no banco.`);
       return true;
    } catch (error) {
         console.error("Erro no Model ao atualizar status da dose:", error);
         throw error;
    }
}

module.exports = {
    buscarStatusDoDia,
    salvarNovoAgendamento,
    atualizarStatusDose
};