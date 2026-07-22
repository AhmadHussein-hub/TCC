/**
 * ============================================================================
 * CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
 * ============================================================================
 * Este arquivo centraliza a conexão com o banco de dados. 
 * Qualquer arquivo que precise falar com o banco, importa este arquivo.
 */

require('dotenv').config();

// [EXEMPLO - DESCOMENTAR QUANDO FOR USAR O SUPABASE]
/*
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ ERRO: Chaves do Supabase não encontradas no arquivo .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
*/

// Exportação mock (falsa) para o código não quebrar enquanto não configura o banco
module.exports = {
    // Simula a função de insert do Supabase
    from: (tabela) => ({
        insert: async (dados) => {
            console.log(`[BANCO MOCK] Inserindo na tabela ${tabela}:`, dados);
            return { data: dados, error: null };
        },
        select: async (colunas) => {
            return {
                data: [
                    { id: 1, remedio: "Losartana", status: "PENDENTE" }
                ],
                error: null
            };
        }
    })
};