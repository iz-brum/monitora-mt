// services/hidrowebFetchBatch.js

import { authenticateHidroweb } from '#ana_services/hidrowebAuth.js';
import { fetchStationData } from '#ana_services/hidrowebStationData.js';
import { debugLog } from '#backend_utils/debugLog.js';

import { readFile } from 'fs/promises';
const inventoryRaw = await readFile(new URL('../../inventario/inventario_estacoes.json', import.meta.url));
const inventory = JSON.parse(inventoryRaw);

const BATCH_SIZE = 3;

async function fetchAllStationsInBatches() {
    const token = await authenticateHidroweb();
    const stationCodes = inventory.slice(0, 10).map(est => est.codigoestacao); // Apenas 10 para teste

    const results = [];

    for (let i = 0; i < stationCodes.length; i += BATCH_SIZE) {
        const batch = stationCodes.slice(i, i + BATCH_SIZE);

        debugLog('🚀 Iniciando batch', { batch });

        const batchResults = await Promise.allSettled(
            batch.map(code =>
                fetchStationData(token, {
                    station_code: code,
                    filtro_data: 'DATA_LEITURA',
                    data_busca: new Date().toISOString().slice(0, 10),
                    intervalo_busca: 'HORA_2'
                })
            )
        );

        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                results.push(result.value);

                // Log completo dos dados da estação
                const items = result.value.items || [];
                for (const item of items) {
                    debugLog('📊 Leitura registrada', item);
                }

            } else {
                debugLog('❌ Falha ao buscar estação', { erro: result.reason.message });
            }
        }
    }

    return results;
}

fetchAllStationsInBatches()