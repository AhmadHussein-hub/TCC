const supabase = require('../config/supabaseClient');

const medicamentoModel = {
    // Busca todos os medicamentos de um paciente específico
    async buscarPorPaciente(id_paciente) {
        const { data, error } = await supabase
            .from('medicamento')
            .select('*')
            .eq('id_paciente', id_paciente);

        if (error) throw new Error(error.message);
        return data;
    },

    // Adiciona um novo medicamento
    async criar({ id_paciente, nome_farmaco, dosagem, frequencia_horas, limite_atraso_minutos }) {
        const { data, error } = await supabase
            .from('medicamento')
            .insert([{
                id_paciente,
                nome_farmaco,
                dosagem,
                frequencia_horas,
                limite_atraso_minutos
            }])
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    // Atualiza um medicamento existente
    async atualizar(id_medicamento, dadosAtualizados) {
        const { data, error } = await supabase
            .from('medicamento')
            .update(dadosAtualizados)
            .eq('id_medicamento', id_medicamento)
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    // Deleta um medicamento
    async deletar(id_medicamento) {
        const { error } = await supabase
            .from('medicamento')
            .delete()
            .eq('id_medicamento', id_medicamento);

        if (error) throw new Error(error.message);
        return true;
    }
};

module.exports = medicamentoModel;