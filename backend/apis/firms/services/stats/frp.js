// backend/apis/firms/services/stats/frp.js

import { FireModel } from '#firms_models'; // Só se precisar mesmo

// Exemplo de limite local, se não quiser importar de config.js
const FRP_LIMITS = { LOW: 42, MODERATE: 64 };

/**
 * ⚡ calculateFireRadiativePowerMetrics
 *
 * Calcula estatísticas de FRP (Fire Radiative Power) geral e por cidade:
 *  - FRP médio geral
 *  - Estatísticas por cidade (quantidade, média, máximo, distribuição por faixa de FRP)
 *  - Top 10 cidades com maior FRP máximo
 *  - Todas as cidades ordenadas por FRP máximo
 *
 * @param {Array<Object>} fires - Array de focos com localização e campo potenciaRadiativa
 * @returns {Object} Estatísticas de FRP:
 *   {
 *     geral: { frpMedio, ... },
 *     cidadesMaiorFRPMaximo: Array<{ cidade, frpMaximo, posicao, ... }>,
 *     todasCidadesOrdenadas: Array<{ cidade, frpMaximo, posicao, ... }>
 *   }
 */
export function calculateFireRadiativePowerMetrics(fires) {
    const frpTotal = fires.reduce((sum, fire) => sum + parseFloat(fire.potenciaRadiativa || 0), 0);
    const frpMedioGeral = frpTotal / fires.length;

    const statsPorCidade = fires.reduce((acc, fire) => {
        const cidade = FireModel.extractMunicipalityName(fire);
        const frp = FireModel.extractRadiativePowerValue(fire)

        if (!acc[cidade]) {
            acc[cidade] = initializeMunicipalityMetrics(cidade)
        }

        updateMunicipalityMetrics(acc[cidade], frp, FRP_LIMITS.LOW, FRP_LIMITS.MODERATE)

        return acc
    }, {})

    const estatisticasPorCidade = processMunicipalityStatistics(statsPorCidade)

    return {
        geral: calculateAggregateMetrics(fires, frpMedioGeral),
        cidadesMaiorFRPMaximo: estatisticasPorCidade.slice(0, 10).map((cidade, index) => ({
            ...cidade,
            posicao: index + 1
        })),
        todasCidadesOrdenadas: estatisticasPorCidade.map((cidade, index) => ({
            ...cidade,
            posicao: index + 1
        }))
    }
}

/**
 * 🏙️ initializeMunicipalityMetrics
 *
 * Inicializa o objeto de estatísticas para um município.
 * Cria estrutura base para agregação de métricas de focos de calor.
 *
 * @param {string} cidade - Nome do município a ser inicializado
 * @returns {Object} Estrutura inicial de estatísticas:
 *   {
 *     cidade: string,        // Nome do município
 *     totalFocos: number,    // Contador de focos
 *     somaFRP: number,      // Acumulador de FRP
 *     frpMinimo: number,    // Menor FRP registrado (Infinity inicial)
 *     frpMaximo: number,    // Maior FRP registrado (-Infinity inicial)
 *     focosIntensidade: {   // Distribuição por intensidade
 *       baixa: number,      // Contagem de focos de baixa intensidade
 *       moderada: number,   // Contagem de focos de intensidade moderada
 *       alta: number       // Contagem de focos de alta intensidade
 *     }
 *   }
 * @throws {TypeError} Se cidade não for uma string válida
 * @example
 * const stats = initializeMunicipalityMetrics('CUIABÁ');
 * // {
 * //   cidade: 'CUIABÁ',
 * //   totalFocos: 0,
 * //   somaFRP: 0,
 * //   frpMinimo: Infinity,
 * //   frpMaximo: -Infinity,
 * //   focosIntensidade: { baixa: 0, moderada: 0, alta: 0 }
 * // }
 */
function initializeMunicipalityMetrics(cidade) {
    return {
        cidade,
        totalFocos: 0,
        somaFRP: 0,
        frpMinimo: Infinity,
        frpMaximo: -Infinity,
        focosIntensidade: {
            baixa: 0,
            moderada: 0,
            alta: 0
        }
    }
}

/**
* 📊 processMunicipalityStatistics
*
* Processa estatísticas de FRP por município e retorna array ordenado.
*
* @param {Object} statsPorCidade - Estatísticas agregadas por cidade
* @returns {Array<Object>} Array ordenado por FRP máximo:
*   [{
*     cidade: string,
*     totalFocos: number,
*     frpMedio: number,
*     frpMinimo: number,
*     frpMaximo: number,
*     distribuicaoIntensidade: {
*       baixa: number,
*       moderada: number,
*       alta: number
*     }
*   }]
* @throws {TypeError} Se statsPorCidade não for um objeto válido
*/
export function processMunicipalityStatistics(statsPorCidade) {
    return Object.values(statsPorCidade)
        .map(cidade => ({
            cidade: cidade.cidade,
            totalFocos: cidade.totalFocos,
            frpMedio: cidade.totalFocos > 0
                ? Number((cidade.somaFRP / cidade.totalFocos).toFixed(2))
                : 0,
            frpMinimo: cidade.frpMinimo,
            frpMaximo: cidade.frpMaximo,
            distribuicaoIntensidade: cidade.focosIntensidade
        }))
        .sort((a, b) => parseFloat(b.frpMaximo) - parseFloat(a.frpMaximo));
}

