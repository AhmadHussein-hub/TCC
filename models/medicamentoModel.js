/**
 * ============================================================================
 * MODELO DE MEDICAMENTOS (Data Access Object)
 * ============================================================================
 * Este arquivo é o ÚNICO que deve conter lógica de banco de dados (SQL ou chamadas
 * diretas ao Supabase) relacionada a medicamentos. 
 * O Controller (medicamentoController.js) chama estas funções, em vez de 
 * acessar o banco diretamente. Isso isola a regra de negócio da regra de banco.
 */

const supabase = require('../config/database');

/**
 * Busca o status de todos os medicamentos agendados para o dia de hoje.
 * @param {string} pacienteId - O ID do paciente para filtrar os resultados.
 * @returns {Promise<Array>} Lista de medicamentos com seus status.
 */
const buscarStatusDoDia = async (pacienteId) => {
    try {
        // [EXEMPLO REAL COM SUPABASE - Descomentar quando o banco estiver pronto]
        /*
        // Aqui buscaríamos apenas os registros do dia atual
        const hoje = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('Registro_Consumo')
            .select(`
                id,
                status_dose,
                horario_agendado,
                Medicamentos (
                    nome_farmaco,
                    dosagem
                )
            `)
            .eq('paciente_id', pacienteId)
            // Filtro simulado para a data de hoje:
            // .gte('horario_agendado', `${hoje}T00:00:00`)
            // .lte('horario_agendado', `${hoje}T23:59:59`);
            
        if (error) throw error;
        
        // Formatar os dados para o formato que o Controller/Frontend espera
        return data.map(item => ({
            id: item.id,
            remedio: `${item.Medicamentos.nome_farmaco} ${item.Medicamentos.dosagem}`,
            horario: item.horario_agendado,
            status: item.status_dose
        }));
        */

        // [RETORNO MOCKADO PARA O PROTÓTIPO (Enquanto o banco não está ligado)]
        return [
            { id: 1, remedio: "Losartana 50mg", horario: "08:00", status: "CONFIRMADA" },
            { id: 2, remedio: "Metformina 500mg", horario: "14:00", status: "PENDENTE" },
            { id: 3, remedio: "Vitamina D 1000UI", horario: "20:00", status: "OMITIDA" },
            { id: 4, remedio: "AAS 100mg", horario: "22:00", status: "PENDENTE" }
        ];

    } catch (error) {
        console.error("Erro no Model ao buscar status do dia:", error);
        throw error; // Repassa o erro para o Controller lidar com ele
    }
};

/**
 * Insere um novo agendamento de medicamento no banco de dados.
 * @param {Object} dados - Objeto contendo nome, dosagem, frequencia, etc.
 * @returns {Promise<Object>} O registro inserido.
 */
const salvarNovoAgendamento = async (dados) => {
    try {
        // [EXEMPLO REAL COM SUPABASE]
        /*
        const { data, error } = await supabase
            .from('Medicamentos')
            .insert([
                {
                    nome_farmaco: dados.nome,
                    dosagem: dados.dosagem,
                    // Outros campos como paciente_id, frequencia_horas, etc.
                }
            ]);

        if (error) throw error;
        return data;
        */

        // Mock
        console.log(`[MODEL MOCK] Simulando insert no banco para: ${dados.nome}`);
        return { id: Math.floor(Math.random() * 100), ...dados };

    } catch (error) {
        console.error("Erro no Model ao salvar agendamento:", error);
        throw error;
    }
};

/**
 * Atualiza o status de uma dose (ex: quando a Alexa confirma).
 * @param {string} nomeRemedio - O nome falado pela Alexa.
 * @param {string} novoStatus - O status ("CONFIRMADA", "OMITIDA").
 */
const atualizarStatusDose = async (nomeRemedio, novoStatus) => {
    try {
        // [EXEMPLO REAL COM SUPABASE]
        /*
        const { data, error } = await supabase
            .from('Registro_Consumo')
            .update({ status_dose: novoStatus })
            .eq('nome_farmaco', nomeRemedio)
            // Lógica adicional para pegar apenas o do horário atual
            .is('status_dose', 'PENDENTE'); 
            
        if (error) throw error;
        return data;
        */
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