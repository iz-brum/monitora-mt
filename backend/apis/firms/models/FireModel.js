// backend/apis/firms/models/FireModel.js

/**
 * 🔥 Tudo que diz respeito à estrutura, interpretação, transformação ou validação de um foco de calor individual.
*/

import { toNumber } from '#firms_utils/format.js'

/**
 * 🗺️ turf
 *
 * Biblioteca de análise e manipulação espacial/geográfica (GeoJSON), usada para cálculos como interseção, união e área.
 */
import * as turf from '@turf/turf';

/**
 * 🔥 FireModel.js
 *
 * Classe utilitária e estática para representar, construir, validar e formatar focos de calor
 * (fire records) provenientes do FIRMS (Fire Information for Resource Management System).
 *
 * Este arquivo centraliza todas as operações relacionadas ao domínio dos focos de calor.
 */
export class FireModel {
  // === 📥 Construção / Instanciação ===

  static fromCsvRecord(record) {
    const sensor = record.sensor;
    const base = this.#normalizeCoreFields(record);

    return {
      ...base,
      temperaturaBrilho: this.getPrimaryBrightness(sensor, record),
      temperaturaBrilhoSecundaria: this.getSecondaryBrightness(sensor, record)
    };
  }

  /**
   * 🛡️ safeFromCsvRecord
   * --------------------
   * Versão segura de `fromCsvRecord`, que captura e loga erros, retornando null se falhar.
   *
   * @param {Object} record - Registro bruto do CSV
   * @returns {Object|null} Instância formatada ou null em caso de erro
   */
  static safeFromCsvRecord(record) {
    try {
      return this.fromCsvRecord(record);
    } catch (error) {
      console.error('❌ Erro ao criar FireModel:', error, record);
      return null;
    }
  }

  /**
   * 🔍 hasStandardStructure
   * -----------------------
   * Verifica se o objeto possui a estrutura mínima esperada de um foco padronizado.
   * Útil para evitar remapeamento de registros já formatados.
   *
   * @param {Object} obj - Objeto de foco
   * @returns {boolean} Verdadeiro se parecer um FireModel
   */
  // static hasStandardStructure(obj) {
  //   return obj &&
  //     typeof obj === 'object' &&
  //     'dataAquisicao' in obj &&
  //     'horaAquisicao' in obj &&
  //     'latitude' in obj &&
  //     'longitude' in obj;
  // }

  // === 🔄 Normalização de Campos ===

  /**
   * ⏳ formatHour
   * ------------
   * Converte um valor numérico ou string representando hora no formato HHMM
   * para o padrão "HH:MM".
   *
   * @param {string|number} value - Hora sem separador, ex: "610", 610, "0610", 123
   * @returns {string} Hora formatada em "HH:MM"
   *
   * @example
   * FireModel.formatHour(610)   // => "06:10"
   * FireModel.formatHour("930") // => "09:30"
   */
  static formatHour(value) {
    const s = String(value).padStart(4, '0');
    return `${s.slice(0, 2)}:${s.slice(2)}`;
  }

  /**
   * 🔐 formatConfidence
   * -------------------
   * Converte o nível de confiança da FIRMS para número ou descrição textual amigável.
   * Ex: "h" → "alto", "n" → "nominal", "l" → "baixo", "85" → 85
   */
  static formatConfidence(confidence) {
    return confidence == null ? null : this.#attemptFormatConfidence(confidence);
  }

  // === 🔒 Helpers internos de confiança ===

