const { initializeApp, cert } = require('firebase-admin/app');
const admin = require('firebase-admin'); // Mantemos para exportar

try {
    let serviceAccount;

    // 1. Tenta carregar pela variável de ambiente (Servidor/Vercel)
    if (process.env.FIREBASE_CREDENTIALS) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    } 
    // 2. Se não tiver variável, tenta carregar o arquivo local (Seu PC)
    else {
        serviceAccount = require('../firebase-service-account.json');
    }

    // Inicializa usando a sintaxe atualizada
    initializeApp({
        credential: cert(serviceAccount)
    });
    
    console.log("✅ Firebase inicializado com sucesso!");

} catch (error) {
    console.error("❌ ERRO CRÍTICO ao inicializar o Firebase:", error.message);
}

// Exportamos o admin para o seu pushNotification.js conseguir usar o mensageiro
module.exports = admin;