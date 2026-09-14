require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());

const alexaRoutes = require('./routes/alexaRoutes');
const lembreteRoutes = require('./routes/lembreteRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api/alexa-skill', alexaRoutes);
app.use('/api/lembrete', lembreteRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}
// Exportação necessária para a Vercel
module.exports = app;