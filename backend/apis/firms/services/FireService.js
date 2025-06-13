// FILE_PATH: backend/apis/firms/services/FireService.js

/**
 * 🔥 fetchFiresMT
 *
 * Função para buscar focos de calor (fires) no estado do Mato Grosso (MT) via FIRMS.
 */
import { fetchFiresMT } from '#firms_services/FireFetcher.js';

import { FireModel } from '#firms_models'; // DOCUMENTAR

/**
 * 🔎 parseQuery
 *
 * Utilitário para parsear e padronizar parâmetros de consulta (query string) recebidos nas requisições.
 */
import { parseQuery } from '#firms_utils/parseQuery.js';

/**
 * 🗺️ MapboxReverseGeocoder
 *
 * Serviço para geocodificação de coordenadas e enriquecimento dos dados de focos com informações de localização.
 */
import MapboxReverseGeocoder from '#mapbox_services/MapboxReverseGeocoder .js';

import GeoMunicipalityMatcher from '#geo_utils/GeoMunicipalityMatcher.js';


// Limite de segurança para o parâmetro 'all'
const MAX_RECORDS_ALL = 10000;

/**
 * 🔥 FireService
 *
 * Serviço principal para orquestração, busca, normalização, enriquecimento e paginação
 * dos dados de focos de calor na API FIRMS.
 * Responsável por integrar dados crus, normalizar, aplicar formatações e enriquecer com localização.
 * Todos os métodos estáticos são utilizados diretamente por controllers e outros serviços.
 */
export default class FireService {

  // == Funções Públicas - Exportadas ==

  /**
   * 🔥 listAll
   *
   * Busca todos os focos de calor brutos para o MT utilizando o FireFetcher.
   * Aplica o roteamento de padronização dos focos.
   *
   * @param {Object} [options={}] - Parâmetros de busca (data, filtro, etc)
   * @returns {Promise<Array<Object>>} Lista de focos normalizados
   */
  static async listAll(options = {}) {
    const firesRaw = await fetchFiresMT(options);
    return this.routeListAll(firesRaw);
  }

  /**
   * 📋 listAllFormattedPaginated
   *
   * Busca, formata e retorna uma lista paginada de focos de calor.
   * Aplica ordenação e metadados de paginação.
   *
   * @param {Object} query - Query string da requisição (filtros, paginação, ordenação)
   * @returns {Promise<{ metadados: Object, dados: Array<Object> }>} Dados paginados e formatados
   */
  static async listAllFormattedPaginated(query) {
    return await this.#routeListAllFormattedPaginated(query);
  }

  /**
   * 🗺️ listAllWithLocation
   *
   * Busca e formata todos os focos de calor, enriquecendo-os com localização (geocodificação).
   *
   * @param {Object} query - Query string da requisição
   * @returns {Promise<{ firesWithLocation: Array<Object>, metadados: Object }>}
   */
  static async listAllWithLocation(query) {
    const { dados: fires, metadados } = await this.listAllFormattedPaginated({ ...query, all: true });
    const firesWithLocation = await this.addLocationData(fires);
    return { metadados, firesWithLocation };
  }

  static async addLocationData(fires) {
    console.log(`📍 Iniciando localização de ${fires.length} focos de calor...`);

    try {
      const located = this.addMunicipalityLocationData(fires);
      const naCount = located.filter(f => !f.localizacao || f.localizacao.municipio === 'N/A').length;

      console.log(`🔍 GeoJSON aplicado. ${naCount} focos sem correspondência municipal.`);

      const allLocated = located.every(f => f.localizacao && f.localizacao.municipio && f.localizacao.municipio !== 'N/A');
      if (!allLocated) throw new Error('GeoJSON incompleto ou inválido (há focos sem município)');

      console.log(`✅ Todos os focos localizados via GeoJSON.`);
      return located;

    } catch (err) {
      console.warn('⚠️ Fallback para Mapbox ativado:', err.message);

      const points = fires.map(fire => ({
        longitude: parseFloat(fire.longitude),
        latitude: parseFloat(fire.latitude),
        fireData: fire
      }));

      const locations = await MapboxReverseGeocoder.batchGeocode(points);
      const naCount = locations.filter(f => !f.localizacao || f.localizacao.municipio === 'N/A').length;

      console.log(`🗺️ Mapbox aplicado. ${naCount} focos ainda sem município.`);
      return locations.map(item => ({
        ...item.fireData,
        localizacao: item.localizacao
      }));
    }
  }

