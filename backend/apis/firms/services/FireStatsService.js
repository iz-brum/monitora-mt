// backend/apis/firms/services/FireStatsService.js

import { debugJsonLog, debugLog } from '#backend_utils/debugLog.js';
void debugJsonLog, debugLog

import { FireModel } from '#firms_models'; // DOCUMENTAR

import fs from "fs";

/**
 * 🔥 FireStatsService
 *
 * Serviço responsável pelo processamento e cálculo de estatísticas relacionadas a focos de calor,
 * incluindo métricas de temperatura de brilho, distribuição por intensidade,
 * agrupamento por cidade e contagem por sensor (MODIS/VIIRS).
 *
 * Todos os métodos utilitários e auxiliares relacionados a análise e agregação de dados de incêndios
 * estão centralizados nesta classe.
 */
class FireStatsService {
  /**
 * ⚙️ Configurações Globais do Serviço
 * 
 * Objeto de configuração contendo constantes, limites e valores padrão utilizados no serviço.
 * 
 * @constant {Object} CONFIG
 * @private
 */
  static #CONFIG = {
    /**
     * Valores padrão para fallback e inicialização
     * @property {Object} DEFAULTS
     */
    DEFAULTS: {
      /** Valor numérico padrão para métricas */
      METRIC: 0,
      /** Texto padrão para campos não preenchidos */
      TEXT: 'N/A',
      /** Limites para classificação de intensidade */
      LIMITS: {
        /** Limites de temperatura em Kelvin */
        TEMPERATURE: {
          MIN: -Infinity,
          MAX: Infinity
        }
      }
    },

    /**
     * Tipos de sensores suportados
     * @property {Object} SENSORS
     */
    SENSORS: {
      /** Visible Infrared Imaging Radiometer Suite */
      VIIRS: 'VIIRS',
      /** Moderate Resolution Imaging Spectroradiometer */
      MODIS: 'MODIS'
    },

    /**
     * Caminhos para arquivos de referência
     * @property {Object} PATHS
     */
    PATHS: {
      /** GeoJSON com mapeamento de municípios e comandos regionais */
      GEO_REF: 'public/assets/geoRef/municipios_por_comando_regional_colorido.geojson'
    },

