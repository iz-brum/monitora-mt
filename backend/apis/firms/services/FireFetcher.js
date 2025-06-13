// FILE_PATH: backend/apis/firms/services/FireFetcher.js

// === IMPORTS ===

import { FireModel } from '#firms_models'; // DOCUMENTAR

/**
 * 🌐 axios
 *
 * Biblioteca HTTP para realizar requisições web, utilizada aqui para buscar arquivos CSV e outros recursos externos.
 */
import axios from 'axios';

/**
 * 🗂️ csvtojson
 *
 * Utilitário para converter dados CSV em objetos JSON, facilitando o processamento dos dados de focos de calor.
 */
import csv from 'csvtojson';

/**
 * 🗺️ turf
 *
 * Biblioteca de análise e manipulação espacial/geográfica (GeoJSON), usada para cálculos como interseção, união e área.
 */
import * as turf from '@turf/turf';

/**
 * 🕓 dayjs & utc
 *
 * Biblioteca leve para manipulação de datas e horas, incluindo o plugin UTC para manipular horários em tempo universal.
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

/** 
 * 🔑 getFirmsApiKey
 *
 * Importa a função responsável por recuperar a chave de API do sistema FIRMS,
 * utilizada para autenticação em chamadas à API de focos de calor.
 */
import { getFirmsApiKey } from '#firms_services/FirmsAuth.js';

/**
 * 🧮 Geospatial Utils
 *
 * Funções utilitárias para carregar GeoJSON, calcular bounding box, e unir feições geográficas.
 */
import { loadGeoJson, computeBbox, unionFeatures } from '#firms_utils/geospatial.js';

import { validateDateRange, DATE_CONFIG } from '#firms_utils/dateValidation.js';

import { debugLog, debugJsonLog } from "#backend_utils/debugLog.js";

import { CacheCore } from '#firms_utils/CacheCore.js';

CacheCore.desativarCache(); // DESATIVAR CACHE PARA BUSCA DOS DADOS

// Ativa suporte a UTC no dayjs
dayjs.extend(utc);

// === CONFIGURAÇÕES ===

const inflightSensorFetches = new Map(); // Chave: sensor|bbox|range|date → Promise

/**
 * 🛰️ SENSORS
 *
 * Lista dos sensores de satélite suportados pelo sistema FIRMS/INPE.
 * Utilizados para identificar a fonte dos dados de focos de calor ao montar URLs, filtrar dados, etc.
 *
 * Valores possíveis:
 * - 'MODIS_NRT': MODIS (Near Real Time)
 * - 'MODIS_SP': MODIS (Science Processing)
 * - 'VIIRS_SNPP_NRT': VIIRS Suomi NPP (Near Real Time)
 * - 'VIIRS_NOAA20_NRT': VIIRS NOAA-20 (Near Real Time)
 * - 'VIIRS_NOAA21_NRT': VIIRS NOAA-21 (Near Real Time)
 *
 * @type {string[]}
 */
const SENSORS = [
  'MODIS_NRT',
  'MODIS_SP',
  'VIIRS_SNPP_NRT',
  'VIIRS_NOAA20_NRT',
  'VIIRS_NOAA21_NRT'
];

// === API PRINCIPAL ===
export { fetchFiresMTPipeline as fetchFiresMT }

// === PIPELINE DE BUSCA ===

/**
 * 🔥 fetchFiresMTPipeline
 *
 * Pipeline principal para busca de focos de calor no Mato Grosso.
 * Carrega a geometria do estado, busca e filtra os dados dos sensores, e retorna somente os focos válidos.
 *
 * @param {Object} params
 * @param {number} [params.dayRange=1] - Número de dias para busca (janela temporal)
 * @param {string} [params.date] - Data base para a busca (formato YYYY-MM-DD)
 * @param {[string, string]} [params.timeRange] - Intervalo de tempo (horário) para filtrar os focos
 * @returns {Promise<Array<Object>>} Lista de registros de focos filtrados
 */

async function fetchFiresMTPipeline({ dayRange = 1, date, timeRange }) {
  // Valida a data e o intervalo antes de prosseguir
  validateDateRange(date, dayRange);

  const chave = JSON.stringify({ dayRange, date, timeRange });

  // Retorno imediato se já estiver no cache
  if (CacheCore.isAtivo() && CacheCore.getValido(CacheCore.resultadoCache, chave)) {

    return CacheCore.getValido(CacheCore.resultadoCache, chave);
  }

  // Retorno da mesma promise se já estiver sendo processada
  if (CacheCore.isAtivo() && CacheCore.inFlightRequests.has(chave)) {

    return CacheCore.inFlightRequests.get(chave);
  }

  const promessa = (async () => {
    const { polygon, bbox } = loadMTGeometry();
    // const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const allRecords = await fetchAllSensorsData(bbox, dayRange, date);
    const filtered = FireModel.filterByPolygonAndTimeRange(allRecords, polygon, timeRange);

    if (CacheCore.isAtivo()) {
      CacheCore.setComTTL(CacheCore.resultadoCache, chave, filtered);
      CacheCore.inFlightRequests.delete(chave);
    }

    return filtered;
  })();

  if (CacheCore.isAtivo()) {
    CacheCore.inFlightRequests.set(chave, promessa);
  }

  return promessa;
}

