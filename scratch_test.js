require('dotenv').config();
const supabase = require('./config/database');

async function testSupabase() {
    try {
        const { data, error } = await supabase
            .from('Registro_Consumo')
            .select(`
                id_registro,
                timestamp_agendado,
                Medicamento (
                    nome_farmaco,
                    dosagem
                )
            `)
            .eq('status_dose', 'PENDENTE');

        if (error) {
            console.error("Erro recebido do Supabase:", JSON.stringify(error, null, 2));
        } else {
            console.log("Sucesso! Dados:", data);
        }
    } catch (e) {
        console.error("Crash:", e);
    }
}

testSupabase();
