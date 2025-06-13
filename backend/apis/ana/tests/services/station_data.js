/**
 * @file station_data.js
 * @description Teste da busca de dados de estação da API ANA
 */

import { authenticateHidroweb } from '#ana_services/hidrowebAuth.js';
import { fetchStationData } from '#ana_services/hidrowebStationData.js';

(async () => {
  try {
    const token = await authenticateHidroweb();

    const result = await fetchStationData(token, {
      station_code: '15043000',
      filtro_data: 'DATA_LEITURA',
      data_busca: '2024-06-06',
      intervalo_busca: 'HORA_2'
    });

    console.log('✅ Resultado:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Erro no teste:', err.message);
  }
})();
