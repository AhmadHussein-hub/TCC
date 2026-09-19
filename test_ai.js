require('dotenv').config({ path: './TCC_Codigo/.env' });
const supabase = require('./TCC_Codigo/config/database');
const aiService = require('./TCC_Codigo/services/aiService');

async function test() {
    try {
        console.log("Supabase URL:", process.env.SUPABASE_URL);
        console.log("Buscando resumo para id_paciente = 1...");
        const result = await aiService.gerarResumoPaciente(1);
        console.log("RESULTADO:", result);
    } catch (e) {
        console.error("ERRO:", e.message);
    }
}
test();
