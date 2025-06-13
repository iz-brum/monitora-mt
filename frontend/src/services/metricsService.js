// src/services/metricsService.js

import {
  montarUrl,
  buscarJson,
  logErroFetch,
  obterDataDeHoje,
  // obterDataDeOntem, → descomente se precisar usar ontem em vez de hoje
} from '../utils/api.js';

/**
 * Serviços relacionados aos indicadores métricos de focos de calor:
 *   - Busca “atual” e “anterior” (métricas como FRP, TDB, etc.)
 *   - Normaliza o JSON retornado para um objeto { atual: number|null, anterior: number|null }
 *
 * Exemplo de endpoint esperado:
 *   GET /api/firms/fires/stats?dt=YYYY-MM-DD&q=frp,tdb,hdp,crbm
 * Retorno esperado:
 *   {
 *     "resumo": {
 *       "atual": <numero>,
 *       "anterior": <numero>
 *     }
 *   }
 */

/** Helpers para validação de JSON **/

const jsonEhNulo = (json) => json == null;
const jsonEhObjeto = (json) => typeof json === 'object' && !Array.isArray(json);

/** Verifica se existe a propriedade “resumo” no JSON */
const jsonTemPropriedadeResumo = (json) =>
  Object.prototype.hasOwnProperty.call(json, 'resumo');

/** Combina as validações para garantir que “resumo” exista */
const jsonTemResumo = (json) =>
  !jsonEhNulo(json) && jsonEhObjeto(json) && jsonTemPropriedadeResumo(json);

/**
 * Retorna o objeto “resumo” ou {} caso não exista/no formato errado.
 * @param {any} jsonResposta 
 * @returns {Object}
 */
export function obterResumo(jsonResposta) {
  return jsonTemResumo(jsonResposta) ? jsonResposta.resumo : {};
}

/**
 * Converte valores undefined/NaN para null, para evitar erros em cálculos.
 * @param {any} valor 
 * @returns {number|null}
 */
function normalizarValor(valor) {
  return valor ?? null;
}

/**
 * Mapeia o resumo bruto para { atual: number|null, anterior: number|null }
 * @param {Object} resumoBruto 
 * @returns {{ atual: number|null, anterior: number|null }}
 */
function mapearResumo(resumoBruto) {
  return {
    atual: normalizarValor(resumoBruto.atual),
    anterior: normalizarValor(resumoBruto.anterior),
  };
}

/**
 * Extrai e normaliza dados de “resumo” da resposta JSON.
 * @param {any} jsonResposta 
 * @returns {{ atual: number|null, anterior: number|null }}
 */
export function extrairResumo(jsonResposta) {
  const resumo = obterResumo(jsonResposta);
  return mapearResumo(resumo);
}

/**
 * Busca os indicadores métricos (atual vs. anterior) e dispara callbacks para atualizá-los.
 * 
 * @param { (valor: number|null) => void } setDadosAtuais     Callback para valor “atual”
 * @param { (valor: number|null) => void } setDadosAnteriores  Callback para valor “anterior”
 */
export async function fetchDados(setDadosAtuais, setDadosAnteriores) {
  try {
    const url = montarUrl('/api/firms/fires/stats', {
      dt: obterDataDeHoje(),
      q: 'frp,tdb,hdp,crbm',
    });

    const json = await buscarJson(url);
    const { atual, anterior } = extrairResumo(json);

    setDadosAtuais(atual);
    setDadosAnteriores(anterior);
  } catch (error) {
    logErroFetch(error);
    setDadosAtuais(null);
    setDadosAnteriores(null);
  }
}
