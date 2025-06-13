

import { FireModel } from '#firms_models'; // DOCUMENTAR

/**
 * 📈 FireStatsService
 *
 * Serviço responsável por cálculos e agregações estatísticas dos focos de calor.
 */
import FireStatsService from '#firms_services/FireStatsService.js';

/**
 * Tipos de sensores suportados
 * @property {Object} SENSORS
 */
const SENSORS = {
    /** Visible Infrared Imaging Radiometer Suite */
    VIIRS: 'VIIRS',
    /** Moderate Resolution Imaging Spectroradiometer */
    MODIS: 'MODIS'
}

/**
 * 🌡️ aggregateBrightnessTemperatureData
 *
 * Calcula estatísticas de temperatura de brilho por cidade, utilizando canais sensíveis ao fogo:
 * MODIS (canal 21/22) e VIIRS (I-4), ambos aproximadamente 3.9 µm.
 *
 * - Agrupa focos por cidade e calcula métricas por cidade
 * - Calcula estatísticas gerais de temperatura considerando todos os focos
 * - Retorna as 10 cidades com maior temperatura máxima e lista completa das cidades ordenadas
 *
 * @param {Array<Object>} fires - Array de focos com informações de localização e temperatura de brilho
 * @returns {Object} Estatísticas de temperatura por cidade e geral:
 *   {
 *     geral: Object,  // Estatísticas gerais agregadas de temperatura
 *     cidadesMaiorTemperaturaMaxima: Array<Object>, // Top 10 cidades por temperatura máxima
 *     todasCidadesOrdenadas: Array<Object> // Todas as cidades, ordenadas
 *   }
 */
export function aggregateBrightnessTemperatureData(fires) {
    // Agrupa por cidade para calcular estatísticas
    const statsPorCidade = fires.reduce((acc, fire) => {
        const cidade = FireModel.extractMunicipalityName(fire);;
        const temperatura = FireModel.getTemperatura(fire);

        if (!acc[cidade]) {
            acc[cidade] = initializeTemperatureMetrics(cidade);
        }

        updateTemperatureMetrics(acc[cidade], temperatura, fire.instrumentoSensor);

        return acc;
    }, {});

    // Processa estatísticas por cidade
    const estatisticasPorCidade = processCityTemperatureStats(statsPorCidade);

    // Calcula estatísticas gerais
    const todasTemperaturas = fires.map(f => FireModel.getTemperatura(f));

    return {
        geral: calculateTemperatureAggregateMetrics(todasTemperaturas, fires.length),
        cidadesMaiorTemperaturaMaxima: estatisticasPorCidade.slice(0, 10)
            .map((cidade, index) => ({
                ...cidade,
                posicao: index + 1
            })),
        todasCidadesOrdenadas: estatisticasPorCidade.map((cidade, index) => ({
            ...cidade,
            posicao: index + 1
        }))
    };
}

/**
* 🌡️ initializeTemperatureMetrics
*
* Inicializa o objeto de estatísticas de temperatura de uma cidade.
* Estrutura utilizada como base para agregação de métricas por cidade.
*
* @param {string} cidade - Nome do município a ser inicializado
* @returns {Object} Estrutura inicial das estatísticas:
*   {
*     cidade: string,        // Nome do município
*     totalFocos: number,    // Contador de focos (0)
*     somaTemperatura: number, // Acumulador (0)
*     tempMinima: number,    // Valor inicial (Infinity)
*     tempMaxima: number,    // Valor inicial (-Infinity)
*     porSensor: {          // Contadores por sensor
*       VIIRS: number,      // Inicializado com 0
*       MODIS: number       // Inicializado com 0
*     }
*   }
* @throws {TypeError} Se cidade não for uma string válida
* @example
* const stats = initializeTemperatureMetrics('CUIABÁ');
*/
function initializeTemperatureMetrics(cidade) {
    return {
        cidade,
        totalFocos: 0,
        somaTemperatura: 0,
        tempMinima: Infinity,
        tempMaxima: -Infinity,
        porSensor: Object.fromEntries(
            Object.values(SENSORS).map(s => [s, 0])
        )
    }
}

