/* eslint-env node */
import GeocodingService from '../../../firms/services/GeocodingService.js';

function printLocationHeader(index, coord) {
    console.log(`\n(${index + 1}) Resultado completo para a coordenada [${coord.latitude}, ${coord.longitude}]:`);
}

function printLocationResult(index, coord, local) {
    printLocationHeader(index, coord);
    console.table(local);
}

function printLocation(index, coord, local) {
    printLocationResult(index, coord, local);
}

function printLocationError(index, coord, error) {
    console.error(`(${index + 1}) Erro ao buscar coordenada`, coord, error.message);
}

async function processCoordinate(coord, index) {
    try {
        const local = await GeocodingService.getLocation(coord);
        printLocation(index, coord, local);
    } catch (err) {
        printLocationError(index, coord, err);
    }
}

async function run() {
    const coordenadas = [
        { latitude: -15.601410, longitude: -56.097892 },
        { latitude: -14.067070, longitude: -57.182320 },
        { latitude: -12.729844, longitude: -60.131304 },
        { latitude: -13.016578, longitude: -55.262090 },
        { latitude: -11.856878, longitude: -55.501968 },
        { latitude: -17.329700, longitude: -54.757400 },
        { latitude: -16.075100, longitude: -53.537150 },
        { latitude: -10.337741, longitude: -54.928619 },
        { latitude: -15.078440, longitude: -58.224700 },
        { latitude: -17.313670, longitude: -50.939900 }
    ];

    console.log('\n⏳ Iniciando teste de geocodificação das 10 coordenadas (Mato Grosso)...');
    const start = Date.now();

    for (let i = 0; i < coordenadas.length; i++) {
        await processCoordinate(coordenadas[i], i);
    }

    const end = Date.now();
    console.log(`\n⏱️ Tempo total para 10 coordenadas: ${((end - start) / 1000).toFixed(2)} segundos\n`);
    console.log('✅ Teste finalizado.');
}

run().catch(e => {
    console.error('❌ Erro no teste:', e);
    // eslint-disable-next-line no-undef    
    process.exit(1);
});
