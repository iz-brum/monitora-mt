import { authenticateHidroweb } from '#ana_services/hidrowebAuth.js';
import { fetchStationData } from '#ana_services/hidrowebStationData.js';
import { debugLog } from '#backend_utils/debugLog.js';
import { readFile } from 'fs/promises';

const inventoryRaw = await readFile(new URL('../inventario/inventario_estacoes.json', import.meta.url));
const inventory = JSON.parse(inventoryRaw);

const BATCH_SIZE = 5;
const HORAS_LIMITE = 5;

export async function fetchAllStationsInBatches() {
    const token = await authenticateHidroweb();
    const stationCodes = inventory.slice(0, 350).map(est => est.codigoestacao); // Limita para 20 estações

    const allItems = [];
    let estacoesComDados = 0;
    let estacoesSemDados = 0;
    let estacoesDesatualizadas = 0;

    for (let i = 0; i < stationCodes.length; i += BATCH_SIZE) {
        const batch = stationCodes.slice(i, i + BATCH_SIZE);

        debugLog('🚀 Iniciando batch', { batch });

        const batchResults = await Promise.allSettled(
            batch.map(code =>
                fetchStationData(token, {
                    station_code: code,
                    filtro_data: 'DATA_LEITURA',
                    data_busca: new Date().toISOString().slice(0, 10),
                    intervalo_busca: 'HORA_24'
                })
            )
        );

        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                const items = result.value?.items || [];

                if (items.length > 0) {
                    estacoesComDados++;
                    allItems.push(...items);

                    let todosDesatualizados = true;

                    for (const item of items) {
                        debugLog('📊 Leitura registrada', item);

                        const dataMedicao = new Date(item.Data_Hora_Medicao).getTime(); // Assume UTC-3
                        const agoraUTC = Date.now(); // UTC da máquina

                        // Corrige diferença de fuso: +1 hora (3600000 ms)
                        const diffHoras = Math.abs((agoraUTC - dataMedicao + 3600000) / 36e5);

                        if (diffHoras <= HORAS_LIMITE) {
                            todosDesatualizados = false;
                            break;
                        }
                    }

                    if (todosDesatualizados) {
                        estacoesDesatualizadas++;
                    }
                } else {
                    estacoesSemDados++;
                }
            } else {
                debugLog('❌ Falha ao buscar estação', { erro: result.reason.message });
            }
        }
    }

    return {
        meta: {
            totalEstacoesConsultadas: stationCodes.length,
            comDados: estacoesComDados,
            semDados: estacoesSemDados,
            desatualizadas: estacoesDesatualizadas,
            timestamp: new Date().toISOString()
        },
        dados: allItems
    };
}
