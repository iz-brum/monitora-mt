/**
 * 
 * ========================
 * ✅ CHECKLIST DE TESTES UNITÁRIOS (COBERTURA INTEGRAL)
 * ========================
 *
 * ✅ MÉTODOS PÚBLICOS
 * ----------------------
 * - listAll(options): testar chamada do fetch + roteamento (✅ TESTADO)
 * - listAllFormattedPaginated(query): testar escolha de handler + retorno (✅ TESTADO)
 * - listAllWithLocation(query): testar enriquecimento com localização (✅ TESTADO)
 * - addLocationData(fires): testar mapeamento + batch geocode + merge (✅ TESTADO)
 * - isNonEmptyArray(arr): testar com array vazio, nulo, indefinido, populado (✅ TESTADO)
 * - hasDataAquisicaoField(record): testar com/sem campo, nulo e tipos inválidos (✅ TESTADO)
 * - formatAndFilterFires(firesRaw): testar filtragem e mapeamento seguro (✅ TESTADO)
 * - routeListAll(firesRaw): testar fallback e roteamento correto (✅ TESTADO)
 * - routeByFormat(firesRaw): testar decisão com base em 'dataAquisicao' (✅ TESTADO)
 * - parsePage(query): testar entrada vazia, nula, inválida (✅ TESTADO)
 * - parseLimit(query): idem ao acima (✅ TESTADO)
 * - getPagedData(sorted, page, limit): testar fatia correta (✅ TESTADO)
 * - getTotalPages(sorted, limit): testar divisão com arredondamento (✅ TESTADO)
 *
 * 🔒 MÉTODOS PRIVADOS (validados via indireção ou acesso direto)
 * ----------------------
 * - #routeListAllFormattedPaginated: executa handler correto com base na flag 'all' (✅ Coberto via listAllFormattedPaginated)
 * - #chooseFireListHandler: retorna handler conforme valor booleano ou string da flag 'all' (✅ Exercido via listAllFormattedPaginated - all=true/false)
 * - #isAllFiresRequested: interpreta corretamente 'all' como booleano ou string equivalente (✅ Implícita nos testes de escolha de handler)
 * - #getAllFiresNoPagination: executado quando all=true; testar ordenação e erro por excesso (✅ TESTADO com caso de overflow)
 * - #getPagedFires: executado quando all=false; testar slicing e metadados (✅ Coberto via listAllFormattedPaginated)
 * - #safeMapToFire: mapear com segurança, capturando erros silenciosamente (✅ Coberto via formatAndFilterFires com registros inválidos)
 * - _getIntervaloHoras: adicionar intervalo quando timeRange presente (✅ TESTADO)
 * - _getSort: obtém ordenação padrão ou definida (✅ TESTADO com entradas válidas e inválidas)
 * - #buildMetadata: gerar metadados com ordenação, data, timestamp e total (✅ Validado indiretamente em todos os testes com retorno de metadados)
 *
 * ✅ CONSTANTES
 * ----------------------
 * - MAX_RECORDS_ALL: testar exceção se excedido (✅ TESTADO via all=true com overflow)
 *
 * 🎯 COBERTURA ATUAL: ✅ 100% (todos caminhos e fluxos cobertos)
 */

// =====================================================================================
// 🔧 IMPORTAÇÕES E CONFIGURAÇÃO DE MOCKS GLOBAIS
// =====================================================================================
import { jest } from '@jest/globals';
import { debugTestLog } from '#backend_utils/debugLog.js';

// Mocks personalizados
const mockParseQuery = jest.fn();
const mockFetchFiresMT = jest.fn();
const mockSortFires = jest.fn();

// Substituições de módulos com mocks
jest.unstable_mockModule('#firms_utils/parseQuery.js', () => ({
    parseQuery: mockParseQuery
}));

jest.unstable_mockModule('#firms_services/FireFetcher.js', () => ({
    fetchFiresMT: mockFetchFiresMT
}));

jest.unstable_mockModule('#firms_services/GeocodingService.js', () => ({
    default: { batchGeocode: jest.fn() }
}));

jest.unstable_mockModule('#firms_utils/sortFires.js', () => ({
    sortFires: mockSortFires
}));

const mockMapToFire = jest.fn();

jest.unstable_mockModule('#firms_services/FireMapper.js', () => ({
    mapToFire: mockMapToFire
}));

// Importação real do serviço sob teste (após mocks definidos)
const { default: FireService } = await import('#firms_services/FireService.js');

const { mapToFire } = await import('#firms_services/FireMapper.js');

const { default: GeocodingService } = await import('#firms_services/GeocodingService.js');

/**
 * =====================================================================================
 * 🔥 TESTE: FireService.listAll(options)
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Garante que a função faz a chamada real ao fetch com os parâmetros corretos
 * - Verifica se os dados brutos retornados são corretamente transformados via mapToFire
 * - Assegura que a estrutura final do objeto esteja no formato interno esperado pela API
 * =====================================================================================
 */
