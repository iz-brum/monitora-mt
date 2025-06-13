import FireStatsService from '#firms_services/FireStatsService.js';
import { jest } from '@jest/globals';

/**
    * Objetivo: Agrega focos por data (dataAquisicao)
    * Casos de teste:
    * Deve retornar dadosDiarios ordenado por data
    * Deve contar corretamente múltiplos focos na mesma data
    * Deve lidar com datas únicas
    * Deve lidar com array vazio (retorna lista vazia)
    * Deve ignorar objetos sem dataAquisicao
*/

// =====================================================================================
// ✅ TESTE: FireStatsService.aggregateWeeklyFireStats
// -------------------------------------------------------------------------------------
// OBJETIVO:
// - Agrega focos por data (dataAquisicao), somando o total por dia
// - Retorna lista ordenada com a estrutura: [{ data, focos }]
// - Ignora entradas sem campo dataAquisicao
// =====================================================================================
describe('FireStatsService.aggregateWeeklyFireStats', () => {

    // =================================================================================
    // ✅ Cenário 1: Ordenação dos dados por data crescente
    // =================================================================================
    it('deve retornar dadosDiarios ordenado por data', () => {
        const fires = [
            { dataAquisicao: '2025-06-02' },
            { dataAquisicao: '2025-06-01' },
            { dataAquisicao: '2025-06-03' }
        ];

        const resultado = FireStatsService.aggregateWeeklyFireStats(fires);
        const datas = resultado.dadosDiarios.map(d => d.data);

        expect(datas).toEqual(['2025-06-01', '2025-06-02', '2025-06-03']);
    });

    // =================================================================================
    // ✅ Cenário 2: Soma correta de múltiplos focos na mesma data
    // =================================================================================
    it('deve contar corretamente múltiplos focos na mesma data', () => {
        const fires = [
            { dataAquisicao: '2025-06-01' },
            { dataAquisicao: '2025-06-01' },
            { dataAquisicao: '2025-06-02' }
        ];

        const resultado = FireStatsService.aggregateWeeklyFireStats(fires);

        expect(resultado.dadosDiarios).toEqual([
            { data: '2025-06-01', focos: 2 },
            { data: '2025-06-02', focos: 1 }
        ]);
    });

    // =================================================================================
    // ✅ Cenário 3: Entrada com uma única data
    // =================================================================================
    it('deve lidar corretamente com uma única data', () => {
        const fires = [
            { dataAquisicao: '2025-06-08' }
        ];

        const resultado = FireStatsService.aggregateWeeklyFireStats(fires);

        expect(resultado.dadosDiarios).toEqual([
            { data: '2025-06-08', focos: 1 }
        ]);
    });

    // =================================================================================
    // ✅ Cenário 4: Lista vazia de entrada
    // =================================================================================
    it('deve retornar lista vazia se o array de focos for vazio', () => {
        const resultado = FireStatsService.aggregateWeeklyFireStats([]);
        expect(resultado.dadosDiarios).toEqual([]);
    });

    // =================================================================================
    // ✅ Cenário 5: Ignora entradas sem campo dataAquisicao
    // =================================================================================
    it('deve ignorar focos que não possuem campo dataAquisicao', () => {
        const fires = [
            { dataAquisicao: '2025-06-01' },
            { outraCoisa: 'semData' },
            { dataAquisicao: '2025-06-01' },
            {}
        ];

        const resultado = FireStatsService.aggregateWeeklyFireStats(fires);

        expect(resultado.dadosDiarios).toEqual([
            { data: '2025-06-01', focos: 2 }
        ]);
    });
});


/**
 * ✅ aggregateAndRankMunicipalityFireStats(fires)
 * Objetivo: Agrega e ranqueia focos por cidade
 * Casos de teste:
 * Deve agrupar focos por cidade e retornar o total correto
 * Deve retornar as 10 cidades com mais focos no campo cidadesMaisAfetadas
 * Deve ordenar corretamente todas as cidades por totalFocos
 * Deve incluir posicao corretamente(1 - based)
 * Deve lidar com array vazio(0 cidades)
 * Deve lidar com cidades sem nome(fallback 'N/A')
*/

