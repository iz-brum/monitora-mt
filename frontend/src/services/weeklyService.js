// src/services/weeklyService.js

import {
    montarUrl,
    buscarJson,
    logErroFetch,
    // obterDataDeHoje, → descomente se o endpoint precisar de um parâmetro `dt`
} from '../utils/api.js'

/**
 * Endpoint de dados semanais de focos de calor.
 * Mantido igual ao que existia em indicadoresService.js:
 *   GET /api/firms/fires/weekly-stats
 */
const FIRE_WEEKLY_STATS = '/api/firms/fires/weekly-stats'

/**
 * Busca estatísticas semanais de focos de calor.
 * @returns {Promise<Array<{ data: string, focos: number }>>}
 * @description
 * - Retorna um array com total de focos por dia nos últimos 7 dias.
 * - Formato esperado: [ { data: 'YYYY-MM-DD', focos: número }, ... ]
 */
export async function buscarDadosSemanais() {
    try {
        // Se o back-end exigir um parâmetro dt, descomente as linhas abaixo e ajuste:
        // const url = montarUrl(FIRE_WEEKLY_STATS, {
        //   dt: obterDataDeHoje()
        // })

        // Caso o endpoint seja chamado sem query params, mantenha assim:
        const url = montarUrl(FIRE_WEEKLY_STATS)

        const json = await buscarJson(url)
        // Retorna `json.dadosDiarios` se existir e for array, senão []
        return Array.isArray(json?.dadosDiarios) ? json.dadosDiarios : []
    } catch (error) {
        logErroFetch(error)
        return []
    }
}
