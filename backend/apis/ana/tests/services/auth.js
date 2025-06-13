/**
 * @file auth.js
 * @description Teste simples de autenticação com a API da ANA (HidroWeb)
 */

import { authenticateHidroweb, getCachedToken } from '#ana_services/hidrowebAuth.js';

(async () => {
  try {
    const token = await authenticateHidroweb();
    console.log('✅ Token obtido com sucesso (preview):', token.slice(0, 10) + '...');
  } catch (error) {
    console.error('❌ Erro ao autenticar na API ANA:', error.message);
  }

  const cached = getCachedToken();
  console.log('📦 Token em cache:', cached ? cached.slice(0, 10) + '...' : 'Nenhum token');
})();