  /**
 * 📍 addMunicipalityLocationData
 *
 * Usa geolocalização baseada em GeoJSON para atribuir município e comando regional a cada foco.
 *
 * @param {Array<Object>} fires - Lista de focos
 * @returns {Array<Object>} Focos com campo `localizacao` preenchido
 */
  static addMunicipalityLocationData(fires) {
    const points = fires.map(fire => ({
      longitude: parseFloat(fire.longitude),
      latitude: parseFloat(fire.latitude),
      fireData: fire
    }));
    const localizados = GeoMunicipalityMatcher.batchLocate(points);

    // 🔁 Padroniza para o frontend (mantém campo "cidade")
    return localizados.map(foco => ({
      ...foco,
      localizacao: {
        ...foco.localizacao,
        cidade: foco.localizacao?.municipio || 'N/A'  // compatível com frontend antigo
      }
    }));
  }

  // == Helpers Públicos ==

  /**
   * ✅ isNonEmptyArray
   *
   * Verifica se o parâmetro é um array não vazio.
   *
   * @param {any} arr - Valor a ser testado
   * @returns {boolean} True se for array e possuir ao menos um elemento
   */
  static isNonEmptyArray(arr) {
    return Array.isArray(arr) && arr.length > 0;
  }

  /**
   * 🔀 routeListAll
   *
   * Decide qual função de roteamento de lista utilizar com base no formato dos dados de entrada.
   * Retorna array vazio se não houver dados.
   *
   * @param {Array<Object>} firesRaw - Lista de focos brutos
   * @returns {Array<Object>} Lista roteada de focos
   */
  static routeListAll(firesRaw) {
    const isEmpty = !this.isNonEmptyArray(firesRaw);
    if (isEmpty) {
      return [];
    }
    return FireModel.routeByFormat(firesRaw);
  }

  /**
   * 📄 parsePage
   *
   * Retorna o número da página requisitada na query string ou 1 (default).
   *
   * @param {Object} query - Query string da requisição
   * @returns {number} Página solicitada (default 1)
   */
  static parsePage(query) {
    return parseInt(query.page, 10) || 1;
  }

  /**
   * 📏 parseLimit
   *
   * Retorna o limite de itens por página da query string ou 25 (default).
   *
   * @param {Object} query - Query string da requisição
   * @returns {number} Limite de itens (default 25)
   */
  static parseLimit(query) {
    return parseInt(query.limit, 10) || 25;
  }

  /**
   * 📑 getPagedData
   *
   * Retorna um "slice" da lista ordenada de focos, para a página e limite especificados.
   *
   * @param {Array<Object>} sorted - Lista de focos ordenada
   * @param {number} page - Página solicitada
   * @param {number} limit - Limite de itens por página
   * @returns {Array<Object>} Subconjunto paginado da lista
   */
  static getPagedData(sorted, page, limit) {
    const start = (page - 1) * limit;
    const end = start + limit;
    return sorted.slice(start, end);
  }

  /**
   * 📚 getTotalPages
   *
   * Calcula o total de páginas possíveis para a lista, dado o limite de itens por página.
   *
   * @param {Array<Object>} sorted - Lista de focos ordenada
   * @param {number} limit - Limite de itens por página
   * @returns {number} Total de páginas
   */
  static getTotalPages(sorted, limit) {
    if (!limit || typeof limit !== 'number' || limit <= 0) return 0;
    return Math.ceil(sorted.length / limit);
  }


  // == Privados auxiliares para busca/listagem ==