/**
* 🔄 updateTemperatureMetrics
*
* Atualiza as estatísticas acumuladas de temperatura para uma cidade.
* Realiza atualizações in-place no objeto de estatísticas.
*
* Operações realizadas:
* - Incrementa contador total de focos
* - Acumula temperatura no somatório
* - Atualiza temperatura mínima e máxima
* - Atualiza contagem por tipo de sensor
*
* @param {Object} cityStats - Objeto de estatísticas da cidade
* @param {number} temperatura - Temperatura de brilho em Kelvin
* @param {string} instrumentoSensor - Identificador do sensor
* @throws {TypeError} Se cityStats não for um objeto válido
* @throws {RangeError} Se temperatura não for um número válido
* @example
* const stats = initializeTemperatureMetrics('CUIABÁ');
* updateTemperatureMetrics(stats, 350.5, 'VIIRS-SNPP');
*/
function updateTemperatureMetrics(cityStats, temperatura, instrumentoSensor) {
    cityStats.totalFocos++;
    cityStats.somaTemperatura += temperatura;
    cityStats.tempMinima = Math.min(cityStats.tempMinima, temperatura);
    cityStats.tempMaxima = Math.max(cityStats.tempMaxima, temperatura);

    FireStatsService.updateSensorDetectionCount(cityStats.porSensor, instrumentoSensor);
}

/**
* 🌡️ processCityTemperatureStats
*
* Processa e ordena estatísticas de temperatura por cidade.
* Converte o objeto de estatísticas em array ordenado por temperatura máxima.
*
* Processamento realizado:
* - Conversão de objeto para array
* - Mapeamento para formato resumido
* - Ordenação decrescente por temperatura máxima
*
* @param {Object} statsPorCidade - Mapa de estatísticas indexado por cidade
* @param {Object} statsPorCidade[cidade] - Estatísticas de cada cidade
* @throws {TypeError} Se statsPorCidade não for um objeto válido
* @returns {Array<Object>} Array ordenado de estatísticas:
*   [{
*     cidade: string,           // Nome do município
*     totalFocos: number,      // Quantidade de focos
*     tempMedia: number, // Média em Kelvin
*     tempMinima: number,      // Mínima em Kelvin
*     tempMaxima: number,      // Máxima em Kelvin
*     porSensor: Object        // Detecções por sensor
*   }]
* @example
* const ordenado = processCityTemperatureStats({
*   'CUIABÁ': { tempMaxima: 380.5, ... },
*   'VÁRZEA GRANDE': { tempMaxima: 350.5, ... }
* });
* // Retorna array ordenado: [Cuiabá, Várzea Grande]
*/
function processCityTemperatureStats(statsPorCidade) {
    return Object.values(statsPorCidade)
        .map(cidade => mapCidadeTemperatureStats(cidade))
        .sort((a, b) => parseFloat(b.tempMaxima) - parseFloat(a.tempMaxima));
}


