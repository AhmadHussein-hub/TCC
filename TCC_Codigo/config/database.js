/**
 * ============================================================================
 * CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
 * ============================================================================
 * Este arquivo centraliza a conexão com o banco de dados. 
 * Qualquer arquivo que precise falar com o banco, importa este arquivo.
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ ERRO: Chaves do Supabase não encontradas no arquivo .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;