/**
* � getFrpMedio | getFrpMinimo | getFrpMaximo
*
* Calcula métricas estatísticas de FRP para um conjunto de focos.
*
* @param {Array<Object>} fires - Lista de focos de calor
* @param {Array<number>} allFRPs - Valores de FRP extraídos
* @returns {number} Valor calculado ou 0 se não houver dados
* @example
* getFrpMedio([{potenciaRadiativa: 42}], [42]) // retorna 42.00
*/

export function getFrpMedio(fires, frpMedioGeral) {
    if (fires.length > 0) {
        return Number(frpMedioGeral.toFixed(2));
    }
    return 0;
}

export function getFrpMinimo(fires, allFRPs) {
    if (fires.length > 0) {
        return Number(Math.min(...allFRPs).toFixed(2));
    }
    return 0;
}

export function getFrpMaximo(fires, allFRPs) {
    if (fires.length > 0) {
        return Number(Math.max(...allFRPs).toFixed(2));
    }
    return 0;
}

/**
* 📊 calculateAggregateMetrics
*
* Calcula métricas agregadas de FRP incluindo classificação por intensidade.
*
* @param {Array<Object>} fires - Focos de calor
* @param {number} frpMedioGeral - FRP médio pré-calculado
* @returns {Object} Métricas e classificação:
*   {
*     frpMedio: number,
*     frpMinimo: number,
*     frpMaximo: number,
*     classificacao: {
*       descricao: string[],
*       unidade: string,
*       referencia: string
*     }
*   }
* @see Referência científica: DOI da publicação sobre classificação
*/
function calculateAggregateMetrics(fires, frpMedioGeral) {
    const allFRPs = fires.map(f => parseFloat(f.potenciaRadiativa || 0));

    return {
        frpMedio: getFrpMedio(fires, frpMedioGeral),
        frpMinimo: getFrpMinimo(fires, allFRPs),
        frpMaximo: getFrpMaximo(fires, allFRPs),
        classificacao: {
            descricao: [
                '🔵 Baixa intensidade: FRP < 42 MW',
                '🟡 Intensidade moderada: 42 ≤ FRP ≤ 64 MW',
                '🔴 Alta intensidade: FRP > 64 MW'
            ],
            unidade: 'Megawatts (MW)',
            referencia: 'Fonte: Putting fire on the map of Brazilian savanna ecoregions'
        }
    };
}

/**
* 🔄 updateMunicipalityMetrics
*
* Atualiza as estatísticas acumuladas de uma cidade a partir de um novo foco.
* Realiza atualizações in-place no objeto de estatísticas.
*
* Operações realizadas:
* - Incrementa contador total de focos
* - Acumula valor de FRP
* - Atualiza valores mínimo e máximo de FRP
* - Atualiza distribuição por intensidade
*
* @param {Object} cityStats - Objeto de estatísticas do município
* @param {number} frp - Valor do FRP do foco atual (em MW)
* @param {number} LIMITE_BAIXA - Limite superior para intensidade baixa (MW)
* @param {number} LIMITE_MODERADA - Limite superior para intensidade moderada (MW)
* @throws {TypeError} Se cityStats não for um objeto válido
* @throws {RangeError} Se frp não for um número válido
* @example
* const stats = { 
*   cidade: 'CUIABÁ',
*   totalFocos: 5,
*   somaFRP: 210
* };
* updateMunicipalityMetrics(stats, 42, 40, 60);
*/
function updateMunicipalityMetrics(cityStats, frp, LIMITE_BAIXA, LIMITE_MODERADA) {
    cityStats.totalFocos++;
    cityStats.somaFRP += frp;
    cityStats.frpMinimo = Math.min(cityStats.frpMinimo, frp);
    cityStats.frpMaximo = Math.max(cityStats.frpMaximo, frp);

    updateIntensityDistributionMetrics(cityStats.focosIntensidade, frp, LIMITE_BAIXA, LIMITE_MODERADA);
}

/**
* 🔥 updateIntensityDistributionMetrics
*
* Atualiza a distribuição de intensidade dos focos de calor baseada no FRP.
* Classifica e contabiliza focos em três categorias: baixa, moderada e alta.
*
* Regras de classificação:
* - Baixa: FRP < LIMITE_BAIXA
* - Moderada: LIMITE_BAIXA ≤ FRP ≤ LIMITE_MODERADA
* - Alta: FRP > LIMITE_MODERADA
*
* @param {Object} focosIntensidade - Contadores por faixa de intensidade
* @param {number} frp - Valor do FRP do foco (MW)
* @param {number} LIMITE_BAIXA - Limite superior para baixa intensidade (MW)
* @param {number} LIMITE_MODERADA - Limite superior para intensidade moderada (MW)
* @throws {TypeError} Se focosIntensidade não for um objeto válido
* @throws {RangeError} Se os limites não forem números válidos
* @example
* const dist = { baixa: 3, moderada: 2, alta: 1 };
* updateIntensityDistributionMetrics(dist, 45, 42, 64);
* // dist => { baixa: 3, moderada: 3, alta: 1 }
*/
function updateIntensityDistributionMetrics(focosIntensidade, frp, LIMITE_BAIXA, LIMITE_MODERADA) {
    const intensidadeMap = {
        baixa: frp < LIMITE_BAIXA,
        moderada: frp >= LIMITE_BAIXA && frp <= LIMITE_MODERADA,
        alta: frp > LIMITE_MODERADA
    }

    const intensidade = Object.keys(intensidadeMap).find(key => intensidadeMap[key]);
    focosIntensidade[intensidade]++;
}
