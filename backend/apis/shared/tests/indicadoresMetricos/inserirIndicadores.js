import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import FireService from '../../../firms/services/FireService.js';
import FireStatsService from '../../../firms/services/FireStatsService.js';
import { IndicadoresCache } from '../../cache/indicadoresMetricos/IndicadoresCache.js';

// Resolve o diretório do arquivo de teste dinamicamente (compatível com ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB_PATH = path.join(__dirname, 'indicadores-teste.db');

const cache = new IndicadoresCache(TEST_DB_PATH);

async function gerarIndicadoresParaDia(dt) {
  const fires = await FireService.listAll({ date: dt });

  if (!fires.length) {
    console.warn(`⚠️ Nenhum foco encontrado para o dia ${dt}`);
    return null;
  }

  // === MAPEAMENTO ESSENCIAL PARA FIRESTATSERVICE ===
  // Garante que cada registro tenha os campos esperados:
  // potenciaRadiativa e temperaturaBrilho
  const firesMapped = fires.map(f => ({
    ...f,
    potenciaRadiativa: f.fireRadiativePower ?? null,    // FRP
    temperaturaBrilho: f.brightnessTemp ?? null         // Temperatura
  }));

  // (Opcional: log para depuração)
  // console.log('\nExemplo de registro mapeado:', firesMapped[0]);

  // Estatísticas completas usando FireStatsService
  const statsFRP = FireStatsService.calculateFireRadiativePowerMetrics(firesMapped);
  const statsTemp = FireStatsService.aggregateBrightnessTemperatureData(firesMapped);

  const totalFocos = fires.length;
  const dataColeta = dayjs(dt).hour(12).minute(0).second(0).millisecond(0).toISOString();

  return {
    dataColeta,
    dia: dt,
    hora: '12:00',
    totalFocos,
    frpMedio: statsFRP.geral.frpMedio,
    frpMax: statsFRP.geral.frpMaximo,
    frpMin: statsFRP.geral.frpMinimo,
    temperaturaMedia: statsTemp.geral.temperaturaMedia,
    temperaturaMax: statsTemp.geral.tempMaxima,
    temperaturaMin: statsTemp.geral.tempMinima,
    totalFocosMax: totalFocos,  // Para granularidade diária, o valor é igual ao total
    totalFocosMin: totalFocos,  // Idem acima
    criadoEm: Date.now()
  };
}

async function run() {
  const dia1 = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const dia2 = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
  const dias = [dia1, dia2];
  let inseridos = 0;

  for (const dia of dias) {
    const indicadores = await gerarIndicadoresParaDia(dia);
    if (indicadores) {
      await cache.set(indicadores);
      console.log(`✅ Indicadores inseridos para o dia ${dia}:`);
      console.table(indicadores);
      inseridos++;
    }
  }

  if (!inseridos) {
    console.warn('⚠️ Nenhum indicador foi inserido. Verifique se há dados na FIRMS!');
  } else {
    const todos = await cache.listarTodos();
    console.log('\n📋 Registros atuais no cache:');
    console.table(todos.map(({ dataColeta, dia, totalFocos, frpMedio, frpMax, frpMin, temperaturaMedia, temperaturaMax, temperaturaMin }) => ({
      dataColeta, dia, totalFocos, frpMedio, frpMax, frpMin, temperaturaMedia, temperaturaMax, temperaturaMin
    })));
  }
}

run();
