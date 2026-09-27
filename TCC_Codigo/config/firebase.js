const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const admin = require('firebase-admin');

try {
    let serviceAccount;

    if (process.env.FIREBASE_CREDENTIALS) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    } else {
        // Sobe duas pastas para alcançar a raiz (C:\src\Projeto_TCC\) a partir de TCC_Codigo/config/
        serviceAccount = require(path.join(__dirname, '../../firebase-service-account.json'));
    }

    initializeApp({
        credential: cert(serviceAccount)
    });

    console.log("✅ Firebase inicializado com sucesso!");

} catch (error) {
    console.error("❌ ERRO CRÍTICO ao inicializar o Firebase:", error.message);
}

module.exports = admin;