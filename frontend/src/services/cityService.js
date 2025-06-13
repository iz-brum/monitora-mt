// src/services/cityService.js

import { montarUrl, buscarJson, logErroFetch, obterDataDeHoje, obterDataDeOntem } from '../utils/api.js'

/**
 * Serviços relacionados ao “Ranking de Municípios” (lista de cidades com focos de calor no dia).
 *
 * Este módulo implementa a mesma função `buscarCidadesComFocos` que antes vivia em
 * `indicadoresService.js`, só que agora extraída para responsabilidade única.
 *
 * Fluxo:
 *  1) Chama o endpoint `/api/firms/fires/stats?q=fpc&dt=YYYY-MM-DD`
 *  2) Valida se a resposta JSON tem a estrutura esperada (`focosPorCidade.todasCidadesOrdenadas`)
 *  3) Retorna aquele array (presumidamente já em ordem decrescente), para ser consumido pelo componente.
 *
 * IMPORTANTE: O componente `CidadesTopCard` espera receber um array de objetos
 * onde cada objeto tem ao menos as propriedades:
 *   - city.cidade      (string, ex.: "Santa Carmem")
 *   - city.totalFocos  (number, ex.: 65)
 *
 * Se o back-end enviar exatamente esse formato dentro de
 * `focosPorCidade.todasCidadesOrdenadas`, basta retorná-lo diretamente. Caso
 * seja um array de strings, será necessário adaptar (mas aqui vamos assumir que
 * vem [{ cidade: "...", totalFocos: N }, ...]).
 *
 * Supondo, portanto, a seguinte resposta do back-end:
 * {
 *   "focosPorCidade": {
 *     "todasCidadesOrdenadas": [
 *       { "cidade": "Santa Carmem",        "totalFocos": 65 },
 *       { "cidade": "Santa Cruz do Xingu", "totalFocos": 47 },
 *       ...
 *     ]
 *   }
 * }
 */

// ——— Validações de JSON ——————————————————————————————————————————————

/** Checa se o JSON não é nulo/undefined e é objeto (não array) */
function jsonEhObjeto(json) {
  return json != null && typeof json === 'object' && !Array.isArray(json)
}

/** Verifica se existe a propriedade "focosPorCidade" */
function jsonTemFocosPorCidade(json) {
  return jsonEhObjeto(json) && Object.prototype.hasOwnProperty.call(json, 'focosPorCidade')
}

/** Dentro de "focosPorCidade", verifica se há "todasCidadesOrdenadas" */
function focosPorCidadeTemTodasCidades(json) {
  return (
    jsonTemFocosPorCidade(json) &&
    json.focosPorCidade != null &&
    Object.prototype.hasOwnProperty.call(json.focosPorCidade, 'todasCidadesOrdenadas')
  )
}

/** Garante que `json.focosPorCidade.todasCidadesOrdenadas` seja um array (ou retorna array vazio) */
function extrairListaDeCidades(json) {
  if (!focosPorCidadeTemTodasCidades(json)) {
    return []
  }
  const lista = json.focosPorCidade.todasCidadesOrdenadas
  return Array.isArray(lista) ? lista : []
}

// ——— Função principal exportada ——————————————————————————————————————

/**
 * Busca a lista de cidades com focos de calor no dia de hoje, já em ordem decrescente.
 *
 * @returns {Promise<Array<{ cidade: string, totalFocos: number }>>}
 *   Exemplo de retorno esperado:
 *     [
 *       { cidade: "Santa Carmem",        totalFocos: 65 },
 *       { cidade: "Santa Cruz do Xingu", totalFocos: 47 },
 *       ...
 *     ]
 */
export async function buscarCidadesComFocos() {
  try {
    const url = montarUrl('/api/firms/fires/stats', {
      // dt: obterDataDeOntem(),
      dt: obterDataDeHoje(), // // (DES)COMENTAR PARA OBTER DATA CORRENTE
      q: 'fpc' // "focos por cidade"
    })
    const json = await buscarJson(url)
    return extrairListaDeCidades(json)
  } catch (error) {
    logErroFetch(error)
    return []
  }

}
