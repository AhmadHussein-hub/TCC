const supabase = require('../config/supabaseClient');
const bcrypt = require('bcrypt');

const cuidadorController = {
    async register(req, res) {
        try {
            const { nome, email, senha, telefone } = req.body;

            // Gera o hash da senha para salvar no banco
            const salt = await bcrypt.genSalt(10);
            const senha_hash = await bcrypt.hash(senha, salt);

            const { data, error } = await supabase
                .from('cuidador')
                .insert([{ nome, email, senha_hash, telefone }])
                .select();

            if (error) return res.status(400).json({ error: error.message });

            // Remove o hash antes de devolver a resposta pro Flutter
            delete data[0].senha_hash;
            return res.status(201).json({ message: 'Cuidador cadastrado', data: data[0] });

        } catch (err) {
            return res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }
};
module.exports = cuidadorController;