const admin = require('firebase-admin');

try {
    let serviceAccount;

    // 1. Tenta carregar pela variável de ambiente (Produção / Servidor)
    if (process.env.FIREBASE_CREDENTIALS) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    } 
    // 2. Se não tiver variável, tenta carregar o arquivo local (Seu PC)
    else {
        serviceAccount = require('../firebase-service-account.json');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    console.log("✅ Firebase inicializado com sucesso!");

} catch (error) {
    console.error("❌ ERRO CRÍTICO ao inicializar o Firebase:", error.message);
}

module.exports = admin;