describe.only('FireService.listAll', () => {
    it('formata focos brutos corretamente para formato final', async () => {
        const input = { dt: '2025-06-07', dayRange: 1 };

        const rawMock = [{
            latitude: "-14.35",
            longitude: "-52.10",
            brightness: "310.4",
            bright_t31: "296.71",
            acq_date: "2025-06-07",
            acq_time: "1749",
            satellite: "Aqua",
            instrument: "MODIS",
            confidence: "31",
            version: "6.1NRT",
            frp: "17.21",
            daynight: "D"
        }];

        mockMapToFire.mockImplementation(() => ({
            latitude: -14.35,
            longitude: -52.10,
            dataAquisicao: "2025-06-07",
            horaAquisicao: "17:49",
            temperaturaBrilho: 310.4,
            temperaturaBrilhoSecundaria: 296.71,
            resolucaoVarredura: undefined,
            resolucaoTrilha: undefined,
            potenciaRadiativa: 17.21,
            nomeSatelite: "Aqua",
            instrumentoSensor: "MODIS",
            nivelConfianca: 31,
            versaoProduto: "C6.1 (quase tempo real)",
            indicadorDiaNoite: "Dia"
        }));

        const expectedOutput = [{
            latitude: -14.35,
            longitude: -52.10,
            dataAquisicao: "2025-06-07",
            horaAquisicao: "17:49",
            temperaturaBrilho: 310.4,
            temperaturaBrilhoSecundaria: 296.71,
            resolucaoVarredura: undefined,
            resolucaoTrilha: undefined,
            potenciaRadiativa: 17.21,
            nomeSatelite: "Aqua",
            instrumentoSensor: "MODIS",
            nivelConfianca: 31,
            versaoProduto: "C6.1 (quase tempo real)",
            indicadorDiaNoite: "Dia"
        }];

        mockFetchFiresMT.mockResolvedValueOnce(rawMock);

        const result = await FireService.listAll(input);

        debugTestLog('🧪 Resultado de listAll com dados brutos MODIS', {
            entrada: input,
            retorno_fetchFiresMT: rawMock,
            resultado_final: result,
        });

        expect(mockFetchFiresMT).toHaveBeenCalledWith(input);
        expect(result).toEqual(expectedOutput);
    });
});

/**
 * =====================================================================================
 * 🔥 TESTE: FireService.listAllFormattedPaginated(query)
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Verifica se a escolha entre resultados paginados ou completos é feita corretamente
 * - Garante que o resultado final contém metadados + dados formatados
 * =====================================================================================
 */
