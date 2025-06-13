// backend/apis/firms/services/GeoMunicipalityMatcher.js

import fs from 'fs'
import path from 'path'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'

/**
 * 📍 GeoMunicipalityMatcher
 *
 * Serviço para localizar o município e comando regional de uma coordenada
 * geográfica com base em um arquivo GeoJSON local.
 *
 * Utiliza operações de ponto-em-polígono para detectar a sobreposição.
 */
class GeoMunicipalityMatcher {
    static #geojsonCache = null

    /**
     * 🗂️ loadGeoJSON
     *
     * Carrega e cacheia o GeoJSON contendo os limites municipais.
     * Lê o arquivo apenas uma vez, salvo em cache.
     */
    static loadGeoJSON() {
        if (this.#geojsonCache) {
            return this.#geojsonCache;
        }

        const geojsonPath = path.resolve('public/assets/geoRef/municipios_por_comando_regional_colorido.geojson');

        try {
            const raw = fs.readFileSync(geojsonPath, 'utf8');
            this.#geojsonCache = JSON.parse(raw);
        } catch (err) {
            console.error('❌ Erro ao carregar GeoJSON de municípios:', err.message);
            this.#geojsonCache = { features: [] };
        }

        return this.#geojsonCache;
    }

    /**
     * 📌 findMunicipality
     *
     * Retorna o nome do município e comando regional onde a coordenada está.
     *
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Object|null} Ex: { municipio: 'CUIABÁ', comandoRegional: 'CR BM I' }
     */
    static findMunicipality(latitude, longitude) {
        const geojson = this.loadGeoJSON()
        const pt = point([longitude, latitude])

        for (const feature of geojson.features) {
            if (booleanPointInPolygon(pt, feature)) {
                const rawName = feature.properties?.name;
                const municipio = (typeof rawName === 'string' ? rawName.toUpperCase() : 'N/A');
                const comandoRegional = feature.properties?.comandoRegional ?? 'NÃO ASSOCIADO';
                
                return { municipio, comandoRegional };
            }
        }

        return null
    }

    /**
     * 🧪 batchLocate
     *
     * Processa um array de pontos, agregando dados de localização a cada item.
     *
     * @param {Array<{latitude: number, longitude: number, fireData: Object}>} points
     * @returns {Array<Object>} Array com os objetos { ...fireData, localizacao }
     */
    static batchLocate(points) {
        return points.map(({ latitude, longitude, fireData }) => {
            const localizacao = this.findMunicipality(latitude, longitude)
            return {
                ...fireData,
                localizacao
            }
        })
    }
}

export default GeoMunicipalityMatcher
