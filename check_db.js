require('dotenv').config();
const supabase = require('./config/database');

async function checkDatabase() {
    console.log("🔍 Verificando o banco de dados...\n");

    const { data: usuarios } = await supabase.from('Usuario').select('*');
    console.log("=== USUÁRIOS ===");
    console.log(usuarios);

    const { data: medicamentos } = await supabase.from('medicamento').select('*');
    console.log("\n=== MEDICAMENTOS ===");
    console.log(medicamentos);

    const { data: registros } = await supabase.from('registro_consumo').select('*');
    console.log("\n=== REGISTROS DE CONSUMO ===");
    console.log(registros);
}

checkDatabase();