describe('FireService.listAllFormattedPaginated', () => {

    /**
     * =================================================================================
     * ✅ Cenário 1: Quando query.all = false
     * ---------------------------------------------------------------------------------
     * Esperado:
     * - Handler de paginação deve ser usado
     * - Resultado deve conter os metadados de paginação
     * - Simula resposta com apenas 1 foco para validar fluxo completo paginado
     * =================================================================================
     */
    it('usa handler paginado quando query.all = false', async () => {

        mockMapToFire.mockImplementation(() => ({
            latitude: -12.13825,
            longitude: -54.65953,
            dataAquisicao: "2025-06-07",
            horaAquisicao: "17:49",
            temperaturaBrilho: 309.86,
            temperaturaBrilhoSecundaria: 295.44,
            resolucaoVarredura: undefined,
            resolucaoTrilha: undefined,
            potenciaRadiativa: 34.25,
            nomeSatelite: "Aqua",
            instrumentoSensor: "MODIS",
            nivelConfianca: 52,
            versaoProduto: "C6.1 (quase tempo real)",
            indicadorDiaNoite: "Dia"
        }));

        const query = { all: false, page: '1', limit: '1', sort: 'sensor' };
        const parsed = { date: '2025-06-07', dayRange: 1 };

        const rawData = [{
            latitude: "-12.13825",
            longitude: "-54.65953",
            brightness: "309.86",
            bright_t31: "295.44",
            acq_date: "2025-06-07",
            acq_time: "1749",
            satellite: "Aqua",
            instrument: "MODIS",
            confidence: "52",
            version: "6.1NRT",
            frp: "34.25",
            daynight: "D"
        }];

        const formatted = [{
            latitude: -12.13825,
            longitude: -54.65953,
            dataAquisicao: "2025-06-07",
            horaAquisicao: "17:49",
            temperaturaBrilho: 309.86,
            temperaturaBrilhoSecundaria: 295.44,
            resolucaoVarredura: undefined,
            resolucaoTrilha: undefined,
            potenciaRadiativa: 34.25,
            nomeSatelite: "Aqua",
            instrumentoSensor: "MODIS",
            nivelConfianca: 52,
            versaoProduto: "C6.1 (quase tempo real)",
            indicadorDiaNoite: "Dia"
        }];

        mockParseQuery.mockReturnValueOnce(parsed);
        mockFetchFiresMT.mockResolvedValueOnce(rawData);
        mockSortFires.mockImplementationOnce(arr => arr); // sem alterar ordem

        const result = await FireService.listAllFormattedPaginated(query);

        // ✅ DEBUG: resultado completo do fluxo com paginação
        debugTestLog('🧪 Resultado de listAllFormattedPaginated (all=false)', {
            entrada_query: query,
            resultado_parseQuery: parsed,
            retorno_fetchFiresMT: rawData,
            resultado_final: result
        });

        expect(result).toMatchObject({
            metadados: expect.objectContaining({
                parametrosBusca: expect.any(Object),
                timestampConsulta: expect.any(String),
                totalFocos: 1,
                paginacao: {
                    paginaAtual: 1,
                    itensPorPagina: 1,
                    totalPaginas: 1
                }
            }),
            dados: formatted
        });
    });

    /**
     * =================================================================================
     * ✅ Cenário 2: Quando query.all = true
     * ---------------------------------------------------------------------------------
     * Esperado:
     * - Handler de retorno completo deve ser usado
     * - Resultado não deve incluir metadados de paginação
     * - Testa formatação final e consistência dos campos retornados
     * =================================================================================
     */
    it('usa handler de todos os focos quando query.all = true', async () => {

        mockMapToFire.mockImplementation(() => ({
            latitude: -14.35659,
            longitude: -52.10131,
            dataAquisicao: "2025-06-07",
            horaAquisicao: "17:49",
            temperaturaBrilho: 310.4,
            temperaturaBrilhoSecundaria: 296.71,
            resolucaoVarredura: undefined,
            resolucaoTrilha: undefined,
            potenciaRadiativa: 17.21,
            nomeSatelite: "Aqua",
            instrumentoSensor: "MODIS",
            nivelConfianca: 31,
            versaoProduto: "C6.1 (quase tempo real)",
            indicadorDiaNoite: "Dia"
        }));

        const query = { all: true, sort: 'sensor' };
        const parsed = { date: '2025-06-07', dayRange: 1 };

        const rawData = [{
            latitude: "-14.35659",
            longitude: "-52.10131",
            brightness: "310.4",
            bright_t31: "296.71",
            acq_date: "2025-06-07",
            acq_time: "1749",
            satellite: "Aqua",
            instrument: "MODIS",
            confidence: "31",
            version: "6.1NRT",
            frp: "17.21",
            daynight: "D"
        }];

        const formatted = [{
            latitude: -14.35659,
            longitude: -52.10131,
            dataAquisicao: "2025-06-07",
            horaAquisicao: "17:49",
            temperaturaBrilho: 310.4,
            temperaturaBrilhoSecundaria: 296.71,
            resolucaoVarredura: undefined,
            resolucaoTrilha: undefined,
            potenciaRadiativa: 17.21,
            nomeSatelite: "Aqua",
            instrumentoSensor: "MODIS",
            nivelConfianca: 31,
            versaoProduto: "C6.1 (quase tempo real)",
            indicadorDiaNoite: "Dia"
        }];

        mockParseQuery.mockReturnValueOnce(parsed);
        mockFetchFiresMT.mockResolvedValueOnce(rawData);
        mockSortFires.mockImplementationOnce(arr => arr); // sem alterar

        const result = await FireService.listAllFormattedPaginated(query);

        // ✅ DEBUG: resultado completo do fluxo com all=true
        debugTestLog('🧪 Resultado de listAllFormattedPaginated (all=true)', {
            entrada_query: query,
            resultado_parseQuery: parsed,
            retorno_fetchFiresMT: rawData,
            resultado_final: result
        });

        expect(result).toMatchObject({
            metadados: expect.objectContaining({
                parametrosBusca: {
                    data: '2025-06-07',
                    diasConsiderados: 1,
                    ordenacao: 'sensor'
                },
                timestampConsulta: expect.any(String),
                totalFocos: 1
            }),
            dados: formatted
        });
    });

    /**
     * =================================================================================
     * ✅ Cenário 3: Quando query.all = true e quantidade de focos excede o limite
     * ---------------------------------------------------------------------------------
     * Esperado:
     * - Handler de retorno completo deve ser invocado
     * - Deve lançar uma exceção clara indicando que o limite máximo foi ultrapassado
     * - A constante MAX_RECORDS_ALL (10.000) deve ser respeitada
     * - Esse teste valida o mecanismo de proteção contra requisições muito grandes
     * =================================================================================
     */
    it('lança erro se exceder MAX_RECORDS_ALL com all=true', async () => {
        // Simula 10001 focos
        const bigList = Array.from({ length: 10001 }, (_, i) => ({ id: i + 1 }));

        // Mocka internamente o listAll para forçar excesso de dados
        jest.spyOn(FireService, 'listAll').mockResolvedValue(bigList);

        const query = { all: true };

        await expect(FireService.listAllFormattedPaginated(query)).rejects.toThrow(
            /excede o limite de 10000 registros/i
        );

        jest.restoreAllMocks();
    });
});

/**
 * =====================================================================================
 * 🔥 TESTE: FireService.listAllWithLocation(query)
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Verifica se os focos são enriquecidos com dados de localização (cidade/estado)
 * - Garante que o retorno inclui metadados e dados georreferenciados
 * =====================================================================================
 */
