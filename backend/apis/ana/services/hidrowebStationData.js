/**
 * @file hidrowebStationData.js
 * @description Consulta dados telemétricos de estações da API HidroWeb da ANA
 */

import axios from 'axios';
import { debugLog } from '#backend_utils/debugLog.js';

const BASE_URL = 'https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v1';

/**
 * Busca dados de uma estação da ANA
 * @param {string} token - Token JWT para autenticação
 * @param {Object} options - Parâmetros da busca
 * @param {string} options.station_code - Código da estação
 * @param {string} options.filtro_data - Tipo do filtro de data (ex: DATA_LEITURA)
 * @param {string} options.data_busca - Data inicial (formato YYYY-MM-DD)
 * @param {string} options.intervalo_busca - Intervalo de busca (ex: HORA_2)
 * @returns {Promise<Object>} Resultado da API
 */
export async function fetchStationData(token, {
    station_code,
    filtro_data,
    data_busca,
    intervalo_busca
}) {
    if (!token) throw new Error('Token não fornecido. Autentique-se antes.');

    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: '*/*'
    };

    const params = {
        'Código da Estação': station_code,
        'Tipo Filtro Data': filtro_data,
        'Data de Busca (yyyy-MM-dd)': data_busca,
        'Range Intervalo de busca': intervalo_busca
    };


    try {
        const response = await axios.get(BASE_URL, {
            headers,
            params,
            timeout: 10000
        });

        handleResponseStatus(response);

        const data = response.data;

        if (!data?.items?.length) {
            debugLog('ℹ️ Nenhum dado encontrado para a estação', { station_code });
            return { status: 'OK', message: 'Nenhum dado encontrado', items: [] };
        }

        debugLog('✅ Dados recebidos da estação', {
            station_code,
            qtd: data.items.length
        });

        return data;

    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data
            ? JSON.stringify(error.response.data)
            : error.message;

        if (status === 401) throw new Error(`Erro de autenticação (401): ${msg}`);
        if (status === 406) throw new Error(`Parâmetro inválido (406): ${msg}`);
        if (status === 417) throw new Error(`Expectativa falhou (417): ${msg}`);
        if (status === 500) throw new Error(`Erro no servidor (500): ${msg}`);

        throw new Error(`Erro ao buscar dados da estação: ${msg}`);
    }
}

function handleResponseStatus(response) {
    if (response.status !== 200) {
        throw new Error(`Status inesperado da resposta: ${response.status}`);
    }
}
