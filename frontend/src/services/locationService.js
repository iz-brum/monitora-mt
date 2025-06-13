// src/services/locationService.js

import {
  montarUrl,
  buscarJson,
  logErroFetch,
  obterDataDeHoje,
} from '../utils/api.js'
import { normalizeString } from '@utils/normalizeCityName'

/**
 * Endpoint de focos com coordenadas (INPE/FIRMS)
 * Estrutura: GET /api/firms/fires/locations?dt=YYYY-MM-DD
 */
const FIRE_LOCATIONS = '/api/firms/fires/locations'

/** Verifica se json.dados existe e é um array */
function dadosSaoValidos(json) {
  return Array.isArray(json?.dados)
}

/** Extrai json.dados ou retorna array vazio */
function extrairDadosOuVazio(json) {
  return dadosSaoValidos(json) ? json.dados : []
}

/**
 * Busca todos os focos de calor do dia, retornando array de objetos com
 * latitude, longitude, intensity e, em localizacao, nome da cidade etc.
 *
 * @returns {Promise<Array<object>>}
 */
export async function buscarFocosComLocalizacao() {
  try {
    const url = montarUrl(FIRE_LOCATIONS, {
      dt: obterDataDeHoje(),
    })
    const json = await buscarJson(url)
    return extrairDadosOuVazio(json)
  } catch (error) {
    logErroFetch(error)
    return []
  }
}

/**
 * Dada uma lista “focos” (cada foco tem .localizacao.cidade) e o nome de uma cidade,
 * encontra as coordenadas [lat, lng] da cidade, procurando primeiro em 
 * localizacao.outros_dados.features (GeoJSON) e, se não achar, usando
 * latitude/longitude diretos do próprio foco.
 *
 * @param {Array<object>} focos       Lista de focos obtida por buscarFocosComLocalizacao()
 * @param {string} nomeCidade         Nome “original” da cidade a buscar
 * @returns {{ lat: number, lng: number } | null}
 */
export function encontrarCoordenadasCidade(focos, nomeCidade) {
  const nomeCidadeNorm = normalizeString(nomeCidade)

  // Tenta achar o primeiro foco cuja cidade normalizada bate com nomeCidadeNorm
  const foco = focos.find((f) =>
    f.localizacao &&
    f.localizacao.cidade &&
    normalizeString(f.localizacao.cidade) === nomeCidadeNorm
  )

  if (!foco) {
    return null
  }

  // Verifica se, em foco.localizacao.outros_dados.features, há um GeoJSON “place”
  const features = foco.localizacao?.outros_dados?.features
  if (Array.isArray(features)) {
    const featCidade = features.find(
      (f) => f.properties?.feature_type === 'place'
    )
    if (featCidade && featCidade.geometry?.coordinates) {
      // GeoJSON traz [lng, lat]
      return {
        lat: featCidade.geometry.coordinates[1],
        lng: featCidade.geometry.coordinates[0],
      }
    }
  }

  // Fallback: usa diretamente latitude/longitude do próprio foco
  return {
    lat: foco.latitude,
    lng: foco.longitude,
  }
}
