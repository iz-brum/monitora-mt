// apis/firms/utils/dateValidation.js
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

/**
 * 🚨 Todas as datas são interpretadas em UTC (fuso zero).
 * Garanta que o front-end e o back-end troquem datas normalizadas para UTC.
 */

export const DATE_CONFIG = {
  MAX_DAYS_IN_PAST: 10,
  MAX_DAYS_IN_FUTURE: 0
};

/**
 * Valida uma data base e seu intervalo, assumindo UTC+0 para todos os cálculos.
 *
 * @param {string} date - Data no formato YYYY-MM-DD (UTC)
 * @param {number} dayRange - Intervalo de dias (mínimo 1)
 * @throws {Error} Se a data for inválida, futura ou o range ultrapassar hoje em UTC
 * @returns {true} Se válida
 */
export function validateDateRange(date, dayRange = 1) {
  if (!date) return true;

  const queryDate = dayjs.utc(date);
  const now = dayjs.utc();

  if (!queryDate.isValid()) {
    throw new Error('Data inválida');
  }

  if (queryDate.isAfter(now)) {
    throw new Error('Data não pode ser futura');
  }

  if (dayRange > DATE_CONFIG.MAX_DAYS_IN_PAST) {
    throw new Error(`Intervalo máximo permitido é de ${DATE_CONFIG.MAX_DAYS_IN_PAST} dias`);
  }

  const endOfRange = queryDate.clone().add(dayRange - 1, 'day').endOf('day');
  const endOfToday = now.clone().endOf('day');

  if (endOfRange.isAfter(endOfToday)) {
    throw new Error('Intervalo solicitado termina no futuro');
  }

  return true;
}