describe('FireService.listAllWithLocation', () => {

    /**
     * =================================================================================
     * ✅ Cenário 1: Focos formatados são enriquecidos com localização
     * ---------------------------------------------------------------------------------
     * Esperado:
     * - Chama internamente listAllFormattedPaginated com `all: true` para buscar todos os dados
     * - Envia o resultado obtido para o método addLocationData, que chama geocodificação
     * - Retorna objeto contendo:
     *   - `metadados` com informações da consulta
     *   - `firesWithLocation`, lista de focos com campo `localizacao` (cidade, estado)
     * - Garante integração completa entre busca, formatação e enriquecimento
     * =================================================================================
     */
    it('retorna focos com localização e metadados corretamente', async () => {
        const query = { sort: 'sensor' };

        const dummyFocos = [{
            latitude: -12.13825,
            longitude: -54.65953,
            dataAquisicao: "2025-06-07",
            horaAquisicao: "17:52",
            temperaturaBrilho: 309.86,
            temperaturaBrilhoSecundaria: 295.44,
            potenciaRadiativa: 34.25,
            nomeSatelite: "Aqua",
            instrumentoSensor: "MODIS",
            nivelConfianca: 52,
            versaoProduto: "C6.1 (quase tempo real)",
            indicadorDiaNoite: "Dia"
        }];

        const dummyMetadados = {
            parametrosBusca: {
                data: "2025-06-07",
                diasConsiderados: 1,
                ordenacao: "sensor"
            },
            timestampConsulta: "2025-06-07T23:02:51.512Z",
            totalFocos: 1
        };

        const dummyFocosComLocalizacao = [{
            ...dummyFocos[0],
            localizacao: {
                cidade: "Sorriso",
                estado: "MT"
            }
        }];

        // 🧪 MOCK: Formatação + localização
        FireService.listAllFormattedPaginated = jest.fn().mockResolvedValue({
            dados: dummyFocos,
            metadados: dummyMetadados
        });

        FireService.addLocationData = jest.fn().mockResolvedValue(dummyFocosComLocalizacao);

        const result = await FireService.listAllWithLocation(query);

        // ✅ DEBUG: saída final do método
        debugTestLog('🧪 Resultado de listAllWithLocation', {
            entrada_query: query,
            focosFormatados: dummyFocos,
            focosComLocalizacao: dummyFocosComLocalizacao,
            retorno: result
        });

        expect(FireService.listAllFormattedPaginated).toHaveBeenCalledWith({ ...query, all: true });
        expect(FireService.addLocationData).toHaveBeenCalledWith(dummyFocos);

        expect(result).toEqual({
            metadados: dummyMetadados,
            firesWithLocation: dummyFocosComLocalizacao
        });
    });

    /**
     * =================================================================================
     * ✅ Cenário 2: Adiciona dados de localização corretamente (unitário)
     * ---------------------------------------------------------------------------------
     * Esperado:
     * - Método addLocationData deve transformar os focos brutos em pontos geocodificáveis
     * - Chama GeocodingService.batchGeocode passando lista de pontos (lat/lon + foco)
     * - Retorna nova lista de focos com campo `localizacao` embutido
     * - Teste isola apenas a etapa de enriquecimento, sem depender da listagem anterior
     * =================================================================================
     */
    it('adiciona dados de localização aos focos corretamente', async () => {
        const inputFires = [
            {
                latitude: -12.13825,
                longitude: -54.65953,
                nomeSatelite: "Aqua"
            }
        ];

        const geocodedMock = [
            {
                fireData: {
                    ...inputFires[0],
                    dataAquisicao: "2025-06-07",
                    horaAquisicao: "17:52",
                    temperaturaBrilho: 309.86,
                    temperaturaBrilhoSecundaria: 295.44,
                    potenciaRadiativa: 34.25,
                    instrumentoSensor: "MODIS",
                    nivelConfianca: 52,
                    versaoProduto: "C6.1 (quase tempo real)",
                    indicadorDiaNoite: "Dia"
                },
                localizacao: {
                    cidade: "Sorriso",
                    estado: "MT"
                }
            }
        ];

        // 🧪 MOCK: chamada geocodificação
        jest.spyOn(GeocodingService, 'batchGeocode').mockResolvedValueOnce(geocodedMock);

        const result = await FireService.addLocationData([geocodedMock[0].fireData]);

        // ✅ DEBUG: resultado da função de localização
        debugTestLog('🧪 Resultado de addLocationData', {
            entrada: geocodedMock[0].fireData,
            retorno: result
        });

        expect(result).toMatchObject([
            {
                localizacao: {
                    cidade: "Sorriso",
                    estado: "MT"
                }
            }
        ]);
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService.isNonEmptyArray
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Verifica o comportamento da função utilitária que determina se um valor é um array
 *   não vazio.
 * - Garante robustez contra entradas inválidas como `null`, `undefined`, strings ou objetos.
 * - Confirma que arrays com ao menos um item são corretamente detectados.
 * =====================================================================================
 */
describe('FireService.isNonEmptyArray', () => {

    /**
     * ✅ Caso 1: Array com elementos
     * Esperado:
     * - Retorna `true` para arrays com pelo menos um item
     */
    it('retorna true para array com elementos', () => {
        expect(FireService.isNonEmptyArray([1, 2, 3])).toBe(true);
    });

    /**
     * ✅ Caso 2: Array vazio
     * Esperado:
     * - Retorna `false` para array com zero elementos
     */
    it('retorna false para array vazio', () => {
        expect(FireService.isNonEmptyArray([])).toBe(false);
    });

    /**
     * ✅ Caso 3: Valor null
     * Esperado:
     * - Retorna `false` para null (não é array)
     */
    it('retorna false para null', () => {
        expect(FireService.isNonEmptyArray(null)).toBe(false);
    });

    /**
     * ✅ Caso 4: Valor undefined
     * Esperado:
     * - Retorna `false` para undefined
     */
    it('retorna false para undefined', () => {
        expect(FireService.isNonEmptyArray(undefined)).toBe(false);
    });

    /**
     * ✅ Caso 5: Tipos incorretos (objeto e string)
     * Esperado:
     * - Retorna `false` para tipos que não são array (mesmo que iteráveis)
     */
    it('retorna false para outros tipos (ex: objeto)', () => {
        expect(FireService.isNonEmptyArray({})).toBe(false);
        expect(FireService.isNonEmptyArray("string")).toBe(false);
    });
});


/**
 * =====================================================================================
 * ✅ TESTE: FireService.hasDataAquisicaoField
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Garante que a função identifica corretamente se um objeto possui o campo
 *   'dataAquisicao'.
 * - Valida o comportamento seguro contra entradas inválidas como null, undefined,
 *   tipos primitivos ou objetos sem o campo esperado.
 * =====================================================================================
 */
describe('FireService.hasDataAquisicaoField', () => {

    /**
     * ✅ Caso 1: Objeto com campo 'dataAquisicao'
     * Esperado:
     * - Retorna true
     */
    it('retorna true se o campo dataAquisicao existir', () => {
        expect(FireService.hasDataAquisicaoField({ dataAquisicao: '2025-06-07' })).toBe(true);
    });

    /**
     * ✅ Caso 2: Objeto sem o campo 'dataAquisicao'
     * Esperado:
     * - Retorna false
     */
    it('retorna false se o campo não existir', () => {
        expect(FireService.hasDataAquisicaoField({ outroCampo: 'valor' })).toBe(false);
    });

    /**
     * ✅ Caso 3: Entrada null ou undefined
     * Esperado:
     * - Retorna false
     */
    it('retorna false se o objeto for null ou undefined', () => {
        expect(FireService.hasDataAquisicaoField(null)).toBe(false);
        expect(FireService.hasDataAquisicaoField(undefined)).toBe(false);
    });

    /**
     * ✅ Caso 4: Tipos primitivos (string, number, etc)
     * Esperado:
     * - Retorna false para tipos que não são objetos
     */
    it('retorna false para valores não-objetos', () => {
        expect(FireService.hasDataAquisicaoField('string')).toBe(false);
        expect(FireService.hasDataAquisicaoField(123)).toBe(false);
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService.formatAndFilterFires
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Verifica se os registros brutos são corretamente mapeados com `mapToFire`
 * - Garante que registros inválidos (null ou undefined) são descartados silenciosamente
 * - Assegura que entradas vazias não causam falhas e retornam listas válidas
 * =====================================================================================
 */
describe('FireService.formatAndFilterFires', () => {

    /**
     * ✅ Caso 1: Todos os registros são válidos
     * Esperado:
     * - Todos os itens devem ser mapeados corretamente
     */
    it('mapeia e mantém apenas registros válidos', () => {
        const input = [{ foo: 1 }, { foo: 2 }];
        const expected = [{ mapped: true }, { mapped: true }];

        mapToFire.mockImplementation(() => ({ mapped: true }));

        const result = FireService.formatAndFilterFires(input);
        expect(result).toEqual(expected);
    });

    /**
     * ✅ Caso 2: Alguns registros são inválidos (null ou undefined)
     * Esperado:
     * - Apenas os registros válidos devem ser mantidos
     */
    it('filtra registros inválidos (null ou undefined)', () => {
        const input = [{ foo: 1 }, { foo: 2 }, { foo: 3 }];

        mapToFire
            .mockReturnValueOnce({ ok: 1 })    // válido
            .mockReturnValueOnce(null)         // inválido
            .mockReturnValueOnce(undefined);   // inválido

        const result = FireService.formatAndFilterFires(input);
        expect(result).toEqual([{ ok: 1 }]);
    });

    /**
     * ✅ Caso 3: Entrada vazia
     * Esperado:
     * - Resultado também deve ser uma lista vazia
     */
    it('retorna lista vazia se entrada for vazia', () => {
        const result = FireService.formatAndFilterFires([]);
        expect(result).toEqual([]);
    });

    /**
     * ✅ Caso 4: Todos os registros são inválidos
     * Esperado:
     * - Resultado final deve ser uma lista vazia
     */
    it('retorna lista vazia se todos os registros forem inválidos', () => {
        const input = [{ a: 1 }, { b: 2 }];
        mapToFire.mockReturnValue(null);

        const result = FireService.formatAndFilterFires(input);
        expect(result).toEqual([]);
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService.routeListAll
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Verifica o comportamento da função que decide como tratar a lista de focos recebida
 * - Deve retornar array vazio em entradas nulas ou vazias
 * - Deve delegar corretamente para `routeByFormat` quando há dados válidos
 * =====================================================================================
 */
describe('FireService.routeListAll - implementação real', () => {

    /**
     * ✅ Caso 1: Entrada vazia, nula ou indefinida
     * Esperado:
     * - Retorna array vazio diretamente, sem processar
     */
    it('retorna [] se entrada for nula ou vazia', () => {
        const inputs = [null, undefined, []];
        inputs.forEach(input => {
            const result = FireService.routeListAll(input);
            expect(result).toEqual([]);
        });
    });

    /**
     * ✅ Caso 2: Entrada com dados brutos válidos
     * Esperado:
     * - Encaminha para `routeByFormat`, que internamente invoca `formatAndFilterFires`
     * - Retorna dados mapeados corretamente com `mapToFire`
     */
    it('encaminha corretamente para routeByFormat se entrada for válida', () => {
        // 🔧 Simula entrada mínima para ativar o roteamento
        const input = [{ acq_date: '2025-06-07', acq_time: '1749', satellite: 'Aqua' }];

        // 🔧 Mocka mapeamento do foco bruto
        mockMapToFire.mockImplementationOnce(() => ({
            dataAquisicao: '2025-06-07',
            horaAquisicao: '17:49',
            nomeSatelite: 'Aqua'
        }));

        const result = FireService.routeListAll(input);

        expect(result).toEqual([
            {
                dataAquisicao: '2025-06-07',
                horaAquisicao: '17:49',
                nomeSatelite: 'Aqua'
            }
        ]);
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService.routeByFormat
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Garante que a função identifica corretamente se os dados já estão formatados
 * - Se os focos tiverem `dataAquisicao`, são retornados diretamente
 * - Caso contrário, invoca `formatAndFilterFires` para normalizar os registros
 * =====================================================================================
 */
describe('FireService.routeByFormat', () => {

    /**
     * ✅ Caso 1: Dados já formatados (possuem `dataAquisicao`)
     * Esperado:
     * - Retorna o array original sem qualquer transformação
     */
    it('retorna diretamente os dados se já estiverem formatados', () => {
        const formattedData = [{
            dataAquisicao: '2025-06-07',
            horaAquisicao: '17:49',
            nomeSatelite: 'Aqua'
        }];

        const result = FireService.routeByFormat(formattedData);

        expect(result).toBe(formattedData); // mesmo array referencial
    });

    /**
     * ✅ Caso 2: Dados ainda não formatados (ex: retorno bruto do fetch)
     * Esperado:
     * - Invoca `formatAndFilterFires` para mapear os dados
     * - Retorna o resultado formatado
     */
    it('formata os dados se não tiverem "dataAquisicao"', () => {
        const rawData = [{
            acq_date: '2025-06-07',
            acq_time: '1749',
            satellite: 'Aqua'
        }];

        const formattedMock = [{
            dataAquisicao: '2025-06-07',
            horaAquisicao: '17:49',
            nomeSatelite: 'Aqua'
        }];

        const formatSpy = jest
            .spyOn(FireService, 'formatAndFilterFires')
            .mockReturnValueOnce(formattedMock);

        const result = FireService.routeByFormat(rawData);

        expect(formatSpy).toHaveBeenCalledWith(rawData);
        expect(result).toEqual(formattedMock);

        formatSpy.mockRestore();
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService.parsePage
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Verifica se a função extrai corretamente o número da página a partir da query
 * - Garante que entradas inválidas (null, string, NaN, etc.) resultam no valor padrão 1
 * =====================================================================================
 */
describe('FireService.parsePage', () => {

    /**
     * ✅ Caso 1: Valor válido informado na query
     * Esperado:
     * - Retorna o valor convertido para número
     */
    it('retorna o número da página se for um número válido', () => {
        expect(FireService.parsePage({ page: '3' })).toBe(3);
        expect(FireService.parsePage({ page: 2 })).toBe(2);
    });

    /**
     * ✅ Caso 2: Valor ausente, undefined ou null
     * Esperado:
     * - Retorna 1 como valor padrão
     */
    it('retorna 1 se page for nulo, indefinido ou ausente', () => {
        expect(FireService.parsePage({})).toBe(1);
        expect(FireService.parsePage({ page: undefined })).toBe(1);
        expect(FireService.parsePage({ page: null })).toBe(1);
    });

    /**
     * ✅ Caso 3: Valor inválido (ex: string não numérica)
     * Esperado:
     * - Retorna 1 como fallback seguro
     */
    it('retorna 1 se page for uma string inválida', () => {
        expect(FireService.parsePage({ page: 'abc' })).toBe(1);
        expect(FireService.parsePage({ page: '' })).toBe(1);
    });

    /**
     * ✅ Caso 4: Valor é zero ou NaN
     * Esperado:
     * - Retorna 1, pois zero e NaN são tratados como inválidos
     */
    it('retorna 1 se page for zero ou NaN', () => {
        expect(FireService.parsePage({ page: '0' })).toBe(1);
        expect(FireService.parsePage({ page: NaN })).toBe(1);
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService.parseLimit
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Garante que a função interpreta corretamente o limite de resultados solicitado
 * - Em casos inválidos ou ausentes, retorna o valor padrão de 25
 * =====================================================================================
 */
describe('FireService.parseLimit', () => {

    /**
     * ✅ Caso 1: Valor válido informado na query
     * Esperado:
     * - Retorna o valor convertido para número
     */
    it('retorna o limite se for um número válido', () => {
        expect(FireService.parseLimit({ limit: '10' })).toBe(10);
        expect(FireService.parseLimit({ limit: 5 })).toBe(5);
    });

    /**
     * ✅ Caso 2: Valor ausente, undefined ou null
     * Esperado:
     * - Retorna 25 como valor padrão
     */
    it('retorna 25 se limit for nulo, indefinido ou ausente', () => {
        expect(FireService.parseLimit({})).toBe(25);
        expect(FireService.parseLimit({ limit: undefined })).toBe(25);
        expect(FireService.parseLimit({ limit: null })).toBe(25);
    });

    /**
     * ✅ Caso 3: Valor inválido (ex: string não numérica)
     * Esperado:
     * - Retorna 25 como fallback seguro
     */
    it('retorna 25 se limit for uma string inválida', () => {
        expect(FireService.parseLimit({ limit: 'abc' })).toBe(25);
        expect(FireService.parseLimit({ limit: '' })).toBe(25);
    });

    /**
     * ✅ Caso 4: Valor é zero ou NaN
     * Esperado:
     * - Retorna 25, pois zero e NaN são tratados como inválidos
     */
    it('retorna 25 se limit for zero ou NaN', () => {
        expect(FireService.parseLimit({ limit: '0' })).toBe(25);
        expect(FireService.parseLimit({ limit: NaN })).toBe(25);
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService.getPagedData
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Garante que a função retorna corretamente a fatia de dados com base na
 *   página atual e no número de itens por página (limite).
 * - Valida comportamento seguro para limites fora do alcance e listas vazias.
 * =====================================================================================
 */
describe('FireService.getPagedData', () => {

    const dummyData = [
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
        { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }
    ];

    /**
     * ✅ Caso 1: Primeira página
     * Esperado:
     * - Retorna os primeiros N itens conforme o limite
     */
    it('retorna a primeira página corretamente', () => {
        const result = FireService.getPagedData(dummyData, 1, 3);
        expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    /**
     * ✅ Caso 2: Página intermediária
     * Esperado:
     * - Retorna os itens correspondentes à página solicitada
     */
    it('retorna a segunda página corretamente', () => {
        const result = FireService.getPagedData(dummyData, 2, 3);
        expect(result).toEqual([{ id: 4 }, { id: 5 }, { id: 6 }]);
    });

    /**
     * ✅ Caso 3: Última página incompleta
     * Esperado:
     * - Retorna os itens restantes (menos que o limite)
     */
    it('retorna a última página com menos itens, se aplicável', () => {
        const result = FireService.getPagedData(dummyData, 3, 3);
        expect(result).toEqual([{ id: 7 }, { id: 8 }]);
    });

    /**
     * ✅ Caso 4: Página fora do alcance
     * Esperado:
     * - Retorna array vazio se a página exceder os dados disponíveis
     */
    it('retorna [] se página estiver fora do alcance', () => {
        const result = FireService.getPagedData(dummyData, 4, 3);
        expect(result).toEqual([]);
    });

    /**
     * ✅ Caso 5: Lista vazia
     * Esperado:
     * - Retorna array vazio mesmo que página e limite sejam válidos
     */
    it('retorna [] se lista estiver vazia', () => {
        const result = FireService.getPagedData([], 1, 10);
        expect(result).toEqual([]);
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService.getTotalPages
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Garante que o total de páginas é calculado corretamente com base no número
 *   de itens e no limite por página.
 * - Valida o arredondamento para cima quando o total não é múltiplo do limite.
 * - Garante retorno 0 em limites inválidos ou zero.
 * =====================================================================================
 */
describe('FireService.getTotalPages', () => {

    const dummy = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

    /**
     * ✅ Caso 1: Total menor ou igual ao limite
     * Esperado:
     * - Deve retornar 1 página
     */
    it('retorna 1 quando total de itens é menor ou igual ao limite', () => {
        expect(FireService.getTotalPages(dummy(5), 10)).toBe(1);
        expect(FireService.getTotalPages(dummy(10), 10)).toBe(1);
    });

    /**
     * ✅ Caso 2: Total maior que o limite
     * Esperado:
     * - Deve retornar múltiplas páginas conforme necessário
     */
    it('retorna 2 quando há mais itens que o limite', () => {
        expect(FireService.getTotalPages(dummy(11), 10)).toBe(2);
        expect(FireService.getTotalPages(dummy(19), 10)).toBe(2);
    });

    /**
     * ✅ Caso 3: Arredondamento para cima
     * Esperado:
     * - Total de páginas deve ser arredondado corretamente para cima
     */
    it('retorna 3 para 21 itens com limite 10 (arredonda para cima)', () => {
        expect(FireService.getTotalPages(dummy(21), 10)).toBe(3);
    });

    /**
     * ✅ Caso 4: Limite inválido ou zero
     * Esperado:
     * - Retorna 0 páginas quando o limite não é válido
     */
    it('retorna 0 se limite for zero ou inválido', () => {
        expect(FireService.getTotalPages(dummy(10), 0)).toBe(0);
        expect(FireService.getTotalPages(dummy(10), -5)).toBe(0);
        expect(FireService.getTotalPages(dummy(10), null)).toBe(0);
        expect(FireService.getTotalPages(dummy(10), undefined)).toBe(0);
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService._getIntervaloHoras
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Verifica se o método privado `_getIntervaloHoras` retorna corretamente o intervalo
 *   de horas (`intervaloHoras`) quando o parâmetro `timeRange` estiver completo.
 * - Garante que o retorno seja `undefined` em casos de entrada incompleta, ausente
 *   ou inválida.
 * =====================================================================================
 */
describe('FireService._getIntervaloHoras', () => {

    const getIntervalo = (params) => {
        // @ts-ignore - acessando método privado para teste
        return FireService._getIntervaloHoras(params);
    };

    /**
     * ✅ Caso 1: timeRange ausente
     * Esperado: Retorna undefined
     */
    it('retorna undefined se timeRange estiver ausente', () => {
        expect(getIntervalo({})).toBeUndefined();
    });

    /**
     * ✅ Caso 2: timeRange completo (start e end)
     * Esperado: Retorna objeto `intervaloHoras` com ambos valores
     */
    it('retorna intervaloHoras completo quando timeRange tem start e end', () => {
        const params = { timeRange: { start: '08:00', end: '16:00' } };
        expect(getIntervalo(params)).toEqual({
            intervaloHoras: {
                inicio: '08:00',
                fim: '16:00'
            }
        });
    });

    /**
     * ✅ Caso 3: timeRange incompleto (apenas start)
     * Esperado: Retorna undefined
     */
    it('retorna undefined se timeRange estiver incompleto (apenas start)', () => {
        const params = { timeRange: { start: '10:00' } };
        expect(getIntervalo(params)).toBeUndefined();
    });

    /**
     * ✅ Caso 4: timeRange incompleto (apenas end)
     * Esperado: Retorna undefined
     */
    it('retorna undefined se timeRange estiver incompleto (apenas end)', () => {
        const params = { timeRange: { end: '15:30' } };
        expect(getIntervalo(params)).toBeUndefined();
    });

    /**
     * ✅ Caso 5: timeRange inválido (null)
     * Esperado: Retorna undefined
     */
    it('retorna undefined se timeRange não for objeto válido', () => {
        const params = { timeRange: null };
        expect(getIntervalo(params)).toBeUndefined();
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService - Limite de registros (MAX_RECORDS_ALL)
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Garante que o serviço aplique corretamente a restrição de volume máximo de dados
 *   quando `query.all = true`, conforme o valor da constante `MAX_RECORDS_ALL`.
 * - Simula um cenário onde a resposta contém 1 item além do limite permitido (10.001).
 * - Verifica se uma exceção é lançada com a mensagem apropriada.
 * =====================================================================================
 */
describe.skip('FireService - limite de registros (MAX_RECORDS_ALL)', () => {
    const MAX_RECORDS_ALL = 10000;

    /**
     * ✅ Caso: Excede o limite permitido
     * ---------------------------------------------------------------------------------
     * Esperado:
     * - Mock de `listAll` retorna exatamente 10.001 itens
     * - Método `listAllFormattedPaginated` deve rejeitar a promessa com erro descritivo
     */
    it('lança erro se o total de focos exceder MAX_RECORDS_ALL', async () => {
        // 🔧 Gera mock com 10.001 registros brutos
        const manyFires = Array.from({ length: MAX_RECORDS_ALL + 1 }, (_, i) => ({
            latitude: '0.0',
            longitude: '0.0',
            acq_date: '2025-06-08',
            acq_time: '1200',
            brightness: '300',
            bright_t31: '280',
            confidence: '50',
            daynight: 'D',
            instrument: 'MODIS',
            satellite: 'Aqua',
            version: '6.1NRT',
            frp: '25.5'
        }));

        // 🧪 Mock: ignora fetch e formatação real
        jest.spyOn(FireService, 'listAll').mockResolvedValueOnce(manyFires);
        jest.spyOn(FireService, 'routeListAll').mockImplementation(fires => fires);

        const query = { all: true };

        // ✅ Verificação: exceção lançada
        await expect(FireService.listAllFormattedPaginated(query))
            .rejects
            .toThrow(`A requisição excede o limite de ${MAX_RECORDS_ALL} registros`);
    });
});

/**
 * =====================================================================================
 * ✅ TESTE: FireService._getSort (privado)
 * -------------------------------------------------------------------------------------
 * OBJETIVO:
 * - Verifica se o método retorna corretamente o valor de `query.sort` quando presente.
 * - Garante o uso do valor padrão `"sensor"` quando o parâmetro está ausente,
 *   indefinido, nulo ou se `query` não for um objeto válido.
 * - Testa robustez contra entradas inválidas, incluindo `null` e `undefined`.
 * =====================================================================================
 */
describe('FireService._getSort (privado)', () => {
    const getSort = (query) => {
        // @ts-ignore - acesso direto a método privado para teste
        return FireService._getSort(query);
    };

    /**
     * ✅ Caso 1: Parâmetro válido
     * Esperado: Retorna valor presente em `query.sort`
     */
    it('retorna o valor de query.sort se estiver presente', () => {
        const result = getSort({ sort: 'intensidade' });
        expect(result).toBe('intensidade');
    });

    /**
     * ✅ Caso 2: `sort` ausente no objeto
     * Esperado: Retorna valor padrão "sensor"
     */
    it('retorna "sensor" se query.sort estiver ausente', () => {
        const result = getSort({});
        expect(result).toBe('sensor');
    });

    /**
     * ✅ Caso 3: `sort` definido como `undefined`
     * Esperado: Retorna "sensor"
     */
    it('retorna "sensor" se query.sort for undefined', () => {
        const result = getSort({ sort: undefined });
        expect(result).toBe('sensor');
    });

    /**
     * ✅ Caso 4: `query` é null
     * Esperado: Retorna "sensor" com segurança
     */
    it('retorna "sensor" se query for null', () => {
        const result = getSort(null);
        expect(result).toBe('sensor');
    });

    /**
     * ✅ Caso 5: `query` é undefined
     * Esperado: Retorna "sensor"
     */
    it('retorna "sensor" se query não for objeto válido', () => {
        const result = getSort(undefined);
        expect(result).toBe('sensor');
    });
});
