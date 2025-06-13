import axios from 'axios';
import dotenv from 'dotenv';
import { debugLog } from '#backend_utils/debugLog.js';

dotenv.config();

const HIDROWEB_BASE_URL = 'https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas/OAUth/v1';
let authToken = null;

export async function authenticateHidroweb(retries = 3, delay = 2000) {
  const username = process.env.HIDROWEB_USERNAME;
  const password = process.env.HIDROWEB_PASSWORD;

  if (!username || !password) {
    throw new Error('Credenciais HIDROWEB não definidas no .env');
  }

  const headers = {
    Identificador: username,
    Senha: password,
    Accept: '*/*'
  };

  try {
    const startTime = Date.now();
    const response = await axios.get(HIDROWEB_BASE_URL, {
      headers,
      timeout: 10000 // ⏱️ Aumentado para 10s
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    debugLog('⏱️ Tempo total para autenticação ANA (s):', { tempo: duration });

    const data = response.data;

    if (data?.items?.tokenautenticacao) {
      authToken = data.items.tokenautenticacao;
      debugLog('🔐 Token ANA obtido com sucesso', { tokenPreview: authToken.slice(0, 10) + '...' });
      return authToken;
    }

    throw new Error('Resposta inválida: tokenautenticacao ausente');

  } catch (err) {
    debugLog('⚠️ Erro na autenticação ANA', {
      tentativa: 4 - retries,
      mensagem: err.message
    });

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return authenticateHidroweb(retries - 1, delay * 2); // ⏱️ Backoff exponencial
    }

    throw new Error(`❌ Falha ao autenticar após várias tentativas: ${err.message}`);
  }
}

export function getCachedToken() {
  return authToken;
}
