








const enviarAlertaCuidador = async (titulo, mensagem) => {
    try {
        console.log(`\n================= 🚨 ALERTA PUSH 🚨 =================`);
        console.log(`Título: ${titulo}`);
        console.log(`Mensagem: ${mensagem}`);
        console.log(`=====================================================\n`);

        
        










        
        return true;
    } catch (error) {
        console.error("Erro ao enviar notificação push:", error);
        return false;
    }
};

module.exports = {
    enviarAlertaCuidador
};