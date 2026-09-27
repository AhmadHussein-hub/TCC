const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let firebaseApp;

try {
    let serviceAccount;

    if (process.env.FIREBASE_CREDENTIALS) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    } else {
        // Sobe duas pastas para alcançar a raiz (C:\src\Projeto_TCC\) a partir de TCC_Codigo/config/
        serviceAccount = require(path.join(__dirname, '../../firebase-service-account.json'));
    }

    // Evita reinicializar se já existe uma instância (comum em ambiente serverless/Vercel,
    // onde o módulo pode ser reutilizado entre invocações)
    if (!getApps().length) {
        firebaseApp = initializeApp({
            credential: cert(serviceAccount)
        });
    } else {
        firebaseApp = getApps()[0];
    }

    console.log("✅ Firebase inicializado com sucesso!");

} catch (error) {
    console.error("❌ ERRO CRÍTICO ao inicializar o Firebase:", error.message);
}

// Exporta uma função que sempre retorna a instância de messaging pronta pra uso,
// em vez de exportar o namespace 'admin' clássico (que não bate com initializeApp modular)
module.exports = {
    getMessagingInstance: () => getMessaging(firebaseApp)
};