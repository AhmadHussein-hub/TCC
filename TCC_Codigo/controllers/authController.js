const supabase = require('../config/database');

exports.amazonCallback = async (req, res) => {
    // A Amazon envia 'code' e 'state' (onde passaremos o id_paciente para saber quem logou)
    const { code, state } = req.query;
    
    if (!code) {
        return res.status(400).send('Faltando código de autorização da Amazon.');
    }

    try {
        // Trocar o 'code' temporário por um 'refresh_token' permanente
        const response = await fetch('https://api.amazon.com/auth/o2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: process.env.AMAZON_CLIENT_ID,
                client_secret: process.env.AMAZON_CLIENT_SECRET,
                redirect_uri: process.env.AMAZON_REDIRECT_URI // ex: https://seu-app.vercel.app/api/auth/amazon/callback
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('Erro da Amazon LWA:', data);
            return res.status(400).send('Falha na vinculação de conta.');
        }

        const refreshToken = data.refresh_token;
        const idPaciente = state || 1; // Se 'state' não for passado, tenta o paciente 1.

        // Salva o Refresh Token na tabela de paciente
        const { error: dbError } = await supabase
            .from('paciente')
            .update({ amazon_refresh_token: refreshToken })
            .eq('id_paciente', idPaciente);

        if (dbError) throw dbError;

        // Resposta que aparecerá na tela do celular após autorizar na Amazon
        res.send(`
            <html>
                <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                    <h1 style="color: #4CAF50;">Vinculação Concluída!</h1>
                    <p>Sua conta da Alexa foi conectada com sucesso ao sistema de Saúde.</p>
                    <p>Você já pode fechar esta aba.</p>
                </body>
            </html>
        `);

    } catch (err) {
        console.error("Erro interno do servidor:", err);
        res.status(500).send('Erro interno do servidor ao vincular a conta.');
    }
};
