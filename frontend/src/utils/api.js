// src/utils/api.js

/**
 * Deixe neste arquivo apenas as funções e constantes genéricas para:
 *   - montar URLs,
 *   - fazer fetch,
 *   - tratar datas,
 *   - registrar logs de erro, etc.
 *
 * Esses utilitários poderão então ser importados por outros serviços.
 */

// URL base que varia conforme o ambiente (dev / prod / staging)
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001";
const API_BASE_URL = (() => {
  // Verifica se está sendo acessado via túnel Cloudflare
  const isTunnelAccess = window.location.hostname.includes('trycloudflare.com');

  return isTunnelAccess
    ? import.meta.env.VITE_API_TUNNEL_URL
    : (import.meta.env.VITE_API_BASE_URL || "http://localhost:4001");
})();

// Logs para debug
console.log('Modo:', import.meta.env.MODE);
console.log('API_BASE_URL:', API_BASE_URL);
console.log('Todas as env vars:', import.meta.env);

/**
 * Constrói URLs parametrizadas com tratamento seguro de query params
 * @param {string} endpoint  Ex: "/api/firms/fires" ou "/api/firms/fires/stats"
 * @param {Object<string, any>} params  Parâmetros de query (key-value)
 * @returns {string} URL completa
 */
export function montarUrl(endpoint, params = {}) {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([chave, valor]) => {
    if (valor != null) {
      url.searchParams.append(chave, valor);
    }
  });
  return url.toString();
}

/**
 * Faz fetch de uma URL e parseia a resposta como JSON.
 * @param {string} url 
 * @returns {Promise<any>}
 * @throws {SyntaxError} se o response não for JSON válido
 */
export async function buscarJson(url) {
  const res = await fetch(url);
  return await res.json();
}

// /**
//  * 🛰️ Requisição para o endpoint que retorna os focos de calor de um dia.
//  * @param {string} dataISO - Data a ser consultada.
//  * @returns {Promise<Array>} Lista de focos de calor.
//  */
/**
 * 🛰️ Requisição para o endpoint que retorna os focos de calor de um dia.
 * @param {string} dataISO - Data a ser consultada.
 * @returns {Promise<Array>} Lista de focos de calor.
 */
export async function buscarFocos(dataISO) {
    try {
        const url = montarUrl('/api/firms/fires', { dt: dataISO, all: true });
        const json = await buscarJson(url);
        if (!json || !json.dados) return [];
        return json.dados;
    } catch (error) {
        logErroFetch(error);
        return [];
    }
}

/**
 * Centraliza o tratamento de erro de fetch para facilitar debug em produção.
 * @param {Error} error 
 */
export function logErroFetch(error) {
  console.error('Erro ao buscar dados de focos:', error);
}

/**
 * Retorna a data de hoje em formato ISO (YYYY-MM-DD), baseado no timezone do sistema.
 * @returns {string} Ex: "2025-06-04"
 */
export function obterDataDeHoje() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Retorna a data de ontem em formato ISO (YYYY-MM-DD).
 * @returns {string}
 */
export function obterDataDeOntem() {
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return ontem.toISOString().split('T')[0];
}