/**
 * 🛰️ fetchAllSensorsData
 *
 * Realiza a busca dos dados brutos de focos de calor para todos os sensores definidos em SENSORS.
 * Os dados são agregados em um único array.
 *
 * @param {Array<number>} bbox - Bounding box para limitar a área da busca
 * @param {number} dayRange - Número de dias para a busca
 * @param {string} [date] - Data base para a busca
 * @returns {Promise<Array<Object>>} Lista agregada de registros de focos para todos os sensores
 */
async function fetchAllSensorsData(bbox, dayRange, date) {
  let records = [];
  for (const sensor of SENSORS) {
    const recs = await fetchRawBySensor(sensor, bbox, dayRange, date);
    records.push(...recs);
  }
  return records;
}

// === FETCH ===

/**
 * 🌐 fetchRawBySensor
 *
 * Realiza o download dos dados brutos (CSV) de focos de calor para um sensor específico,
 * converte para JSON, faz log da URL (com chave oculta) e retorna os registros enriquecidos com o nome do sensor.
 *
 * @param {string} sensor - Nome do sensor de satélite (ex: 'MODIS_NRT')
 * @param {Array<number>} bbox - Bounding box [minX, minY, maxX, maxY] para consulta espacial
 * @param {number} dayRange - Quantidade de dias para busca (janela temporal)
 * @param {string} [startDate] - Data base para início da busca (formato YYYY-MM-DD)
 * @returns {Promise<Array<Object>>} Lista de registros brutos, cada um com uma propriedade extra `sensor`
 */
