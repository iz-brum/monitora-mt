// backend/apis/shared/tests/cacheLocations/limparTodos.js

import LocationCache from '../../cache/locations/LocationCache.js';

function logCacheStatus(all) {
  if (all.length === 0) {
    console.log('✅ Cache limpo com sucesso!');
  } else {
    console.error('❌ Ainda existem registros no cache:', all);
  }
}

async function run() {
  try {
    console.log('🧹 Limpando todos os registros do cache...');
    await LocationCache.limparTodos();

    // Para confirmar que está limpo:
    const all = await LocationCache.listarTodos();
    logCacheStatus(all);
  } catch (error) {
    console.error('❌ Erro ao executar limparTodos:', error.message);
  }
  // finally opcional aqui, se precisar fechar algo depois
}

run().catch(e => {
    console.error('❌ Erro no teste:', e);
    // eslint-disable-next-line no-undef    
    process.exit(1);
});
