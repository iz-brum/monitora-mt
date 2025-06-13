// apis/firms/utils/format.js

// IMPORTE ASSIM: #firms_utils/format.js

/**
 * toNumber
 * --------
 * Converte uma string ou valor numérico em número de ponto flutuante,
 * retornando undefined se o valor for null ou undefined.
 *
 * @param {string|number|null|undefined} v - Valor a ser convertido
 * @returns {number|undefined} Número convertido ou undefined
 *
 * @example
 * toNumber("123.45") // => 123.45
 * toNumber(67)        // => 67
 * toNumber(null)      // => undefined
 */
export function toNumber(v) {
  return v != null ? parseFloat(v) : undefined
}  