  static #getConfidenceCategory(value) {
    const confidenceMap = { l: 'baixo', n: 'nominal', h: 'alto' };
    const normalized = value.toString().toLowerCase().trim();
    return confidenceMap[normalized] || null;
  }

  static #parseConfidenceNumber(value) {
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  static #attemptFormatConfidence(value) {
    return this.#getConfidenceCategory(value) ?? this.#parseConfidenceNumber(value);
  }

  /**
   * 🌞🌚 formatDayNight
   * -------------------
   * Converte o indicador dia/noite ('D'/'N') em "Dia"/"Noite".
   *
   * @param {string|number|null|undefined} value
   * @returns {string|number|null|undefined} Valor legível ou original padronizado
   */
  static formatDayNight(value) {
    return value == null ? null : this.#convertDayNight(value);
  }

  // === 🔒 Helpers internos de Dia/Noite ===

  static #getDayNightKey(value) {
    if (value == null) return value;
    return value.toString().trim().toUpperCase();
  }

  static #convertDayNight(value) {
    const map = { D: 'Dia', N: 'Noite' };
    const key = this.#getDayNightKey(value);
    return key in map ? map[key] : key;
  }

  /**
   * 📦 formatProductVersion
   * -----------------------
   * Converte versão FIRMS (ex: "6.1URT") para formato legível (ex: "C6.1 (ultra tempo real)").
   *
   * @param {string|null|undefined} version
   * @returns {string|null}
   */
  static formatProductVersion(version) {
    const components = this.#extractVersionComponents(version);
    return components ? this.#formatVersion(components) : this.#getDefaultVersion(version);
  }

  // === 🔒 Helpers internos de versão ===

  static #extractVersionComponents(version) {
    if (!version || typeof version !== 'string') return null;
    const match = version.match(/^([\d.]+)(URT|RT|NRT)?$/i);
    return match ? { collection: match[1], mode: match[2] } : null;
  }

  static #formatVersion({ collection, mode }) {
    return `C${collection}${this.#formatVersionMode(mode)}`;
  }

  static #formatVersionMode(mode) {
    if (!mode) return '';
    const modeMap = {
      URT: 'ultra tempo real',
      RT: 'tempo real',
      NRT: 'quase tempo real'
    };
    return ` (${modeMap[mode.toUpperCase()] || mode})`;
  }

  static #getDefaultVersion(version) {
    return version ?? null;
  }

  /**
   * 🛰️ formatSatelliteName
   * -----------------------
   * Traduz o nome técnico do satélite para um nome amigável, se houver mapeamento.
   * Caso contrário, retorna o valor original.
   *
   * @param {string} technicalName - Nome técnico fornecido pelo FIRMS (ex: 'N20', 'N')
   * @returns {string} Nome legível (ex: 'NOAA-20', 'Suomi-NPP') ou o original
   *
   * @example
   * FireModel.formatSatelliteName('N20') // => 'NOAA-20'
   * FireModel.formatSatelliteName('Terra') // => 'Terra'
   */
  static formatSatelliteName(technicalName) {
    return this.#satelliteDictionary[technicalName] || technicalName;
  }

  // 🔒 Dicionário privado de satélites
  static #satelliteDictionary = {
    N20: 'NOAA-20',
    N21: 'NOAA-21',
    N: 'Suomi-NPP'
  };

  /**
   * 🧼 #normalizeCoreFields
   * -----------------------
   * Normaliza os campos brutos de um registro FIRMS, convertendo-os para formatos legíveis e consistentes.
   *
   * ⚠️ Uso interno. Esta função não aplica lógica condicional de sensores, nem validação — 
   * serve apenas para transformar campos básicos como números, datas e strings padronizadas.
   *
   * 🔄 Substitui a antiga `normalizeFields()` pública, que foi removida por não estar sendo utilizada.
   *
   * @param {Object} record - Registro bruto do CSV FIRMS
   * @returns {Object} Objeto com campos normalizados (exceto temperatura de brilho)
   */
  static #normalizeCoreFields(record) {
    return {
      latitude: toNumber(record.latitude),
      longitude: toNumber(record.longitude),
      dataAquisicao: this.parseDate(record),
      horaAquisicao: this.parseHora(record),
      resolucaoVarredura: toNumber(record.scan),
      resolucaoTrilha: toNumber(record.track),
      potenciaRadiativa: toNumber(record.frp),
      nomeSatelite: this.formatSatelliteName(record.satellite),
      instrumentoSensor: record.instrument,
      nivelConfianca: this.formatConfidence(record.confidence),
      versaoProduto: this.formatProductVersion(record.version),
      indicadorDiaNoite: this.formatDayNight(record.daynight)
    };
  }

  // === 🛰️ Temperaturas e Sensores ===

  /**
   * Retorna a temperatura de brilho principal com base no tipo de sensor.
   * Para VIIRS → usa `bright_ti4`; para outros → usa `brightness`.
   */
  static getPrimaryBrightness(sensor, record) {
    return toNumber(
      this.isSensorType(sensor, 'VIIRS') ? record.bright_ti4 : record.brightness
    );
  }

  /**
   * Retorna a temperatura de brilho secundária com base no tipo de sensor.
   * Para VIIRS → usa `bright_ti5`; para outros → usa `bright_t31`.
   */
  static getSecondaryBrightness(sensor, record) {
    return toNumber(
      this.isSensorType(sensor, 'VIIRS') ? record.bright_ti5 : record.bright_t31
    );
  }

  /**
   * Verifica se o nome do sensor começa com determinado tipo (ex: MODIS, VIIRS).
   */
  static isSensorType(sensor, type) {
    return sensor && type && sensor.toUpperCase().startsWith(type.toUpperCase());
  }


  // === 📆 Data e Hora ===

  /**
   * 📅 parseDate
   * ------------
   * Extrai a data de aquisição do registro no formato ISO (YYYY-MM-DD).
   * Não aplica transformação, apenas encapsula o acesso direto ao campo.
   *
   * @param {Object} record - Registro bruto do CSV FIRMS
   * @returns {string|null} Data no formato 'YYYY-MM-DD' ou null se ausente
   */
  static parseDate(record) {
    return record?.acq_date ?? null;
  }

  /**
   * ⏱️ parseHora
   * ------------
   * Extrai e normaliza o campo de hora de aquisição do foco.
   *
   * @param {Object} record - Registro bruto do CSV
   * @returns {string|null} Hora formatada em "HH:MM" ou null
   */
  static parseHora(record) {
    const raw = record?.acq_time;
    return raw != null ? this.formatHour(raw) : null;
  }

  /**
   * 🕒 getTimestamp
   * ---------------
   * Retorna um objeto `Date` ou string ISO gerado a partir da data e hora de aquisição do registro FIRMS.
   *
   * @param {Object} record - Registro bruto com os campos `acq_date` e `acq_time`
   * @returns {Date|null} Objeto Date ou null se faltarem campos
   *
   * @example
   * FireModel.getTimestamp({ acq_date: '2023-08-10', acq_time: '1345' }) // => new Date('2023-08-10T13:45:00Z')
   */
  static getTimestamp(record) {
    const date = this.parseDate(record);
    const time = record?.acq_time?.toString().padStart(4, '0');

    if (!date || !time) return null;

    const iso = `${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`;
    const timestamp = new Date(iso);

    return isNaN(timestamp.getTime()) ? null : timestamp;
  }

  /**
   * 🌐 toUtc
   * --------
   * Converte um valor de data (string ou Date) para uma instância `Date` em UTC.
   *
   * @param {string|Date|null|undefined} value - Valor a ser convertido
   * @returns {Date|null} Objeto Date válido em UTC ou null
   *
   * @example
   * FireModel.toUtc('2023-08-10T14:30:00Z') // => Date em UTC
   * FireModel.toUtc(new Date('2023-08-10T14:30:00')) // => mesmo Date em UTC
   */
  static toUtc(value) {
    if (!value) return null;

    const date = typeof value === 'string' || value instanceof Date
      ? new Date(value)
      : null;

    return date && !isNaN(date.getTime()) ? date : null;
  }

  // === ✅ Validação ===

  /**
   * ✅ isValid
   * ----------
   * Verifica se um registro de foco é válido com base em sua localização geográfica
   * (dentro de um polígono fornecido) e horário (dentro de um intervalo temporal opcional).
   *
   * @param {Object} params
   * @param {Object} params.record - Registro de foco
   * @param {Object} params.polygon - Polígono GeoJSON para verificação espacial
   * @param {{ start: string, end: string }|undefined} params.timeRange - Intervalo de tempo (opcional)
   * @returns {boolean} Verdadeiro se o registro for considerado válido
   */
  static isValid({ record, polygon, timeRange }) {
    return this.isInsidePolygon(record, polygon) && this.isWithinTimeRange(record, timeRange);
  }

  /**
   * 📍 isInsidePolygon
   * ------------------
   * Verifica se as coordenadas do registro estão dentro de um polígono GeoJSON.
   *
   * @param {Object} record - Registro contendo `latitude` e `longitude`
   * @param {Object} polygon - Polígono GeoJSON para verificação
   * @returns {boolean} Verdadeiro se o ponto estiver dentro do polígono
   */
  static isInsidePolygon(record, polygon) {
    const lon = parseFloat(record.longitude);
    const lat = parseFloat(record.latitude);
    return turf.booleanPointInPolygon(turf.point([lon, lat]), polygon);
  }

  /**
   * ⏰ isWithinTimeRange
   * --------------------
   * Verifica se o registro está dentro de um intervalo de tempo informado.
   * Se o intervalo não for fornecido, assume que o registro é válido.
   *
   * @param {Object} record - Registro com campos `dataAquisicao` e `horaAquisicao` (ou brutos)
   * @param {{ start: string, end: string }|undefined} timeRange - Intervalo de tempo
   * @returns {boolean} Verdadeiro se estiver dentro do intervalo ou se não houver filtro
   */
  static isWithinTimeRange(record, timeRange) {
    if (!timeRange) return true;
    return this.checkTimeRange(record, timeRange);
  }

  /**
   * ⏲️ checkTimeRange
   * ------------------
   * Verifica se o timestamp de um registro está dentro de um intervalo de tempo.
   * Utiliza `getTimestamp` para gerar o tempo de aquisição e compara com os limites.
   *
   * @param {Object} record - Registro de foco (espera campos de data/hora válidos)
   * @param {{ start: string, end: string }} timeRange - Objeto com `start` e `end` em formato aceito pelo `Date`
   * @returns {boolean} Verdadeiro se o timestamp estiver dentro do intervalo (inclusivo)
   */
  static checkTimeRange(record, timeRange) {
    try {
      const ts = this.getTimestamp(record);
      const start = this.toUtc(timeRange.start);
      const end = this.toUtc(timeRange.end);
      return ts && start && end ? ts >= start && ts <= end : false;
    } catch {
      return false;
    }
  }

  // === 🧰 Manipulação de Listas de Registros ===

  /**
   * 🛠️ formatAndFilterList
   * -----------------------
   * Mapeia e filtra uma lista de registros brutos, padronizando-os para o formato interno.
   * Apenas os registros que forem transformados com sucesso são mantidos.
   *
   * @param {Array<Object>} records - Lista de registros brutos do FIRMS
   * @returns {Array<Object>} Registros válidos e formatados
   */
  static formatAndFilterList(records) {
    return records
      .map(record => this.safeFromCsvRecord(record))
      .filter(Boolean);
  }

  /**
   * 🔎 hasDataAquisicao
   * -------------------
   * Verifica se um registro de foco já possui o campo `dataAquisicao`,
   * indicando que já está formatado.
   *
   * @param {Object} record - Registro a ser verificado
   * @returns {boolean} Verdadeiro se o registro estiver formatado
   */
  static hasDataAquisicao(record) {
    return typeof record === 'object' && record !== null && 'dataAquisicao' in record;
  }

  /**
   * 🔄 routeByFormat
   * ----------------
   * Verifica se os registros já estão formatados. Se sim, retorna direto;
   * se não, aplica formatação e filtro.
   *
   * @param {Array<Object>} records - Lista de registros brutos ou formatados
   * @returns {Array<Object>} Lista de registros formatados
   */
  static routeByFormat(records) {
    if (!Array.isArray(records) || records.length === 0) return [];
    return this.hasDataAquisicao(records[0])
      ? records
      : this.formatAndFilterList(records);
  }

  /**
   * 🔍 filterByPolygonAndTimeRange
   * ------------------------------
   * Filtra uma lista de registros, mantendo apenas os que estão dentro do polígono e, se informado, no intervalo de tempo.
   *
   * @param {Array<Object>} records - Lista de focos de calor (brutos ou já formatados)
   * @param {Object} polygon - GeoJSON Polygon usado para o filtro espacial
   * @param {{ start: string, end: string } | undefined} timeRange - Faixa de horário para filtro temporal (opcional)
   * @returns {Array<Object>} Registros filtrados e válidos
   */
  static filterByPolygonAndTimeRange(records, polygon, timeRange) {
    return records.filter(r =>
      this.isValid({ record: r, polygon, timeRange })
    );
  }

  /**
   * 🏙️ Módulo de Cidade
   * 
   * Conjunto de métodos para manipulação e processamento de dados relacionados 
   * aos municípios afetados por focos de calor.
   * 
   * @module CityModule
   */

  /**
  * 🏙️ extractMunicipalityName
  *
  * Extrai e normaliza o nome do município a partir do objeto de foco de calor.
  * Utiliza helpers para extração segura e tratamento de valores ausentes.
  *
  * @param {Object} fire - Objeto do foco de calor
  * @returns {string} Nome do município normalizado ou 'N/A' se não disponível
  * @example
  * const cidade = extractMunicipalityName({
  *   localizacao: { cidade: 'CUIABÁ' }
  * }); // retorna "CUIABÁ"
  * 
  * @throws {TypeError} Se fire não for um objeto válido
  */
  static extractMunicipalityName(fire) {
    // Usa a helper privada para garantir maiúsculas
    const valor = this.extractLocationParameter(fire, 'cidade');
    return this.applyDefaultValue(this.#normalizarNomeCidade(valor), 'N/A');
  }

  /**
  * 🗺️ extractLocationParameter
  *
  * Extrai um valor específico do objeto de localização de um foco de calor.
  * Utiliza optional chaining para acesso seguro a propriedades aninhadas.
  *
  * @param {Object} fire - Objeto do foco de calor
  * @param {string} campo - Identificador do campo desejado
  * @returns {string|undefined} Valor do campo ou undefined
  * @example
  * // Extrair cidade
  * const cidade = extractLocationParameter(foco, 'cidade');
  * 
  * // Extrair estado
  * const estado = extractLocationParameter(foco, 'estado');
  * 
  * @throws {TypeError} Se fire não for um objeto
  */
  static extractLocationParameter(fire, campo) {
    return fire.localizacao?.[campo];
  }

  /**
  * 🔄 applyDefaultValue
  *
  * Aplica um valor padrão (fallback) quando o valor principal é "falsy".
  * Valores "falsy" incluem: undefined, null, 0, '', false, NaN
  *
  * @param {*} valor - Valor principal a ser verificado
  * @param {*} fallback - Valor padrão a ser usado se principal for falsy
  * @returns {*} Valor principal ou fallback
  * @example
  * // Com valor undefined
  * applyDefaultValue(undefined, 'N/A') // retorna 'N/A'
  * 
  * // Com valor válido
  * applyDefaultValue('Cuiabá', 'N/A') // retorna 'Cuiabá'
  * 
  * @see {@link https://developer.mozilla.org/pt-BR/docs/Glossary/Falsy|Valores Falsy}
  */
  static applyDefaultValue(valor, fallback) {
    return valor || fallback;
  }

  /**
   * 🏙️ #normalizarNomeCidade
   * 
   * Normaliza o nome do município para o formato padrão em maiúsculas.
   * Trata valores nulos/undefined de forma segura.
   * 
   * @param {string} cidade - Nome do município para normalizar
   * @returns {string} Nome do município em maiúsculas
   * @private
   * @example
   * #normalizarNomeCidade('Cuiabá') // retorna 'CUIABÁ'
   * #normalizarNomeCidade(null) // retorna undefined
   */
  static #normalizarNomeCidade(cidade) {
    return cidade?.toUpperCase();
  }

  /**
   * 🔥 extractRadiativePowerValue
   *
   * Extrai e converte a potência radiativa (FRP) de um foco de calor.
   *
   * @param {Object} fire - Objeto do foco de calor
   * @param {number|string} [fire.potenciaRadiativa] - Valor FRP do foco
   * @returns {number} Valor numérico do FRP ou 0 se inválido
   * @example
   * extractRadiativePowerValue({ potenciaRadiativa: "42.5" }) // retorna 42.5
   * extractRadiativePowerValue({}) // retorna 0
   */
  static extractRadiativePowerValue(fire) {
    // Valor default: 0, para manter retrocompatibilidade
    return parseFloat(fire.potenciaRadiativa || 0);
  }

  /**
   * 🌡️ getTemperatura
   *
   * Extrai a temperatura de brilho de um foco de calor.
   * Utiliza nullish coalescing para tratamento seguro de valores ausentes.
   *
   * @param {Object} fire - Objeto do foco de calor
   * @param {number} [fire.temperaturaBrilho] - Temperatura de brilho em Kelvin
   * @returns {number} Temperatura de brilho ou valor padrão (0)
   * @example
   * FireModel.getTemperatura({ temperaturaBrilho: 350.5 }) // retorna 350.5
   * FireModel.getTemperatura({}) // retorna 0
   */
  static getTemperatura(fire) {
    return fire.temperaturaBrilho ?? 0;
  }


  // === 📋 Comparações / Ordenações ===

  static getSensor(obj) {
    return obj.instrumentoSensor ?? '';
  }

  static getSatelite(obj) {
    return obj.nomeSatelite ?? '';
  }

  static compararInstrumentoSensor(a, b) {
    return FireModel.getSensor(a).localeCompare(FireModel.getSensor(b));
  }

  static compararNomeSatelite(a, b) {
    return FireModel.getSatelite(a).localeCompare(FireModel.getSatelite(b));
  }

  static sortCriteria = {
    datetime: (a, b) => {
      const dateTimeA = `${a.dataAquisicao} ${a.horaAquisicao}`;
      const dateTimeB = `${b.dataAquisicao} ${b.horaAquisicao}`;
      return dateTimeA.localeCompare(dateTimeB);
    },
    sensor: (a, b) => {
      const sensorCompare = FireModel.compararInstrumentoSensor(a, b);
      return sensorCompare !== 0
        ? sensorCompare
        : FireModel.compararNomeSatelite(a, b);
    }
  }

  static getSortFn(criterion) {
    return typeof FireModel.sortCriteria[criterion] === 'function'
      ? FireModel.sortCriteria[criterion]
      : FireModel.sortCriteria.sensor;
  }

  static sortFires(fires, criterion = 'sensor') {
    const sortFn = FireModel.getSortFn(criterion);
    return [...fires].sort(sortFn);
  }


  // === 📦 Saída Padronizada ===

  // static toFormattedObject(fire)
}