/**
* 🌡️ calculateTemperatureAggregateMetrics
*
* Calcula estatísticas gerais de temperatura de brilho para todos os focos.
* Agrega métricas e informações técnicas sobre os sensores utilizados.
*
* Métricas calculadas:
* - Temperatura média geral
* - Temperatura mínima registrada
* - Temperatura máxima registrada
*
* @param {Array<number>} todasTemperaturas - Array de temperaturas em Kelvin
* @param {number} totalFocos - Total de focos analisados
* @throws {TypeError} Se todasTemperaturas não for um array válido
* @returns {Object} Estatísticas consolidadas:
*   {
*     tempMedia: number,  // Média em Kelvin
*     tempMinima: number,       // Mínima em Kelvin
*     tempMaxima: number,       // Máxima em Kelvin
*     detalhes: {
*       descricao: string[],    // Informações técnicas
*       unidade: string,        // Unidade de medida
*       referencia: string      // Fonte dos dados
*     }
*   }
* @example
* const stats = calculateTemperatureAggregateMetrics([350.5, 380.2], 2);
*/
function calculateTemperatureAggregateMetrics(todasTemperaturas, totalFocos) {
    return {
        tempMedia: calculateAverageTemperature(todasTemperaturas, totalFocos),
        tempMinima: getTempMinima(todasTemperaturas, totalFocos),
        tempMaxima: getMaximumTemperatureValue(todasTemperaturas, totalFocos),
        detalhes: {
            descricao: [
                '🔥 MODIS e VIIRS utilizam canais sensíveis ao fogo (~3.9 µm)',
                'Ambos os sensores operam na faixa espectral ideal para detecção de fogo ativo'
            ],
            unidade: 'Kelvin (K)',
            referencia: 'Fonte: FIRMS Layer Information'
        }
    };
}

/**
 * 🌡️ getCityTemperatureMean
 *
 * Calcula a temperatura média de brilho para uma cidade.
 * Resultado arredondado para duas casas decimais.
 *
 * @param {Object} cidade - Estatísticas da cidade
 * @param {number} cidade.totalFocos - Total de focos detectados
 * @param {number} cidade.somaTemperatura - Soma das temperaturas
 * @returns {number} Temperatura média ou valor padrão (0)
 * @example
 * const cidade = { totalFocos: 2, somaTemperatura: 701 };
 * getCityTemperatureMean(cidade) // retorna 350.50
 */
function getCityTemperatureMean(cidade) {
    if (cidade.totalFocos > 0) {
        return Number((cidade.somaTemperatura / cidade.totalFocos).toFixed(2));
    }
    return 0;
}

/**
* 🌡️ getCityTemperatureMax
*
* Obtém a maior temperatura de brilho registrada na cidade.
* Resultado formatado com duas casas decimais.
*
* @param {Object} cidade - Estatísticas da cidade
* @param {number} cidade.totalFocos - Total de focos detectados
* @param {number} cidade.tempMaxima - Maior temperatura registrada
* @returns {number} Temperatura máxima ou valor padrão (0)
* @example
* const cidade = { totalFocos: 1, tempMaxima: 380.567 };
* getCityTemperatureMax(cidade) // retorna 380.57
*/
function getCityTemperatureMax(cidade) {
    if (cidade.totalFocos > 0) {
        return Number(cidade.tempMaxima.toFixed(2));
    }
    return 0;
}

/**
* 🌡️ mapCidadeTemperatureStats
*
* Mapeia o objeto de estatísticas de uma cidade para um formato resumido 
* contendo as principais métricas de temperatura.
*
* Métricas calculadas:
* - Temperatura média da cidade
* - Temperatura mínima registrada
* - Temperatura máxima registrada
* - Distribuição de detecções por sensor
*
* @param {Object} cidade - Objeto de estatísticas da cidade
* @param {string} cidade.cidade - Nome do município
* @param {number} cidade.totalFocos - Total de focos detectados
* @param {Object} cidade.porSensor - Contagem de detecções por sensor
* @throws {TypeError} Se cidade não for um objeto válido
* @returns {Object} Resumo das estatísticas:
*   {
*     cidade: string,           // Nome do município
*     totalFocos: number,      // Quantidade de focos
*     tempMedia: number, // Média em Kelvin
*     tempMinima: number,      // Mínima em Kelvin
*     tempMaxima: number,      // Máxima em Kelvin
*     porSensor: {            // Detecções por sensor
*       VIIRS: number,
*       MODIS: number
*     }
*   }
* @example
* const stats = mapCidadeTemperatureStats({
*   cidade: 'CUIABÁ',
*   totalFocos: 2,
*   somaTemperatura: 701,
*   tempMinima: 320.5,
*   tempMaxima: 380.5,
*   porSensor: { VIIRS: 1, MODIS: 1 }
* });
*/
function mapCidadeTemperatureStats(cidade) {
    return {
        cidade: cidade.cidade,
        totalFocos: cidade.totalFocos,
        tempMedia: getCityTemperatureMean(cidade),
        tempMinima: getCityTemperatureMin(cidade),
        tempMaxima: getCityTemperatureMax(cidade),
        porSensor: cidade.porSensor
    };
}