async function fetchRawBySensor(sensor, bbox, dayRange, startDate) {
  const cacheKey = CacheCore.gerarChaveSensor(sensor, bbox, dayRange, startDate);

  // 1. Retorna resultado já no cache se ativo
  if (CacheCore.isAtivo() && CacheCore.sensorCache.has(cacheKey)) {

    return CacheCore.sensorCache.get(cacheKey);
  }

  // 2. Deduplicação: retorna a mesma Promise se já estiver em andamento
  if (inflightSensorFetches.has(cacheKey)) {
  
    return inflightSensorFetches.get(cacheKey);
  }

  // 3. Cria nova promise para fetch e registra
  const fetchPromise = (async () => {
    const url = buildFireAreaCsvUrl(sensor, bbox, dayRange, startDate);
    const urlLogged = hideApiKeyInUrl(url);

    try {
      const { data } = await fetchWithRetry(url);
      const records = await csv().fromString(data);
      const enriched = records.map(r => ({ ...r, sensor }));

      if (CacheCore.isAtivo()) {
        CacheCore.sensorCache.set(cacheKey, enriched);
      }

      return enriched;
    } catch (error) {
      debugLog('Erro ao buscar dados do sensor', {
        sensor,
        mensagem: error.message,
        status: error.response?.status || 'desconhecido',
        url: urlLogged,
        origem: 'fetchRawBySensor'
      });
      return [];
    } finally {
      inflightSensorFetches.delete(cacheKey);
    }
  })();

  inflightSensorFetches.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Realiza fetch com retry e backoff exponencial
 * @param {string} url - URL para requisição
 * @param {number} retries - Número máximo de tentativas
 * @param {number} delay - Delay inicial em ms
 * @param {number} backoffFactor - Fator de multiplicação do delay
 */
async function fetchWithRetry(url, retries = 2, delay = 1000, backoffFactor = 2) {
  try {
    const response = await axios.get(url, {
      timeout: 10000, // 10 segundos de timeout
      headers: {
        'Accept': 'text/csv',
        'User-Agent': 'MonitorAMT/1.0'
      }
    });
    return response;
  } catch (error) {
    if (retries === 0) {
      console.error(`❌ Todas as tentativas falharam para ${hideApiKeyInUrl(url)}`);
      throw error;
    }

    const nextDelay = delay * backoffFactor;

    // Log mais detalhado do erro
    if (error.response) {
      console.debug(`Status: ${error.response.status}`);
      console.debug(`Headers:`, error.response.headers);
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, retries - 1, nextDelay, backoffFactor);
  }
}

// === URL BUILDER ===

/**
 * 🏗️ buildFireAreaCsvUrl
 *
 * Monta a URL para requisição de CSV de áreas de focos de calor na API FIRMS/NASA.
 * Valida todos os parâmetros e utiliza a chave de API apropriada.
 *
 * @param {string} sensor - Nome do sensor (ex: 'MODIS_NRT')
 * @param {Array<number>} bbox - Bounding box [minX, minY, maxX, maxY]
 * @param {number} [dayRange=1] - Quantidade de dias para busca (janela temporal)
 * @param {string} [startDate] - Data inicial da busca (opcional, formato YYYY-MM-DD)
 * @returns {string} URL pronta para consulta na API FIRMS
 */
function buildFireAreaCsvUrl(sensor, bbox, dayRange = 1, startDate) {
  validateParameters(sensor, bbox);

  const apiKey = getFirmsApiKey();
  const baseUrl = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
  const segments = buildUrlSegments(baseUrl, apiKey, sensor, bbox, dayRange, startDate);

  return segments.join('/');
}

/**
 * 🧩 buildUrlSegments
 *
 * Constrói os segmentos que compõem a URL para requisição do CSV.
 *
 * @param {string} baseUrl - URL base da API
 * @param {string} apiKey - Chave de acesso à API FIRMS
 * @param {string} sensor - Nome do sensor
 * @param {Array<number>} bbox - Bounding box
 * @param {number} dayRange - Quantidade de dias
 * @param {string} [startDate] - Data inicial (opcional)
 * @returns {Array<string>} Lista de segmentos da URL
 */
function buildUrlSegments(baseUrl, apiKey, sensor, bbox, dayRange, startDate) {
  const segments = [baseUrl, apiKey, sensor, bbox.join(','), String(dayRange)];
  if (startDate) segments.push(startDate);
  return segments;
}

// === VALIDAÇÕES ===

/**
 * 🛡️ validateParameters
 *
 * Valida os parâmetros principais antes de montar a URL.
 *
 * @param {string} sensor - Nome do sensor
 * @param {Array<number>} bbox - Bounding box
 */
function validateParameters(sensor, bbox) {
  validateSensor(sensor);
  validateBbox(bbox);
}

/**
 * 🔬 validateSensor
 *
 * Garante que o sensor informado seja uma string.
 *
 * @param {string} sensor
 */
function validateSensor(sensor) {
  if (typeof sensor !== 'string') {
    throw new Error('Parâmetro inválido: sensor deve ser uma string');
  }
}

/**
 * 🗺️ validateBbox
 *
 * Valida se bbox é um array de 4 números.
 *
 * @param {Array<number>} bbox
 */
function validateBbox(bbox) {
  if (!isArrayOfLength(bbox, 4)) {
    throw new Error('Parâmetro inválido: bbox deve ser um array de 4 números');
  }
  validateBboxElements(bbox);
}

/**
 * 🧮 validateBboxElements
 *
 * Verifica se todos os elementos de bbox são números.
 *
 * @param {Array<number>} bbox
 */
function validateBboxElements(bbox) {
  if (!bbox.every(isNumber)) {
    throw new Error('Parâmetro inválido: todos os elementos de bbox devem ser números');
  }
}

/**
 * 📏 isArrayOfLength
 *
 * Verifica se o valor é um array com comprimento específico.
 *
 * @param {any[]} array - Valor a ser testado
 * @param {number} length - Comprimento esperado
 * @returns {boolean} True se for array e tiver o tamanho correto
 */
function isArrayOfLength(array, length) {
  return Array.isArray(array) && array.length === length;
}

/**
 * 🔢 isNumber
 *
 * Verifica se o valor é um número válido (não NaN).
 *
 * @param {any} value - Valor a ser testado
 * @returns {boolean} True se for um número válido
 */
function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}


// === GEORREFERENCIAMENTO MT ===

/**
 * 🗺️ loadMTGeometry
 *
 * Carrega o GeoJSON da unidade federativa de Mato Grosso (MT), gera o polígono unificado e o bounding box (bbox).
 * Utilizado para limitar a busca de focos de calor e aplicar filtros espaciais.
 *
 * @returns {{ polygon: Object, bbox: Array<number> }}
 *  - polygon: Polígono unificado (GeoJSON) do MT
 *  - bbox: Bounding box [minX, minY, maxX, maxY]
 */
function loadMTGeometry() {
  // const geojson = loadGeoJson('public/assets/geoRef/br_to.json');
  const geojson = loadGeoJson('public/assets/geoRef/br_mt.json');
  return {
    polygon: unionFeatures(geojson),
    bbox: computeBbox(geojson)
  };
}

// === UTILS ===

/**
 * 🔑 hideApiKeyInUrl
 *
 * Substitui a chave da API na URL por 'API_KEY' para evitar exposição acidental.
 * Preserva o restante da URL intacto.
 *
 * @param {string} url - URL completa que pode conter a chave da API
 * @returns {string} URL com a chave da API oculta
 */
function hideApiKeyInUrl(url) {
  const urlParts = url.split('/');
  if (urlParts.length > 6) urlParts[6] = 'API_KEY';
  return urlParts.join('/');
}
