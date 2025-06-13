/**
 * @file geospatial.js
 * @module apis/firms/utils/geospatial
 * @description Utilitários para carregar e manipular dados GeoJSON usando Turf.js.
 */

import fs from 'fs'
import path from 'path'
import * as turf from '@turf/turf'

/**
 * Carrega e parseia um arquivo GeoJSON a partir de um caminho relativo.
 *
 * @function loadGeoJson
 * @param {string} relativePath - Caminho relativo ao diretório raiz do projeto.
 *                                Exemplo: 'public/assets/geoRef/br_mt.json'.
 * @returns {Object} GeoJSON - objeto GeoJSON parseado.
 * @throws {Error} Lança erro caso o arquivo não exista ou não seja um JSON válido.
 *
 * @example
 * const geojson = loadGeoJson('public/assets/geoRef/br_mt.json')
 */
export function loadGeoJson(relativePath) {
  // eslint-disable-next-line no-undef
  const fullPath = path.resolve(process.cwd(), relativePath)
  const content = fs.readFileSync(fullPath, 'utf8')
  return JSON.parse(content)
}

/**
 * Calcula o bounding box ([west, south, east, north]) para um dado GeoJSON.
 *
 * @function computeBbox
 * @param {Object} geojson - Objeto GeoJSON válido (Feature ou FeatureCollection).
 * @returns {number[]} bbox - Array numérico [west, south, east, north].
 * @throws {Error} Pode lançar erro se o GeoJSON for inválido ou não tiver geometria.
 *
 * @example
 * const bbox = computeBbox(geojson)
 * // [-63.0, -18.5, -49.0, -7.0]
 */
export function computeBbox(geojson) {
  return turf.bbox(geojson)
}

/**
 * Extrai features do GeoJSON
 * @private
 */
function extractFeatures(geojson) {
  return geojson.features || []
}

/**
 * Valida se há features disponíveis
 * @private
 */
function validateFeaturesLength(features) {
  if (features.length === 0) {
    throw new Error('GeoJSON sem features para unir')
  }
  return features
}

/**
 * Valida e retorna os features de um GeoJSON
 * @private
 */
function validateFeatures(geojson) {
  const features = extractFeatures(geojson)
  return validateFeaturesLength(features)
}

/**
 * Une múltiplos features usando Turf.js
 * @private
 */
function uniteFeatures(features) {
  return features.length === 1
    ? features[0]
    : features.reduce((acc, feat) => turf.union(acc, feat))
}

/**
 * Une múltiplos features de um GeoJSON em um único feature (polígono).
 * Caso tenha apenas um feature, retorna o próprio.
 *
 * @function unionFeatures
 * @param {Object} geojson - GeoJSON FeatureCollection contendo múltiplos features.
 * @returns {Object} GeoJSON Feature - Feature resultante da união dos features fornecidos.
 * @throws {Error} Caso o GeoJSON não contenha nenhum feature válido.
 *
 * @example
 * const unifiedPolygon = unionFeatures(geojson)
 */
export function unionFeatures(geojson) {
  const features = validateFeatures(geojson)
  return uniteFeatures(features)
}
