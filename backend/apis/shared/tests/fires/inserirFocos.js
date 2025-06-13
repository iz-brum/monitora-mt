import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import FireCache from '../../cache/fires/FireCache.js';

// Resolve caminho do arquivo de teste
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use um banco de teste local ao script:
const TEST_DB_PATH = path.join(__dirname, 'firecache-teste.db');
FireCache.dbPath = TEST_DB_PATH;
FireCache.ready = FireCache.initDb(); // Garante inicialização com o novo caminho

// Exemplo de focos de calor:
const focosTeste = [
    {
        latitude: 19.40508,
        longitude: -155.27209,
        bright_ti4: 341.46,
        bright_ti5: 313.35,
        scan: 0.54,
        track: 0.51,
        acq_date: '2025-05-21',
        acq_time: '0500',           // CSV style!
        satellite: 'N21',
        instrument: 'VIIRS',
        confidence: 'n',
        version: '2.0NRT',
        frp: 19.27,
        daynight: 'D',
        sensor: 'VIIRS_NOAA21_NRT', // ESSENCIAL PARA mapToFire
    },
    {
        latitude: -14.03884,
        longitude: -55.13611,
        brightness: 305.31,
        bright_t31: 291.44,
        scan: 1.9,
        track: 1.35,
        acq_date: '2025-05-20',
        acq_time: '1340',
        satellite: 'Terra',
        instrument: 'MODIS',
        confidence: '64',
        version: '6.1NRT',
        frp: 15.34,
        daynight: 'N',
        sensor: 'MODIS_NRT',        // ESSENCIAL PARA mapToFire
    }
];


async function run() {
    // Limpa antes de testar
    await FireCache.limparTodos();
    console.log('🧹 Cache limpo.');

    // Insere focos de teste
    await FireCache.insert(focosTeste, { cache_key: 'teste_manual' });
    console.log('✅ Focos inseridos no cache.');

    // Lista todos os registros do cache
    const todos = await FireCache.listarTodos();
    console.log('\n📋 Registros atuais no cache:');
    if (!todos || !Array.isArray(todos) || todos.length === 0) {
        console.warn('⚠️ Nenhum registro encontrado.');
    } else {
        console.table(
            todos.map(({ acq_date, acq_time, latitude, longitude, bright_ti4, bright_ti5, scan, track, satellite, instrument, confidence, version, frp, daynight }) => ({
                acq_date,
                acq_time,
                latitude,
                longitude,
                bright_ti4,
                bright_ti5,
                scan,
                track,
                satellite,
                confidence,
                version,
                frp,
                instrument,
                daynight
            }))
        );
    }

}

run();
