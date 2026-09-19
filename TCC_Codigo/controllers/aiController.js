const aiService = require('../services/aiService');

const aiController = {
    async getResumoPaciente(req, res) {
        try {
            const { id_paciente } = req.params;
            if (!id_paciente) {
                return res.status(400).json({ error: 'id_paciente é obrigatório' });
            }

            const resumo = await aiService.gerarResumoPaciente(id_paciente);
            return res.status(200).json({ resumo });
        } catch (error) {
            console.error('Erro no aiController:', error);
            return res.status(500).json({ error: 'Erro ao gerar o resumo via IA.' });
        }
    }
};

module.exports = aiController;