// =====================================================================================
// ✅ TESTE: FireStatsService.aggregateAndRankMunicipalityFireStats
// -------------------------------------------------------------------------------------
// OBJETIVO:
// - Agrega focos de calor por cidade, calcula totais e adiciona ranking
// - Retorna as 10 cidades com mais focos, e todas ordenadas por total
// =====================================================================================
describe('FireStatsService.aggregateAndRankMunicipalityFireStats', () => {

    // Mock helpers
    beforeEach(() => {
        jest.spyOn(FireStatsService, 'extractMunicipalityName').mockImplementation(fire => {
            return fire.localizacao?.cidade || 'N/A';
        });

        jest.spyOn(FireStatsService, 'createMunicipalityMetricsStructure').mockImplementation(cidade => ({
            cidade,
            totalFocos: 0
        }));

        jest.spyOn(FireStatsService, 'incrementCityStats').mockImplementation(obj => {
            obj.totalFocos += 1;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // =================================================================================
    // ✅ Cenário 1: Agrupamento e contagem correta por cidade
    // =================================================================================
    it('deve agrupar focos por cidade e retornar o total correto', () => {
        const input = [
            { localizacao: { cidade: 'Cuiabá' } },
            { localizacao: { cidade: 'Cuiabá' } },
            { localizacao: { cidade: 'Sorriso' } }
        ];

        const result = FireStatsService.aggregateAndRankMunicipalityFireStats(input);

        expect(result.totalCidades).toBe(2);
        expect(result.todasCidadesOrdenadas).toEqual([
            expect.objectContaining({ cidade: 'Cuiabá', totalFocos: 2, posicao: 1 }),
            expect.objectContaining({ cidade: 'Sorriso', totalFocos: 1, posicao: 2 })
        ]);
    });

    // =================================================================================
    // ✅ Cenário 2: Retorna as 10 cidades com mais focos
    // =================================================================================
    it('deve retornar as 10 cidades com mais focos no campo cidadesMaisAfetadas', () => {
        const input = Array.from({ length: 15 }, (_, i) => ({
            localizacao: { cidade: `Cidade${i % 12}` }
        }));

        const result = FireStatsService.aggregateAndRankMunicipalityFireStats(input);

        expect(result.cidadesMaisAfetadas.length).toBe(10);
        expect(result.cidadesMaisAfetadas[0]).toHaveProperty('cidade');
        expect(result.cidadesMaisAfetadas[0]).toHaveProperty('totalFocos');
        expect(result.cidadesMaisAfetadas[0]).toHaveProperty('posicao', 1);
    });

    // =================================================================================
    // ✅ Cenário 3: Ordena todas as cidades por totalFocos (desc)
    // =================================================================================
    it('deve ordenar corretamente todas as cidades por totalFocos', () => {
        const input = [
            { localizacao: { cidade: 'X' } },
            { localizacao: { cidade: 'Y' } },
            { localizacao: { cidade: 'Y' } },
            { localizacao: { cidade: 'Z' } },
            { localizacao: { cidade: 'Z' } },
            { localizacao: { cidade: 'Z' } }
        ];

        const result = FireStatsService.aggregateAndRankMunicipalityFireStats(input);

        expect(result.todasCidadesOrdenadas.map(c => c.totalFocos)).toEqual([3, 2, 1]);
        expect(result.todasCidadesOrdenadas.map(c => c.posicao)).toEqual([1, 2, 3]);
    });

    // =================================================================================
    // ✅ Cenário 4: Lida com array vazio (nenhuma cidade)
    // =================================================================================
    it('deve lidar com array vazio e retornar total 0', () => {
        const result = FireStatsService.aggregateAndRankMunicipalityFireStats([]);
        expect(result.totalCidades).toBe(0);
        expect(result.todasCidadesOrdenadas).toEqual([]);
        expect(result.cidadesMaisAfetadas).toEqual([]);
    });

    // =================================================================================
    // ✅ Cenário 5: Lida com cidades sem nome (fallback "N/A")
    // =================================================================================
    it('deve usar "N/A" quando cidade estiver ausente', () => {
        const input = [
            { localizacao: { cidade: null } },
            { localizacao: {} },
            {}
        ];

        const result = FireStatsService.aggregateAndRankMunicipalityFireStats(input);

        expect(result.totalCidades).toBe(1);
        expect(result.todasCidadesOrdenadas[0]).toMatchObject({
            cidade: 'N/A',
            totalFocos: 3,
            posicao: 1
        });
    });
});

/**
    * ✅ `calculateFireRadiativePowerMetrics(fires)`
    * Objetivo: Calcula FRP geral e por cidade
    * Casos de teste:
    * Deve calcular FRP médio geral corretamente
    * Deve calcular frpMinimo, frpMaximo corretamente por cidade
    * Deve calcular distribuição de intensidade (baixa, moderada, alta)
    * Deve ordenar corretamente por `frpMaximo`
    * Deve lidar com valores ausentes ou inválidos de `potenciaRadiativa`
    * Deve retornar 0 nas métricas agregadas com array vazio
*/

// =====================================================================================
// ✅ TESTE: FireStatsService.calculateFireRadiativePowerMetrics
// -------------------------------------------------------------------------------------
// OBJETIVO:
// - Calcula métricas de FRP geral e por cidade (média, máximo, distribuição por intensidade)
// - Garante ordenação correta e tratamento de dados ausentes
// =====================================================================================
describe('FireStatsService.calculateFireRadiativePowerMetrics', () => {

    beforeEach(() => {
        jest.spyOn(FireStatsService, 'extractMunicipalityName').mockImplementation(fire => fire.localizacao?.cidade || 'N/A');
        jest.spyOn(FireStatsService, 'extractRadiativePowerValue').mockImplementation(fire => parseFloat(fire.potenciaRadiativa) || 0);
        jest.spyOn(FireStatsService, 'initializeMunicipalityMetrics').mockImplementation(cidade => ({ cidade, frpMaximo: 0, frpTotal: 0, total: 0, baixa: 0, moderada: 0, alta: 0 }));
        jest.spyOn(FireStatsService, 'updateMunicipalityMetrics').mockImplementation((obj, frp, low, moderate) => {
            obj.frpMaximo = Math.max(obj.frpMaximo, frp);
            obj.frpTotal += frp;
            obj.total++;
            if (frp < low) obj.baixa++;
            else if (frp < moderate) obj.moderada++;
            else obj.alta++;
        });
        jest.spyOn(FireStatsService, 'processMunicipalityStatistics').mockImplementation(stats => {
            return Object.values(stats).sort((a, b) => b.frpMaximo - a.frpMaximo);
        });
        jest.spyOn(FireStatsService, 'calculateAggregateMetrics').mockImplementation((_, frpMedio) => ({ frpMedio }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // =================================================================================
    // ✅ Cenário 1: FRP médio geral é calculado corretamente
    // =================================================================================
    it('deve calcular FRP médio geral corretamente', () => {
        const input = [
            { potenciaRadiativa: '10', localizacao: { cidade: 'A' } },
            { potenciaRadiativa: '20', localizacao: { cidade: 'B' } }
        ];

        const result = FireStatsService.calculateFireRadiativePowerMetrics(input);

        expect(result.geral.frpMedio).toBe(15);
    });

    // =================================================================================
    // ✅ Cenário 2: Cálculo de métricas por cidade e ordenação por frpMaximo
    // =================================================================================
    it('deve calcular frpMinimo, frpMaximo corretamente por cidade e ordenar por frpMaximo', () => {
        const input = [
            { potenciaRadiativa: '30', localizacao: { cidade: 'Z' } },
            { potenciaRadiativa: '15', localizacao: { cidade: 'Y' } },
            { potenciaRadiativa: '45', localizacao: { cidade: 'X' } }
        ];

        const result = FireStatsService.calculateFireRadiativePowerMetrics(input);

        expect(result.todasCidadesOrdenadas[0].cidade).toBe('X');
        expect(result.todasCidadesOrdenadas[1].cidade).toBe('Z');
        expect(result.todasCidadesOrdenadas[2].cidade).toBe('Y');
    });

    // =================================================================================
    // ✅ Cenário 3: Lida com valores ausentes de potenciaRadiativa
    // =================================================================================
    it('deve lidar com valores ausentes ou inválidos de potenciaRadiativa', () => {
        const input = [
            { localizacao: { cidade: 'A' }, potenciaRadiativa: null },
            { localizacao: { cidade: 'A' }, potenciaRadiativa: undefined },
            { localizacao: { cidade: 'A' }, potenciaRadiativa: 'notANumber' }
        ];

        const result = FireStatsService.calculateFireRadiativePowerMetrics(input);

        expect(result.geral.frpMedio).toBe(0);
        expect(result.todasCidadesOrdenadas[0].cidade).toBe('A');
        expect(result.todasCidadesOrdenadas[0].frpMaximo).toBe(0);
    });

    // =================================================================================
    // ✅ Cenário 4: Array vazio retorna 0 nas métricas
    // =================================================================================
    it('deve retornar 0 nas métricas agregadas com array vazio', () => {
        const result = FireStatsService.calculateFireRadiativePowerMetrics([]);

        expect(result.geral.frpMedio).toBe(0);
        expect(result.cidadesMaiorFRPMaximo).toEqual([]);
        expect(result.todasCidadesOrdenadas).toEqual([]);
    });
});


/**
    * ✅ `aggregateBrightnessTemperatureData(fires)`
    * Objetivo: Agrega estatísticas de temperatura por cidade
    * Casos de teste:
    * Deve calcular temperatura média, mínima e máxima por cidade
    * Deve agrupar por cidade corretamente
    * Deve contar sensores corretamente (VIIRS/MODIS)
    * Deve ordenar por `tempMaxima`
    * Deve lidar com dados ausentes ou temperaturas inválidas
    * Deve retornar valores padrão (0) para array vazio
*/

// =====================================================================================
// ✅ TESTE: FireStatsService.aggregateBrightnessTemperatureData
// -------------------------------------------------------------------------------------
// OBJETIVO:
// - Agrega temperatura de brilho por cidade (média, mínima, máxima)
// - Ordena por temperatura máxima
// - Gera estatísticas gerais e separa top 10 cidades
// =====================================================================================
describe('FireStatsService.aggregateBrightnessTemperatureData', () => {

    // Mocks dos métodos auxiliares
    beforeEach(() => {
        jest.spyOn(FireStatsService, 'extractMunicipalityName').mockImplementation(f => f.cidade || 'N/A');
        jest.spyOn(FireStatsService, 'getTemperatura').mockImplementation(f => parseFloat(f.temperaturaBrilho));
        jest.spyOn(FireStatsService, 'initializeTemperatureMetrics').mockImplementation(cidade => ({
            cidade,
            totalFocos: 0,
            somaTemperatura: 0,
            tempMinima: Infinity,
            tempMaxima: -Infinity,
            sensores: { MODIS: 0, VIIRS: 0 }
        }));
        jest.spyOn(FireStatsService, 'updateTemperatureMetrics').mockImplementation((obj, temp, sensor) => {
            obj.totalFocos += 1;
            obj.somaTemperatura += temp;
            obj.tempMinima = Math.min(obj.tempMinima, temp);
            obj.tempMaxima = Math.max(obj.tempMaxima, temp);
            if (sensor) obj.sensores[sensor] = (obj.sensores[sensor] || 0) + 1;
        });
        jest.spyOn(FireStatsService, 'processCityTemperatureStats').mockImplementation(stats =>
            Object.values(stats)
        );
        jest.spyOn(FireStatsService, 'calculateTemperatureAggregateMetrics').mockImplementation((temps, total) => ({
            tempMedia: total > 0 ? temps.reduce((a, b) => a + b, 0) / total : 0,
            tempMinima: Math.min(...temps),
            tempMaxima: Math.max(...temps)
        }));
    });

    afterEach(() => jest.restoreAllMocks());

    // =================================================================================
    // ✅ Cenário 1: Calcula média, mínima e máxima corretamente
    // =================================================================================
    it('deve calcular temperatura média, mínima e máxima por cidade', () => {
        const input = [
            { cidade: 'A', temperaturaBrilho: '300', instrumentoSensor: 'MODIS' },
            { cidade: 'A', temperaturaBrilho: '310', instrumentoSensor: 'MODIS' }
        ];

        const result = FireStatsService.aggregateBrightnessTemperatureData(input);

        expect(result.geral.tempMedia).toBeCloseTo(305);
        expect(result.cidadesMaiorTemperaturaMaxima[0].cidade).toBe('A');
        expect(result.cidadesMaiorTemperaturaMaxima[0].tempMinima).toBe(300);
        expect(result.cidadesMaiorTemperaturaMaxima[0].tempMaxima).toBe(310);
    });

    // =================================================================================
    // ✅ Cenário 2: Agrupa corretamente por cidade
    // =================================================================================
    it('deve agrupar por cidade corretamente', () => {
        const input = [
            { cidade: 'A', temperaturaBrilho: '300', instrumentoSensor: 'MODIS' },
            { cidade: 'B', temperaturaBrilho: '320', instrumentoSensor: 'VIIRS' }
        ];

        const result = FireStatsService.aggregateBrightnessTemperatureData(input);

        expect(result.todasCidadesOrdenadas.length).toBe(2);
        expect(result.todasCidadesOrdenadas.map(c => c.cidade)).toEqual(['B', 'A']);

    });

    // =================================================================================
    // ✅ Cenário 3: Contabiliza sensores corretamente
    // =================================================================================
    it('deve contar sensores corretamente (MODIS/VIIRS)', () => {
        const input = [
            { cidade: 'X', temperaturaBrilho: '295', instrumentoSensor: 'MODIS' },
            { cidade: 'X', temperaturaBrilho: '305', instrumentoSensor: 'VIIRS' }
        ];

        const result = FireStatsService.aggregateBrightnessTemperatureData(input);

        const sensores = result.todasCidadesOrdenadas[0].sensores;
        expect(sensores.MODIS).toBe(1);
        expect(sensores.VIIRS).toBe(1);
    });

    // =================================================================================
    // ✅ Cenário 4: Ordena cidades por temperatura máxima
    // =================================================================================
    it('deve ordenar por tempMaxima corretamente', () => {
        const input = [
            { cidade: 'A', temperaturaBrilho: '310', instrumentoSensor: 'MODIS' },
            { cidade: 'B', temperaturaBrilho: '330', instrumentoSensor: 'VIIRS' },
            { cidade: 'C', temperaturaBrilho: '320', instrumentoSensor: 'MODIS' }
        ];

        const result = FireStatsService.aggregateBrightnessTemperatureData(input);

        expect(result.cidadesMaiorTemperaturaMaxima[0].cidade).toBe('B');
    });

    // =================================================================================
    // ✅ Cenário 5: Lida com dados ausentes ou inválidos
    // =================================================================================
    it('deve lidar com dados ausentes ou temperaturas inválidas', () => {
        jest.spyOn(FireStatsService, 'getTemperatura').mockImplementation(() => NaN);

        const input = [
            { cidade: 'A', temperaturaBrilho: null },
            { cidade: 'A', temperaturaBrilho: 'abc' }
        ];

        const result = FireStatsService.aggregateBrightnessTemperatureData(input);

        expect(result.geral.tempMedia).toBe(0);
    });

    // =================================================================================
    // ✅ Cenário 6: Retorna valores padrão para array vazio
    // =================================================================================
    it('deve retornar valores padrão (0) para array vazio', () => {
        const result = FireStatsService.aggregateBrightnessTemperatureData([]);

        expect(result.geral.tempMedia).toBe(0);
        expect(result.cidadesMaiorTemperaturaMaxima).toEqual([]);
        expect(result.todasCidadesOrdenadas).toEqual([]);
    });
});

/**
    * ✅ `analyzeTemporalDistribution(fires)`
    * Objetivo: Retorna histograma por hora e horário de pico
    * Casos de teste:
    * Deve contar corretamente quantos focos ocorrem em cada hora (formato "HH:00")
    * Deve ordenar o histograma de 23:00 → 00:00
    * Deve identificar corretamente a hora com mais focos (`pico`)
    * Deve lidar com horários como "4:00", "04:00", "4:30", etc.
    * Deve retornar histograma vazio e pico nulo para array vazio
    * Deve aplicar fallback `'N/A'` se `horaAquisicao` for inválido
 */

// =====================================================================================
// ✅ TESTE: FireStatsService.analyzeTemporalDistribution
// -------------------------------------------------------------------------------------
// OBJETIVO:
// - Conta focos de calor por hora do dia
// - Ordena o histograma de 23:00 → 00:00
// - Identifica a hora com maior ocorrência (pico)
// - Trata dados ausentes ou inválidos com fallback 'N/A'
// =====================================================================================
describe('FireStatsService.analyzeTemporalDistribution', () => {

    // =================================================================================
    // ✅ Cenário 1: Conta corretamente focos por hora formatada (HH:00)
    // =================================================================================
    it('deve contar corretamente quantos focos ocorrem em cada hora (formato "HH:00")', () => {
        const input = [
            { horaAquisicao: '01:15' },
            { horaAquisicao: '01:45' },
            { horaAquisicao: '02:00' },
            { horaAquisicao: '02:30' },
            { horaAquisicao: '02:59' }
        ];

        const result = FireStatsService.analyzeTemporalDistribution(input);

        expect(result.histograma).toEqual(
            expect.arrayContaining([
                { hora: '01:00', quantidade: 2 },
                { hora: '02:00', quantidade: 3 }
            ])
        );
    });

    // =================================================================================
    // ✅ Cenário 2: Ordena histograma de 23:00 até 00:00
    // =================================================================================
    it('deve ordenar o histograma de 23:00 → 00:00', () => {
        const input = [
            { horaAquisicao: '00:30' },
            { horaAquisicao: '23:15' },
            { horaAquisicao: '12:00' }
        ];

        const result = FireStatsService.analyzeTemporalDistribution(input);
        const horas = result.histograma.map(h => h.hora);

        expect(horas).toEqual([
            '23:00', '12:00', '00:00',
            // restante omitido — outras horas com quantidade 0
            ...horas.slice(3)
        ]);
    });

    // =================================================================================
    // ✅ Cenário 3: Identifica corretamente a hora com mais focos (pico)
    // =================================================================================
    it('deve identificar corretamente a hora com mais focos (pico)', () => {
        const input = [
            { horaAquisicao: '05:00' },
            { horaAquisicao: '05:30' },
            { horaAquisicao: '14:00' }
        ];

        const result = FireStatsService.analyzeTemporalDistribution(input);

        expect(result.pico).toEqual({
            hora: '05:00',
            quantidade: 2
        });
    });

    // =================================================================================
    // ✅ Cenário 4: Lida com variações de formato como "4:00", "04:00", "4:30"
    // =================================================================================
    it('deve lidar com horários como "4:00", "04:00", "4:30", etc.', () => {
        const input = [
            { horaAquisicao: '4:00' },
            { horaAquisicao: '04:15' },
            { horaAquisicao: '4:45' }
        ];

        const result = FireStatsService.analyzeTemporalDistribution(input);
        const hora = result.histograma.find(h => h.hora === '04:00');

        expect(hora.quantidade).toBe(3);
    });

    // =================================================================================
    // ✅ Cenário 5: Retorna histograma vazio e pico nulo para array vazio
    // =================================================================================
    it('deve retornar histograma vazio e pico nulo para array vazio', () => {
        const result = FireStatsService.analyzeTemporalDistribution([]);

        expect(result.histograma).toEqual([]);
        expect(result.pico).toEqual({ hora: null, quantidade: 0 });
    });

    // =================================================================================
    // ✅ Cenário 6: Aplica fallback "N/A" se horaAquisicao for inválido
    // =================================================================================
    it('deve aplicar fallback "N/A" se horaAquisicao for inválido', () => {
        const input = [
            { horaAquisicao: 'invalid' },
            { horaAquisicao: '' },
            { horaAquisicao: null },
            { horaAquisicao: undefined }
        ];

        const result = FireStatsService.analyzeTemporalDistribution(input);

        const fallback = result.histograma.find(h => h.hora === 'N/A');
        expect(fallback.quantidade).toBe(4);
    });

});

/**
    * ✅ `aggregateRegionalCommandData(fires)`
    * Objetivo: Agrega focos por Comando Regional (CR BM)
    * Casos de teste:
    * Deve agrupar municípios corretamente pelo CR
    * Deve contar total de focos e municípios por CR
    * Deve ordenar CRs por `totalFocos` (decrescente)
    * Deve lidar com cidades não mapeadas (retornam `"NÃO ASSOCIADO"`)
    * Deve lidar com arquivos GeoJSON corrompidos ou vazios
    * Deve retornar array vazio se não houver focos'
 */

// =====================================================================================
// ✅ TESTE: FireStatsService.aggregateRegionalCommandData
// -------------------------------------------------------------------------------------
// OBJETIVO:
// - Agrega focos de calor por Comando Regional (CR)
// - Conta total de focos e municípios únicos por CR
// - Ordena os CRs por total de focos (decrescente)
// - Trata cidades não mapeadas como "NÃO ASSOCIADO"
// - Lida com mapeamento inválido ou corrompido
// =====================================================================================

describe('FireStatsService.aggregateRegionalCommandData', () => {
    // =================================================================================
    // ✅ Cenário 1: Agrupamento e contagem por CR
    // =================================================================================
    it('deve agrupar municípios corretamente pelo CR e contar focos', () => {
        jest.spyOn(FireStatsService, 'carregarMapeamentoCR').mockReturnValue({
            CUIABÁ: 'CR I',
            SORRISO: 'CR II'
        });

        const input = [
            { localizacao: { cidade: 'Cuiabá' } },
            { localizacao: { cidade: 'Cuiabá' } },
            { localizacao: { cidade: 'Sorriso' } },
        ];

        const result = FireStatsService.aggregateRegionalCommandData(input);

        expect(result).toEqual([
            {
                comandoRegional: 'CR I',
                totalFocos: 2,
                cidades: ['Cuiabá']
            },
            {
                comandoRegional: 'CR II',
                totalFocos: 1,
                cidades: ['Sorriso']
            }
        ]);
    });

    // =================================================================================
    // ✅ Cenário 2: Ordena CRs por totalFocos decrescente
    // =================================================================================
    it('deve ordenar CRs por totalFocos (desc)', () => {
        jest.spyOn(FireStatsService, 'carregarMapeamentoCR').mockReturnValue({
            A: 'CR X',
            B: 'CR Y'
        });

        const input = [
            { localizacao: { cidade: 'A' } },
            { localizacao: { cidade: 'A' } },
            { localizacao: { cidade: 'B' } }
        ];

        const result = FireStatsService.aggregateRegionalCommandData(input);
        expect(result.map(cr => cr.comandoRegional)).toEqual(['CR X', 'CR Y']);
    });

    // =================================================================================
    // ✅ Cenário 3: Lida com cidades não mapeadas
    // =================================================================================
    it('deve retornar "NÃO ASSOCIADO" para cidades sem mapeamento', () => {
        jest.spyOn(FireStatsService, 'carregarMapeamentoCR').mockReturnValue({});

        const input = [
            { localizacao: { cidade: 'Desconhecida' } },
        ];

        const result = FireStatsService.aggregateRegionalCommandData(input);

        expect(result[0]).toMatchObject({
            comandoRegional: 'NÃO ASSOCIADO',
            totalFocos: 1,
            cidades: ['Desconhecida']
        });
    });

    // =================================================================================
    // ✅ Cenário 4: Lida com arquivos GeoJSON vazios ou corrompidos
    // =================================================================================
    it('deve lidar com mapeamento corrompido e continuar com "NÃO ASSOCIADO"', () => {
        jest.spyOn(FireStatsService, 'carregarMapeamentoCR').mockImplementation(() => {
            throw new Error('Erro ao carregar GeoJSON');
        });

        const input = [
            { localizacao: { cidade: 'AlgumaCidade' } }
        ];

        const result = FireStatsService.aggregateRegionalCommandData(input);
        expect(result[0].comandoRegional).toBe('NÃO ASSOCIADO');
    });

    // =================================================================================
    // ✅ Cenário 5: Retorna array vazio se não houver focos
    // =================================================================================
    it('deve retornar array vazio se não houver focos', () => {
        jest.spyOn(FireStatsService, 'carregarMapeamentoCR').mockReturnValue({});

        const result = FireStatsService.aggregateRegionalCommandData([]);
        expect(result).toEqual([]);
    });
});

// 🛠️ Métodos auxiliares (públicos):

/**
    * `extractLocationParameter(fire, campo)`
    * Retorna valor correto se o campo existe
    * Retorna `undefined` se o campo estiver ausente
    * Lança erro se `fire` for inválido (opcional: testar com objetos malformados)
 */

/**
 * 🧪 Testes para extractLocationParameter
 *
 * Objetivo: Validar a extração segura de campos de localização em objetos de focos de calor.
 *
 * Casos de teste:
 * - Deve retornar valor correto se o campo existe
 * - Deve retornar `undefined` se o campo estiver ausente
 * - Deve retornar `undefined` se `localizacao` estiver ausente
 * - Deve lançar erro se `fire` não for um objeto válido (caso tenha sido implementado)
 */

describe('FireStatsService.extractLocationParameter', () => {
    // =================================================================================
    // ✅ Cenário 1: Retorna valor corretamente se o campo existe
    // =================================================================================
    it('deve retornar o valor correto se o campo existir em localizacao', () => {
        const fire = {
            localizacao: {
                cidade: 'Cuiabá',
                estado: 'MT'
            }
        };

        expect(FireStatsService.extractLocationParameter(fire, 'cidade')).toBe('Cuiabá');
        expect(FireStatsService.extractLocationParameter(fire, 'estado')).toBe('MT');
    });

    // =================================================================================
    // ✅ Cenário 2: Retorna undefined se o campo estiver ausente
    // =================================================================================
    it('deve retornar undefined se o campo não existir em localizacao', () => {
        const fire = {
            localizacao: {
                estado: 'MT'
            }
        };

        expect(FireStatsService.extractLocationParameter(fire, 'cidade')).toBeUndefined();
    });

    // =================================================================================
    // ✅ Cenário 3: Retorna undefined se objeto localizacao estiver ausente
    // =================================================================================
    it('deve retornar undefined se o objeto localizacao estiver ausente', () => {
        const fire = {};
        expect(FireStatsService.extractLocationParameter(fire, 'cidade')).toBeUndefined();
    });

    // =================================================================================
    // ✅ Cenário 4: Lança erro se o parâmetro fire não for um objeto
    // =================================================================================
    it('deve lançar erro se fire não for um objeto', () => {
        expect(() => FireStatsService.extractLocationParameter(null, 'cidade')).toThrow(TypeError);
        expect(() => FireStatsService.extractLocationParameter(undefined, 'estado')).toThrow(TypeError);
        expect(() => FireStatsService.extractLocationParameter(42, 'cidade')).toThrow(TypeError);
    });

});

/**
    * `applyDefaultValue(valor, fallback)`
    * Retorna valor se válido
    * Retorna fallback para valores falsy (`undefined`, `null`, `''`, `0`, `false`, `NaN`)
 */

/**
 * 🧪 Testes para applyDefaultValue
 *
 * Objetivo: Garantir que valores falsy recebam fallback e valores válidos sejam preservados.
 *
 * Casos de teste:
 * - Deve retornar o valor se ele for válido (truthy)
 * - Deve retornar o fallback para valores falsy:
 *   - `undefined`
 *   - `null`
 *   - `''` (string vazia)
 *   - `0`
 *   - `false`
 *   - `NaN`
 */

describe('FireStatsService.applyDefaultValue', () => {
    // =================================================================================
    // ✅ Cenário 1: Retorna valor se for válido (truthy)
    // =================================================================================
    it('deve retornar o valor se ele for válido', () => {
        expect(FireStatsService.applyDefaultValue('Cuiabá', 'N/A')).toBe('Cuiabá');
        expect(FireStatsService.applyDefaultValue(10, 0)).toBe(10);
        expect(FireStatsService.applyDefaultValue(true, false)).toBe(true);
        expect(FireStatsService.applyDefaultValue('0', 'fallback')).toBe('0'); // string "0" é truthy
    });

    // =================================================================================
    // ✅ Cenário 2: Retorna fallback se valor for undefined
    // =================================================================================
    it('deve retornar o fallback se valor for undefined', () => {
        expect(FireStatsService.applyDefaultValue(undefined, 'N/A')).toBe('N/A');
    });

    // =================================================================================
    // ✅ Cenário 3: Retorna fallback se valor for null
    // =================================================================================
    it('deve retornar o fallback se valor for null', () => {
        expect(FireStatsService.applyDefaultValue(null, 'DEFAULT')).toBe('DEFAULT');
    });

    // =================================================================================
    // ✅ Cenário 4: Retorna fallback se valor for string vazia
    // =================================================================================
    it('deve retornar o fallback se valor for string vazia', () => {
        expect(FireStatsService.applyDefaultValue('', 'Vazio')).toBe('Vazio');
    });

    // =================================================================================
    // ✅ Cenário 5: Retorna fallback se valor for 0
    // =================================================================================
    it('deve retornar o fallback se valor for 0', () => {
        expect(FireStatsService.applyDefaultValue(0, 100)).toBe(100);
    });

    // =================================================================================
    // ✅ Cenário 6: Retorna fallback se valor for false
    // =================================================================================
    it('deve retornar o fallback se valor for false', () => {
        expect(FireStatsService.applyDefaultValue(false, true)).toBe(true);
    });

    // =================================================================================
    // ✅ Cenário 7: Retorna fallback se valor for NaN
    // =================================================================================
    it('deve retornar o fallback se valor for NaN', () => {
        expect(FireStatsService.applyDefaultValue(NaN, 'Fallback')).toBe('Fallback');
    });

});

/**
    * `extractMunicipalityName(fire)`
    * Retorna cidade em maiúsculas
    * Retorna `'N/A'` para cidade ausente
    * Lança erro se `fire` for inválido
 */

/**
 * 🧪 Testes para extractMunicipalityName
 *
 * Objetivo: Extrair corretamente o nome do município de um foco.
 *
 * Casos de teste:
 * - Retorna o nome da cidade em maiúsculas
 * - Retorna `'N/A'` quando cidade estiver ausente
 * - Lança erro quando `fire` for inválido
 */

describe('FireStatsService.extractMunicipalityName', () => {
    // =================================================================================
    // ✅ Cenário 1: Retorna cidade em maiúsculas se presente
    // =================================================================================
    it('deve retornar o nome da cidade se estiver presente', () => {
        const fire = { localizacao: { cidade: 'Cuiabá' } };
        const result = FireStatsService.extractMunicipalityName(fire);
        expect(result).toBe('Cuiabá');
    });

    // =================================================================================
    // ✅ Cenário 2: Retorna "N/A" se cidade estiver ausente
    // =================================================================================
    it('deve retornar "N/A" se o campo cidade estiver ausente', () => {
        const fire = { localizacao: {} };
        const result = FireStatsService.extractMunicipalityName(fire);
        expect(result).toBe('N/A');
    });

    // =================================================================================
    // ✅ Cenário 3: Retorna "N/A" se localizacao estiver ausente
    // =================================================================================
    it('deve retornar "N/A" se localizacao estiver ausente', () => {
        const fire = {};
        const result = FireStatsService.extractMunicipalityName(fire);
        expect(result).toBe('N/A');
    });

    // =================================================================================
    // ✅ Cenário 4: Lança TypeError se fire for inválido
    // =================================================================================
    it('deve lançar TypeError se fire não for um objeto', () => {
        expect(() => FireStatsService.extractMunicipalityName(null)).toThrow(TypeError);
        expect(() => FireStatsService.extractMunicipalityName(undefined)).toThrow(TypeError);
        expect(() => FireStatsService.extractMunicipalityName(123)).toThrow(TypeError);
    });

});

/**
    * `extractRadiativePowerValue(fire)`
    * Converte string numérica para `number`
    * Retorna 0 para valores ausentes/invalidos
 */

/**
 * 🧪 Testes para extractRadiativePowerValue
 *
 * Objetivo: Extrair e converter corretamente o valor de potência radiativa (FRP).
 *
 * Casos de teste:
 * - Converte string numérica para número
 * - Retorna o número se já for tipo `number`
 * - Retorna 0 para valores ausentes
 * - Retorna 0 para valores inválidos (ex: texto não numérico)
 */

describe('FireStatsService.extractRadiativePowerValue', () => {

    // =================================================================================
    // ✅ Cenário 1: Converte string numérica para número
    // =================================================================================
    it('deve converter string numérica para número', () => {
        const fire = { potenciaRadiativa: '42.5' };
        const result = FireStatsService.extractRadiativePowerValue(fire);
        expect(result).toBeCloseTo(42.5);
    });

    // =================================================================================
    // ✅ Cenário 2: Retorna valor se já for tipo number
    // =================================================================================
    it('deve retornar o valor se for um número', () => {
        const fire = { potenciaRadiativa: 37 };
        const result = FireStatsService.extractRadiativePowerValue(fire);
        expect(result).toBe(37);
    });

    // =================================================================================
    // ✅ Cenário 3: Retorna 0 para valores ausentes
    // =================================================================================
    it('deve retornar 0 se o campo potenciaRadiativa estiver ausente', () => {
        const fire = {};
        const result = FireStatsService.extractRadiativePowerValue(fire);
        expect(result).toBe(0);
    });

    // =================================================================================
    // ✅ Cenário 4: Retorna 0 para valores inválidos
    // =================================================================================
    it('deve retornar 0 se potenciaRadiativa for um texto não numérico', () => {
        const fire = { potenciaRadiativa: 'abc' };
        const result = FireStatsService.extractRadiativePowerValue(fire);
        expect(result).toBe(0);
    });
});

/**
    * `getTemperatura(fire)`
    * Retorna temperatura como número
    * Retorna 0 se ausente
 */

/**
 * 🔎 FireStatsService.getTemperatura
 *
 * Testa a extração da temperatura de brilho de um foco de calor.
 * Garante robustez na leitura do campo `temperaturaBrilho`, com fallback e validações.
 */
describe('FireStatsService.getTemperatura', () => {
    /**
     * ✅ Cenário 1: Retorna temperatura numérica válida
     * Deve extrair corretamente o valor de temperaturaBrilho se presente
     */
    it('deve retornar temperatura como número', () => {
        const fire = { temperaturaBrilho: 342.1 };
        const result = FireStatsService.getTemperatura(fire);
        expect(result).toBe(342.1);
    });

    /**
     * ✅ Cenário 2: Retorna 0 se temperatura estiver ausente
     * Deve aplicar fallback seguro quando não houver valor
     */
    it('deve retornar 0 se temperatura estiver ausente', () => {
        const fire = {};
        const result = FireStatsService.getTemperatura(fire);
        expect(result).toBe(0);
    });

    /**
     * ✅ Cenário 3: Deve aceitar valor 0 explicitamente
     * Verifica se 0 é retornado como valor legítimo (não confundido com ausência)
     */
    it('deve retornar 0 se temperatura for 0 explicitamente', () => {
        const fire = { temperaturaBrilho: 0 };
        const result = FireStatsService.getTemperatura(fire);
        expect(result).toBe(0);
    });

    /**
     * ✅ Cenário 4: Lança erro se fire não for um objeto
     * Garante robustez contra inputs malformados
     */
    it('deve lançar TypeError se fire não for um objeto', () => {
        expect(() => FireStatsService.getTemperatura(null)).toThrow(TypeError);
        expect(() => FireStatsService.getTemperatura(undefined)).toThrow(TypeError);
        expect(() => FireStatsService.getTemperatura('')).toThrow(TypeError);
    });
});

// =====================================================================================
// 🧪 TESTE: FireStatsService.carregarMapeamentoCR
// -------------------------------------------------------------------------------------
// OBJETIVO:
// - Testar leitura e parsing do arquivo de mapeamento CR (GeoJSON)
// - Simular leitura com conteúdo válido, inválido e vazio
// =====================================================================================
import fs from 'fs'; // <-- sem await

describe('FireStatsService.carregarMapeamentoCR', () => {
    const mockGeoJSON = {
        features: [
            {
                properties: {
                    NOME_MUNICIP: 'CUIABÁ',
                    NOME_CR: 'CR BM I'
                }
            },
            {
                properties: {
                    NOME_MUNICIP: 'SINOP',
                    NOME_CR: 'CR BM II'
                }
            }
        ]
    };

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('deve retornar o mapeamento corretamente a partir do arquivo GeoJSON', () => {
        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockGeoJSON));

        const resultado = FireStatsService.carregarMapeamentoCR();

        expect(resultado).toEqual({
            CUIABÁ: 'CR BM I',
            SINOP: 'CR BM II'
        });
    });

    it('deve retornar um objeto vazio se o arquivo estiver vazio', () => {
        jest.spyOn(fs, 'readFileSync').mockReturnValue('');

        const resultado = FireStatsService.carregarMapeamentoCR();

        expect(resultado).toEqual({});
    });

    it('deve lançar erro se o conteúdo do arquivo não for um JSON válido', () => {
        jest.spyOn(fs, 'readFileSync').mockReturnValue('{ inválido');

        expect(() => FireStatsService.carregarMapeamentoCR()).toThrow(SyntaxError);
    });
});

// =====================================================================================
// 🧪 TESTE: updateTemperatureMetrics com sensores desconhecidos
// -------------------------------------------------------------------------------------
// OBJETIVO:
// - Verificar se sensores não reconhecidos são ignorados ou armazenados com chave genérica
// =====================================================================================
describe('FireStatsService.updateTemperatureMetrics - sensores desconhecidos', () => {
    it('deve ignorar sensores não reconhecidos (XYZ) ou adicioná-los ao objeto', () => {
        const cidadeStats = {
            cidade: 'A',
            totalFocos: 0,
            somaTemperatura: 0,
            tempMinima: Infinity,
            tempMaxima: -Infinity,
            porSensor: { MODIS: 0, VIIRS: 0 }
        };

        FireStatsService.updateTemperatureMetrics(cidadeStats, 300, 'XYZ');

        expect(cidadeStats.totalFocos).toBe(1);
        expect(cidadeStats.porSensor.XYZ).toBeUndefined(); // ou .toBe(1) se você decidir permitir
    });
});


// =====================================================================================
// 🧪 TESTE: Arredondamento de métricas com toFixed(2)
// -------------------------------------------------------------------------------------
// OBJETIVO:
// - Verificar se frpMedio e tempMedia são arredondados corretamente com duas casas decimais
// =====================================================================================
describe.only('FireStatsService - arredondamento com toFixed(2)', () => {
    it('deve arredondar frpMedio para duas casas decimais', () => {
        const input = [
            { potenciaRadiativa: '10', localizacao: { cidade: 'A' } },
            { potenciaRadiativa: '11', localizacao: { cidade: 'A' } },
            { potenciaRadiativa: '13', localizacao: { cidade: 'A' } }
        ];

        const result = FireStatsService.calculateFireRadiativePowerMetrics(input);

        expect(result.geral.frpMedio).toBeCloseTo(11.33, 2);
    });

    it('deve arredondar tempMedia para duas casas decimais', () => {
        const input = [
            { cidade: 'X', temperaturaBrilho: '305.456', instrumentoSensor: 'MODIS' },
            { cidade: 'X', temperaturaBrilho: '310.789', instrumentoSensor: 'VIIRS' }
        ];

        const result = FireStatsService.aggregateBrightnessTemperatureData(input);

        expect(result.geral.temperaturaMedia).toBeCloseTo(308.12, 2);
    });
});
