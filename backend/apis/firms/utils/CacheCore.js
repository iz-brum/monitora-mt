/**
 * 🎛️ CacheCore - Centralização dos caches internos
 * 
 * - Permite controle global (habilitar/desabilitar)
 * - Facilita debug e limpeza
 * - Evita duplicação de instâncias de cache
 */

// === CONFIGURAÇÃO GLOBAL DE TTL (padrão: 30 MIN) ===
const TTL_PADRAO_MS = 30 * 60 * 1000; // 30 MIN

let cacheAtivo = true;

// == Estrutura interna com TTL ==
const resultadoCache = new Map();
const sensorCache = new Map();
const fireStatsCache = new Map();
const inFlightRequests = new Map();

// == Helpers de TTL ==
function setComTTL(map, chave, dados, ttl = TTL_PADRAO_MS) {
  const expiracao = Date.now() + ttl;
  map.set(chave, { dados, expiracao });
}

function getValido(map, chave) {
  const entry = map.get(chave);
  if (!entry) return null;
  if (entry.expiracao < Date.now()) {
    map.delete(chave); // limpa expirada
    return null;
  }
  return entry.dados;
}

// == Geradores de chave ==
function gerarChaveSensor(sensor, bbox, dayRange, date) {
  return JSON.stringify({ sensor, bbox, dayRange, date });
}

function gerarChaveResultado({ dayRange, date, timeRange }) {
  return JSON.stringify({ dayRange, date, timeRange });
}

function gerarChaveFireStats(query) {
  return JSON.stringify(query);
}

// == Controladores globais ==
function ativarCache() {
  cacheAtivo = true;
}
function desativarCache() {
  cacheAtivo = false;
}
function limparTodosCaches() {
  sensorCache.clear();
  resultadoCache.clear();
  inFlightRequests.clear();
  fireStatsCache.clear();
}

// == Export ==
export const CacheCore = {
  // Estado global
  isAtivo: () => cacheAtivo,
  ativarCache,
  desativarCache,
  limparTodosCaches,

  // TTL
  setComTTL,
  getValido,

  // Chaves
  gerarChaveSensor,
  gerarChaveResultado,
  gerarChaveFireStats,

  // Instâncias
  sensorCache,
  resultadoCache,
  inFlightRequests,
  fireStatsCache,
};