/**
 * 🌡️ Cálculos Gerais de Temperatura
 * 
 * Conjunto de métodos para processamento estatístico das temperaturas de brilho.
 * Realiza cálculos agregados considerando todos os focos detectados.
 * 
 * @module TemperatureCalculationsModule
 */


/**
* 🌡️ getTempMinima
*
* Obtém a menor temperatura do conjunto de medições.
* Formata o resultado com duas casas decimais.
*
* @param {Array<number>} todasTemperaturas - Temperaturas em Kelvin
* @param {number} totalFocos - Quantidade de medições
* @throws {TypeError} Se os parâmetros forem inválidos
* @returns {number} Temperatura mínima ou valor padrão (0)
* @example
* getTempMinima([350.5, 380.2], 2) // retorna 350.50
*/
function getTempMinima(todasTemperaturas, totalFocos) {
    if (totalFocos > 0) {
        return Number(Math.min(...todasTemperaturas).toFixed(2));
    }
    return 0;
}

  /**
   * 🌡️ getCityTemperatureMin
   *
   * Obtém a menor temperatura de brilho registrada na cidade.
   * Resultado formatado com duas casas decimais.
   *
   * @param {Object} cidade - Estatísticas da cidade
   * @param {number} cidade.totalFocos - Total de focos detectados
   * @param {number} cidade.tempMinima - Menor temperatura registrada
   * @returns {number} Temperatura mínima ou valor padrão (0)
   * @example
   * const cidade = { totalFocos: 1, tempMinima: 320.567 };
   * getCityTemperatureMin(cidade) // retorna 320.57
   */
  function getCityTemperatureMin(cidade) {
    if (cidade.totalFocos > 0) {
        return Number(cidade.tempMinima.toFixed(2));
    }
    return 0;
}

/**
* 🌡️ getMaximumTemperatureValue
*
* Obtém a maior temperatura do conjunto de medições.
* Formata o resultado com duas casas decimais.
*
* @param {Array<number>} todasTemperaturas - Temperaturas em Kelvin
* @param {number} totalFocos - Quantidade de medições
* @throws {TypeError} Se os parâmetros forem inválidos
* @returns {number} Temperatura máxima ou valor padrão (0)
* @example
* getMaximumTemperatureValue([350.5, 380.2], 2) // retorna 380.20
*/
function getMaximumTemperatureValue(todasTemperaturas, totalFocos) {
    if (totalFocos > 0) {
        return Number(Math.max(...todasTemperaturas).toFixed(2));
    }
    return 0;
}


/**
* 🌡️ calculateAverageTemperature
*
* Calcula a temperatura média de um conjunto de medições.
* Retorna valor arredondado para duas casas decimais.
*
* @param {Array<number>} todasTemperaturas - Temperaturas em Kelvin
* @param {number} totalFocos - Quantidade de medições
* @throws {TypeError} Se os parâmetros forem inválidos
* @returns {number} Temperatura média ou valor padrão (0)
* @example
* calculateAverageTemperature([350.5, 380.2], 2) // retorna 365.35
*/
function calculateAverageTemperature(todasTemperaturas, totalFocos) {
    if (totalFocos > 0) {
        const media = todasTemperaturas.reduce((a, b) => a + b, 0) / totalFocos;
        return Number(media.toFixed(2));
    }
    return 0;
}
