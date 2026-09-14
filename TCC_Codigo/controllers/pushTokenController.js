const supabase = require('../config/supabaseClient');

const pushTokenController = {
    async saveToken(req, res) {
        try {
            const { id_cuidador, token_fcm, plataforma } = req.body;

            if (!id_cuidador || !token_fcm) {
                return res.status(400).json({ error: 'Faltam dados obrigatórios' });
            }

            // Procura se já existe um token para esse cuidador
            const { data: existing } = await supabase
                .from('push_token')
                .select('id_token')
                .eq('id_cuidador', id_cuidador)
                .single();

            let query;
            if (existing) {
                // Atualiza o token existente
                query = supabase.from('push_token').update({ token_fcm, plataforma, updated_at: new Date() }).eq('id_cuidador', id_cuidador);
            } else {
                // Cria um novo
                query = supabase.from('push_token').insert([{ id_cuidador, token_fcm, plataforma }]);
            }

            const { error } = await query;
            if (error) return res.status(400).json({ error: error.message });

            return res.status(200).json({ message: 'Token de push registrado/atualizado' });
        } catch (err) {
            return res.status(500).json({ error: 'Erro interno' });
        }
    }
};
module.exports = pushTokenController;