    /**
     * Unidades de medida utilizadas
     * @property {Object} UNITS
     */
    UNITS: {
      /** Unidade para temperatura de brilho */
      TEMPERATURE: 'Kelvin (K)'
    }
  }

  // Métodos Principais Públicos (API da classe)

  /**
 * 📊 aggregateWeeklyFireStats
 * 
 * Agrega dados de focos por dia para visualização no gráfico.
 * 
 * @param {Array<Object>} fires - Array de focos de calor
 * @returns {Object} Estatísticas diárias agrupadas
 */
  static aggregateWeeklyFireStats(fires) {
    const dailyStats = fires.reduce((acc, fire) => {
      const data = fire.dataAquisicao;
      acc[data] = (acc[data] || 0) + 1;
      return acc;
    }, {});

    return {
      dadosDiarios: Object.entries(dailyStats)
        .map(([data, total]) => ({
          data,
          focos: total
        }))
        .sort((a, b) => a.data.localeCompare(b.data)) // Ordena por data
    };
  }

  /**
   * 🏙️ aggregateAndRankMunicipalityFireStats
   *
   * Agrupa focos de calor por cidade, calcula estatísticas agregadas por cidade e retorna ordenado.
   *
   * - Conta o total de focos por cidade
   * - Ordena por total de focos (decrescente)
   * - Adiciona ranking/posição para cada cidade
   * - Retorna as 10 cidades mais afetadas, o total de cidades, e todas as cidades ordenadas
   *
   * @param {Array<Object>} fires - Array de focos com localização geocodificada
   * @returns {Object} Estatísticas por cidade:
   *   {
   *     totalCidades: number,
   *     cidadesMaisAfetadas: Array<{ cidade, totalFocos, posicao, ... }>,
   *     todasCidadesOrdenadas: Array<{ cidade, totalFocos, posicao, ... }>
   *   }
   */
  static aggregateAndRankMunicipalityFireStats(fires) {
    const stats = fires.reduce((acc, fire) => {
      const cidade = FireModel.extractMunicipalityName(fire);;

      if (!acc[cidade]) {
        acc[cidade] = FireStatsService.createMunicipalityMetricsStructure(cidade);
      }

      FireStatsService.incrementCityStats(acc[cidade]);

      return acc;
    }, {});

    // Converte para array e ordena por total de focos
    const ordenado = Object.values(stats).sort((a, b) => b.totalFocos - a.totalFocos);

    // Adiciona posição a todas as cidades ordenadas
    const todasCidadesOrdenadas = ordenado.map((cidade, index) => ({
      ...cidade,
      posicao: index + 1
    }));

    return {
      totalCidades: todasCidadesOrdenadas.length,
      cidadesMaisAfetadas: todasCidadesOrdenadas.slice(0, 10),
      todasCidadesOrdenadas
    };
  }

  /**
   * ⏰ analyzeTemporalDistribution
   * 
   * Analisa a distribuição temporal dos focos de calor ao longo das horas do dia.
   * 
   * - Gera histograma da quantidade de focos por hora
   * - Identifica o horário de pico (hora com maior quantidade de focos)
   * - Retorna dados ordenados de forma decrescente (23:00 → 00:00)
   * 
   * @param {Array<Object>} fires - Array de focos com campo horaAquisicao
   * @returns {Object} Distribuição temporal:
   *   {
   *     histograma: Array<{hora: string, quantidade: number}>,
   *     pico: {hora: string, quantidade: number}
   *   }
   */
  static analyzeTemporalDistribution(fires) {
    const arrayHistDesc = this.#criarArrayDeHistograma(fires);

    // encontra o pico iterando sobre o array (não depende da ordem do array)
    const pico = arrayHistDesc.reduce(
      (p, cur) =>
        cur.quantidade > p.quantidade
          ? { hora: cur.hora, quantidade: cur.quantidade }
          : p,
      { hora: null, quantidade: 0 }
    );

    // debugJsonLog('Analyze Temporal Distribution', {
    //   histograma: { value: arrayHistDesc, maxItems: 24 },
    //   pico: pico
    // });

    return {
      histograma: arrayHistDesc,
      pico
    };
  }

  /**
  * 🟧 aggregateRegionalCommandData
  * 
  * Agrega estatísticas de focos de calor por Comando Regional (CR).
  * 
  * - Mapeia municípios para seus respectivos CRs
  * - Conta focos e municípios por CR
  * - Ordena CRs por total de focos (decrescente)
  * 
  * @param {Array<Object>} fires - Array de focos com localização geocodificada
  * @returns {Array<Object>} Estatísticas por CR:
  *   [{
  *     comandoRegional: string,
  *     totalFocos: number,
  *     cidades: Array<string>
  *   }]
  */
  static aggregateRegionalCommandData(fires) {
    const municipioToCR = this.#carregarMapeamentoCR();

    const stats = fires.reduce((acc, fire) => {
      const cidade = FireModel.extractMunicipalityName(fire);
      const cr = this.#obterComandoRegional(cidade, municipioToCR);
      return this.#atualizarStatsCR(acc, cr, cidade);
    }, {});

    return this.#ordenarPorTotalFocos(
      this.#converterSetsParaArrays(stats)
    );
  }

  /**
   * 🛠️ Helpers Genéricos
   * 
   * Conjunto de funções utilitárias reutilizáveis que fornecem
   * funcionalidades comuns para manipulação de dados e valores.
   * 
   * Estas funções são utilizadas por diversos módulos do serviço
   * e seguem princípios SOLID de responsabilidade única.
   */

  // Módulos por Domínio

  /**
  * 🏁 createMunicipalityMetricsStructure
  *
  * Cria a estrutura inicial de métricas para um município.
  * Inicializa contadores e acumuladores para análise estatística.
  *
  * @param {string} cidade - Nome do município
  * @returns {Object} Estrutura de métricas inicializada:
  *   {
  *     cidade: string,
  *     totalFocos: number
  *   }
  * @example
  * const stats = createMunicipalityMetricsStructure('CUIABÁ');
  * // { cidade: 'CUIABÁ', totalFocos: 0 }
  */
  static createMunicipalityMetricsStructure(cidade) {
    return {
      cidade,
      totalFocos: 0
    }
  }

  /**
 * ➕ incrementCityStats
 *
 * Incrementa o contador de focos de calor nas estatísticas do município.
 * Atualiza in-place o objeto de estatísticas fornecido.
 *
 * @param {Object} cityStats - Objeto de estatísticas do município
 * @param {number} cityStats.totalFocos - Total atual de focos
 * @throws {TypeError} Se cityStats não contiver a propriedade totalFocos
 * @example
 * const stats = { cidade: 'CUIABÁ', totalFocos: 5 };
 * incrementCityStats(stats);
 * // stats.totalFocos === 6
 */
  static incrementCityStats(cityStats) {
    cityStats.totalFocos++;
  }

  /**
   * 🌡️ Módulo Temperatura
   * 
   * Conjunto de métodos para processamento e análise de temperaturas de brilho dos focos de calor.
   * Utiliza dados dos canais térmicos dos sensores MODIS (3.9 µm) e VIIRS (I-4).
   * 
   * @module TemperatureModule
   */

  /**
   * 📊 Mapeamento e Processamento de Estatísticas
   * 
   * Conjunto de métodos responsáveis pela transformação e processamento
   * dos dados brutos em estatísticas estruturadas.
   * 
   * Funcionalidades:
   * - Mapeamento de dados brutos para formatos padronizados
   * - Processamento de métricas agregadas
   * - Ordenação e classificação de resultados
   * - Transformação de estruturas de dados
   * 
   * @module StatisticsProcessingModule
   */

  /**
   * 🔄 Inicialização e Atualização de Métricas
   * 
   * Conjunto de métodos responsáveis pela inicialização e atualização
   * das estruturas de dados que armazenam métricas de temperatura.
   * 
   * @module MetricsModule
   */

  /**
 * 🛰️ updateSensorDetectionCount
 *
 * Atualiza a contagem de focos por tipo de sensor (VIIRS ou MODIS).
 * Incrementa o contador do sensor correspondente nas estatísticas.
 *
 * Processamento:
 * - Identifica o tipo de sensor a partir do nome do instrumento
 * - Incrementa o contador correspondente se encontrado
 *
 * @param {Object} porSensor - Contadores por tipo de sensor
 * @param {string} instrumentoSensor - Nome do sensor (ex: 'VIIRS-SNPP', 'MODIS-T')
 * @throws {TypeError} Se porSensor não for um objeto válido
 * @example
 * const contadores = { VIIRS: 0, MODIS: 0 };
 * updateSensorDetectionCount(contadores, 'VIIRS-SNPP');
 * // contadores => { VIIRS: 1, MODIS: 0 }
 */
  static updateSensorDetectionCount(porSensor, instrumentoSensor) {
    const sensor = Object.values(this.#CONFIG.SENSORS)
      .find(s => instrumentoSensor?.includes(s));

    if (sensor) porSensor[sensor]++;
  }

  /**
   * ⏰ Módulo Horário
   * 
   * Conjunto de métodos para processamento e análise da distribuição temporal
   * dos focos de calor ao longo das horas do dia.
   * 
   * Funcionalidades:
   * - Extração e formatação de horários
   * - Geração de histogramas de distribuição horária
   * - Análise de padrões temporais
   * 
   * @module TimeModule
   */

  /**
 * 🕐 #extrairDuasPrimeirasHoras
 * 
 * Extrai e normaliza a hora de uma string de horário completo.
 * Garante padronização com dois dígitos usando zero à esquerda.
 * 
 * @param {string} horaCompleta - String com horário no formato "H:mm" ou "HH:mm"
 * @returns {string|null} Hora formatada com dois dígitos ou null se inválido
 * @throws {TypeError} Se horaCompleta não for uma string
 * @example
 * #extrairDuasPrimeirasHoras("4:30")  // retorna "04"
 * #extrairDuasPrimeirasHoras("15:45") // retorna "15"
 * #extrairDuasPrimeirasHoras("")      // retorna null
 * @private
 */
  static #extrairDuasPrimeirasHoras(horaCompleta) {
    if (!horaCompleta) return null;
    const partes = horaCompleta.split(':');
    const hora = partes[0];               // pode vir "4" ou "04"
    const hora2d = hora.padStart(2, '0'); // normaliza para "04"
    return hora2d;
  }

  /**
 * 🕒 #extrairHoraAquisicao
 * 
 * Extrai a hora de aquisição do foco de calor.
 * Utiliza valor padrão caso o horário não esteja disponível.
 * 
 * @param {Object} fire - Objeto do foco de calor
 * @param {string} [fire.horaAquisicao] - Horário de aquisição do foco
 * @returns {string} Hora formatada ou valor padrão ('N/A')
 * @throws {TypeError} Se fire não for um objeto válido
 * @example
 * #extrairHoraAquisicao({ horaAquisicao: "4:30" }) // retorna "04"
 * #extrairHoraAquisicao({}) // retorna "N/A"
 * @private
 */
  static #extrairHoraAquisicao(fire) {
    const hora2d = this.#extrairDuasPrimeirasHoras(fire.horaAquisicao);
    return hora2d ?? this.#CONFIG.DEFAULTS.TEXT;
  }

  /**
 * 📊 #criarArrayDeHistograma
 * 
 * Cria um array com a distribuição horária dos focos de calor.
 * Processa e agrupa os dados para análise temporal.
 * 
 * Processamento:
 * - Extrai e normaliza horários dos focos
 * - Agrupa e conta focos por hora
 * - Ordena de forma decrescente (23:00 → 00:00)
 * - Formata no padrão "HH:00"
 * 
 * @param {Array<Object>} fires - Array de focos de calor
 * @param {string} [fires[].horaAquisicao] - Horário de cada foco
 * @returns {Array<Object>} Histograma ordenado:
 *   [{
 *     hora: string,      // Formato "HH:00"
 *     quantidade: number // Total de focos na hora
 *   }]
 * @throws {TypeError} Se fires não for um array válido
 * @example
 * const hist = #criarArrayDeHistograma([
 *   { horaAquisicao: "14:30" },
 *   { horaAquisicao: "14:45" }
 * ]);
 * // [{ hora: "14:00", quantidade: 2 }]
 * @private
 */
  static #criarArrayDeHistograma(fires) {
    // 1) monta o objeto bruto { "HH": quantidade }
    const histogramaBruto = fires.reduce((acc, fire) => {
      const hora = this.#extrairHoraAquisicao(fire); // ex: "04"
      acc[hora] = (acc[hora] || 0) + 1;
      return acc;
    }, {});

    // 2) converte em array ordenado DESCENDENTE e adiciona ":00" em cada hora
    const arrayOrdenadoDesc = Object.keys(histogramaBruto)
      .sort((a, b) => parseInt(b, 10) - parseInt(a, 10)) // ordena de 23 → 00
      .map(hora => ({
        hora: `${hora}:00`, // ex: "04:00"
        quantidade: histogramaBruto[hora]
      }));

    return arrayOrdenadoDesc;
  }

  /**
   * 🏛️ Módulo Comando Regional (CRBM)
   * 
   * Conjunto de métodos para processamento e análise de dados de focos de calor
   * agrupados por Comando Regional do Corpo de Bombeiros Militar de MT.
   * 
   * Estrutura de dados:
   * - CR BM I ao VII (Comandos Regionais)
   * - Agrupamento de municípios por área de responsabilidade
   * - Métricas de focos por comando
   * 
   * @module RegionalCommandModule
   */

  /**
   * 🗺️ #carregarMapeamentoCR
   * 
   * Carrega o mapeamento GeoJSON de municípios para seus respectivos CRBMs.
   * 
   * @returns {Object} Mapeamento município → CRBM
   * @example
   * {
   *   "CUIABÁ": "CR BM I",
   *   "SINOP": "CR BM III",
   *   "TANGARÁ DA SERRA": "CR BM VI"
   * }
   * @private
   */
  static #carregarMapeamentoCR() {
    const geojson = JSON.parse(fs.readFileSync('public/assets/geoRef/municipios_por_comando_regional_colorido.geojson', 'utf8'));

    return geojson.features.reduce((acc, f) => {
      acc[(f.properties.name || '').toUpperCase()] = f.properties.comandoRegional;
      return acc;
    }, {});
  }

  /**
 * 📊 #inicializarStatsCR
 * 
 * Inicializa estrutura de estatísticas para um Comando Regional.
 * 
 * @param {string} cr - Identificador do CRBM (ex: "CR BM III")
 * @returns {Object} Estrutura:
 *   {
 *     comandoRegional: string,  // Nome do CRBM
 *     totalFocos: number,      // Contador de focos (0)
 *     cidades: Set<string>     // Conjunto de municípios
 *   }
 * @private
 */
  static #inicializarStatsCR(cr) {
    return {
      comandoRegional: cr,
      totalFocos: 0,
      cidades: new Set()
    };
  }

  /**
 * 🔄 #atualizarStatsCR
 * 
 * Atualiza estatísticas de um CRBM com dados de um novo foco.
 * 
 * @param {Object} stats - Estatísticas gerais
 * @param {string} cr - Comando Regional (ex: "CR BM III")
 * @param {string} cidade - Município do foco
 * @returns {Object} Estatísticas atualizadas
 * @example
 * // Exemplo de saída após processamento:
 * {
 *   "CR BM III": {
 *     comandoRegional: "CR BM III",
 *     totalFocos: 342,
 *     cidades: Set(["SINOP", "SORRISO", ...])
 *   }
 * }
 * @private
 */
  static #atualizarStatsCR(stats, cr, cidade) {
    if (!stats[cr]) {
      stats[cr] = this.#inicializarStatsCR(cr);
    }
    stats[cr].totalFocos++;
    stats[cr].cidades.add(cidade);
    return stats;
  }

  /**
 * 🏛️ #obterComandoRegional
 * 
 * Obtém o CRBM responsável por um município.
 * 
 * @param {string} cidade - Nome do município
 * @param {Object} mapeamento - Mapeamento município → CRBM
 * @returns {string} CRBM ou 'NÃO ASSOCIADO'
 * @example
 * // Retorna "CR BM III" para "SINOP"
 * // Retorna "CR BM VI" para "TANGARÁ DA SERRA"
 * @private
 */
  static #obterComandoRegional(cidade, mapeamento) {
    return mapeamento[cidade] || 'NÃO ASSOCIADO';
  }

  /**
 * 🔄 #converterSetsParaArrays
 * 
 * Converte conjuntos de municípios para arrays.
 * 
 * @param {Object} stats - Estatísticas com Sets
 * @returns {Array<Object>} Formato final:
 *   [{
 *     comandoRegional: string,   // Ex: "CR BM III"
 *     totalFocos: number,       // Ex: 342
 *     cidades: string[]         // Ex: ["SINOP", "SORRISO", ...]
 *   }]
 * @private
 */
  static #converterSetsParaArrays(stats) {
    return Object.values(stats).map(stat => ({
      ...stat,
      cidades: Array.from(stat.cidades)
    }));
  }

  /**
 * 📊 #ordenarPorTotalFocos
 * 
 * Ordena CRBMs por quantidade de focos (decrescente).
 * 
 * @param {Array<Object>} stats - Estatísticas dos CRBMs
 * @returns {Array<Object>} Array ordenado
 * @example
 * // Retorna ordem: CR BM III (342) → CR BM VI (205) → ...
 * @private
 */
  static #ordenarPorTotalFocos(stats) {
    return stats.sort((a, b) => b.totalFocos - a.totalFocos);
  }
}

/**
 * 🔄 Exportação padrão do serviço de estatísticas de focos de calor.
 */
export default FireStatsService
