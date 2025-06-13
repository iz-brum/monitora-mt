// apis/firms/utils/parseQuery.js

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

/**
 * Extrai e converte parâmetros de consulta HTTP.
 *
 * @param {Object} query - Parâmetros da requisição
 * @param {string} [query.dt] - Data inicial (YYYY-MM-DD)
 * @param {string} [query.dr] - Dias retroativos
 * @param {string} [query.hr] - Horas retroativas
 * @returns {Object} Parâmetros normalizados
 */
/**
 * Extrai e converte parâmetros de consulta HTTP.
 */
export const parseQuery = (query = {}) => {
  const { now, refDate } = initializeQueryParams(query)
  const isCurrentDay = refDate.format('YYYY-MM-DD') === now.format('YYYY-MM-DD')

  return query.hr
    ? processHourRange(refDate, parseInt(query.hr), isCurrentDay, now)
    : processDayRange(refDate, query.dr)
}

/**
 * Inicializa parâmetros base da consulta
 * @private
 */
function initializeQueryParams(query) {
  const now = dayjs.utc();

  if (!query.dt) return { now, refDate: now };

  const parsed = dayjs.utc(query.dt);
  const isValid =
    parsed.isValid() &&
    parsed.isAfter('1999-12-31') &&
    !parsed.isAfter(now); // ❗ rejeita datas futuras

  if (!isValid) {
    throw new Error('Data inválida');
  }

  return { now, refDate: parsed };
}

/**
 * Processa consulta baseada em horas
 * @private
 */
function processHourRange(refDate, hours, isCurrentDay, now) {
  const end = calculateEndTime(refDate, isCurrentDay, now)
  const start = end.subtract(hours, 'hour')
  return calculatePeriod(start, end)
}

/**
 * Processa consulta baseada em dias
 * @private
 */
function processDayRange(refDate, dayRange) {
  return {
    dayRange: dayRange ? parseInt(dayRange) : 1,
    date: refDate.format('YYYY-MM-DD')
  }
}

/**
 * Calcula o horário final com base no dia atual
 * @private
 */
function calculateEndTime(refDate, isCurrentDay, now) {
  return isCurrentDay
    ? refDate.hour(now.hour()).minute(now.minute())
    : refDate.endOf('day')
}

/**
 * Calcula período e dias necessários
 * @private
 */
function calculatePeriod(start, end) {
  const daysNeeded = start.format('YYYY-MM-DD') === end.format('YYYY-MM-DD') ? 1 : 2

  return {
    dayRange: daysNeeded,
    date: start.format('YYYY-MM-DD'),
    timeRange: {
      start: start.format(),
      end: end.format()
    }
  }
}
