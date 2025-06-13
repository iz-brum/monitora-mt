// fireService_location_match.test.js
import fs from 'fs';
import path from 'path';
import { point, booleanPointInPolygon } from '@turf/turf';

/**
 * Simula um serviço local de localização baseado em GeoJSON
 */
class GeoMunicipalityMatcher {
    constructor(geojsonFilePath) {
        const raw = fs.readFileSync(geojsonFilePath, 'utf-8');
        this.geojson = JSON.parse(raw);
    }

    /**
     * Retorna o município ao qual as coordenadas pertencem
     * @param {number} latitude 
     * @param {number} longitude 
     * @returns {Object|null}
     */
    findMunicipality(latitude, longitude) {
        const pt = point([longitude, latitude]);

        for (const feature of this.geojson.features) {
            if (booleanPointInPolygon(pt, feature.geometry)) {
                const { name, comandoRegional } = feature.properties;
                return { municipio: name, comandoRegional };
            }
        }
        return null;
    }
}

// === TESTE SIMPLES ===

const geojsonPath = path.resolve('./municipios_por_comando_regional_colorido.geojson'); // ajuste se necessário
const matcher = new GeoMunicipalityMatcher(geojsonPath);

const testLat = -14.5549;
const testLon = -55.3751;

const result = matcher.findMunicipality(testLat, testLon);

if (result) {
    console.log('✅ Município:', result.municipio);
    console.log('   CR:', result.comandoRegional);
} else {
    console.error('❌ Nenhum município encontrado para esta coordenada');
}