  /**
   * 📋 #routeListAllFormattedPaginated
   *
   * Decide qual handler de listagem de focos deve ser usado (paginado ou completo) e executa com os parâmetros corretos.
   *
   * @private
   * @param {Object} query - Query string da requisição (pode conter filtros, paginação, ou flag "all")
   * @returns {Promise<any>} Resultado do handler escolhido (paginado ou completo)
   */
  static async #routeListAllFormattedPaginated(query) {
    const params = parseQuery(query);
    return await this.#chooseFireListHandler(query)(params, query);
  }

  /**
   * 🔀 #chooseFireListHandler
   *
   * Seleciona dinamicamente a função de handler para listagem de focos, conforme a flag 'all'.
   * Usa método de todos os focos (sem paginação) ou método paginado.
   *
   * @private
   * @param {Object} query - Query string da requisição
   * @returns {Function} Handler de listagem apropriado
   */
  static #chooseFireListHandler(query) {
    return this.#isAllFiresRequested(query)
      ? this.#getAllFiresNoPagination.bind(this)
      : this.#getPagedFires.bind(this);
  }

  /**
   * ⚡ #isAllFiresRequested
   *
   * Verifica se o parâmetro 'all' foi definido como true na query string, indicando que deve retornar todos os focos (sem paginação).
   *
   * @private
   * @param {Object} query - Query string
   * @returns {boolean} True se deve retornar todos os focos sem paginação
   */
  static #isAllFiresRequested(query) {
    return query.all === 'true' || query.all === true;
  }

  /**
   * 📥 #getAllFiresNoPagination
   *
   * Handler privado para listagem de **todos** os focos sem paginação, usado quando a flag `all=true` é passada.
   * Limita o máximo de registros permitidos e dispara erro se exceder o limite.
   *
   * @private
   * @param {Object} params - Parâmetros já parseados da query string
   * @param {Object} query - Query original da requisição
   * @returns {Promise<{metadados: Object, dados: Array<Object>}>} Lista completa dos focos + metadados
   * @throws {Error} Caso a quantidade exceda o máximo permitido por requisição
   */
  static async #getAllFiresNoPagination(params, query) {
    const fires = await this.listAll(params);
    if (fires.length > MAX_RECORDS_ALL) {
      throw new Error(`A requisição excede o limite de ${MAX_RECORDS_ALL} registros. Refine seus filtros ou use paginação.`);
    }
    const firesFormatted = fires;
    const sorted = FireModel.sortFires(firesFormatted, query.sort);

    return {
      metadados: {
        ...this.#buildMetadata(params, query, sorted.length)
      },
      dados: sorted
    };
  }

  /**
   * 📄 #getPagedFires
   *
   * Handler privado para listagem **paginada** dos focos de calor, quando a flag `all` não está presente.
   * Retorna também metadados de paginação.
   *
   * @private
   * @param {Object} params - Parâmetros já parseados da query string
   * @param {Object} query - Query original da requisição
   * @returns {Promise<{metadados: Object, dados: Array<Object>}>} Página de focos + metadados e paginação
   */
  static async #getPagedFires(params, query) {
    const page = this.parsePage(query);
    const limit = this.parseLimit(query);
    const fires = await this.listAll(params);
    const firesFormatted = fires;
    const sorted = FireModel.sortFires(firesFormatted, query.sort);

    const pagedData = this.getPagedData(sorted, page, limit);
    const totalPages = this.getTotalPages(sorted, limit);

    return {
      metadados: {
        ...this.#buildMetadata(params, query, sorted.length),
        paginacao: {
          paginaAtual: page,
          itensPorPagina: limit,
          totalPaginas: totalPages
        }
      },
      dados: pagedData
    };
  }

  // == Privados de formatação/metadados ==

  /**
   * 🔃 _getSort
   *
   * Obtém o critério de ordenação da query, ou 'sensor' como padrão.
   *
   * @private
   * @param {Object} query - Query string da requisição
   * @returns {string} Critério de ordenação
   */
  static _getSort(query) {
    return query?.sort || 'sensor';
  }

  /**
   * ⏲️ _getIntervaloHoras
   *
   * Extrai e formata o intervalo de horas a partir dos parâmetros de busca, se houver.
   *
   * @private
   * @param {Object} params - Parâmetros de busca (incluindo timeRange)
   * @returns {Object|undefined} Objeto { intervaloHoras: { inicio, fim } } ou undefined
   */
  static _getIntervaloHoras(params) {
    const { timeRange } = params || {};
    if (
      !timeRange ||
      typeof timeRange !== 'object' ||
      !timeRange.start ||
      !timeRange.end
    ) {
      return undefined;
    }

    return {
      intervaloHoras: {
        inicio: timeRange.start,
        fim: timeRange.end
      }
    };
  }

  /**
   * 🏷️ #buildMetadata
   *
   * Monta o objeto de metadados para a resposta da API, incluindo parâmetros de busca, timestamp e total.
   *
   * @private
   * @param {Object} params - Parâmetros usados na busca
   * @param {Object} query - Query original
   * @param {number} total - Total de registros encontrados
   * @returns {Object} Objeto de metadados pronto para resposta
   */
  static #buildMetadata(params, query, total) {
    const intervalo = this._getIntervaloHoras(params);

    const metadados = {
      parametrosBusca: {
        data: params.date,
        diasConsiderados: params.dayRange,
        ordenacao: this._getSort(query),
        ...(intervalo || {})
      },
      timestampConsulta: new Date().toISOString(),
      totalFocos: total
    };
    return metadados;
  }
}
