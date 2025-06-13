import fs from 'fs';
import path from 'path';
import { point, booleanPointInPolygon } from '@turf/turf';

// Carrega o GeoJSON com polígonos de municípios/CRs
const geoPath = path.resolve('./mapeamento-cr-simplificado.geojson');
const geojson = JSON.parse(fs.readFileSync(geoPath, 'utf8'));

// Coordenada de teste que está dentro do polígono
const foco = point([-55.37600, -14.55490]);

const correspondente = geojson.features.find(feature =>
    booleanPointInPolygon(foco, feature)
);

if (correspondente) {
    console.log('✅ Município:', correspondente.properties.name);
    console.log('   CR:', correspondente.properties.comandoRegional);
} else {
    console.warn('❌ Nenhum município encontrado para esse ponto.');
}
