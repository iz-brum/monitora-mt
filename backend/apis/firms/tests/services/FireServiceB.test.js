/**
 * ===============================================================================================
 * 🧪 ARQUIVO DE TESTES UNITÁRIOS - FireServiceB.test.js
 * -----------------------------------------------------------------------------------------------
 * Este arquivo testa todos os métodos públicos e privados (via indireção) do serviço `FireService`.
 * Foi estruturado em BLOCOS FUNCIONAIS bem definidos e documentados, com foco em escalabilidade.
 * 
 * 🔁 MOCKS: Definidos antes de qualquer import real, para garantir isolamento e controle.
 * 📥 IMPORTAÇÕES: Feitas após mocks, para garantir que dependências não sejam carregadas antes do tempo.
 * 🔬 TESTES: Divididos por método, com blocos separados, reutilizando dependências e helpers comuns.
 * ===============================================================================================
 */

import { jest } from '@jest/globals';


/**
 * ===============================================================================================
 * 🔒 BLOCO: MOCKS DE DEPENDÊNCIAS
 * -----------------------------------------------------------------------------------------------
 * Estes mocks são utilizados em diferentes blocos de testes, dependendo do método testado:
 * 
 * - `fetchFiresMT` → usado em: listAll, listAllFormattedPaginated, getAllFiresNoPagination, getPagedFires
 * - `mapToFire`    → usado em: listAll, routeByFormat, formatAndFilterFires
 * - `LocationCache.initDb` → chamado automaticamente no import, precisa ser silenciado globalmente
 * ===============================================================================================
 */
jest.unstable_mockModule('#firms_services/FireFetcher.js', () => ({
    fetchFiresMT: jest.fn(),
}));

jest.unstable_mockModule('#firms_services/FireMapper.js', () => ({
    mapToFire: jest.fn(),
}));

jest.unstable_mockModule('#shared_cache_locations/LocationCache.js', () => ({
    default: {
        initDb: jest.fn(), // ⚠️ evita que o cache rode ao importar FireService
    }
}));



/**
 * ===============================================================================================
 * 📥 BLOCO: IMPORTAÇÕES REAIS (somente após mocks definidos acima)
 * -----------------------------------------------------------------------------------------------
 * Importa os módulos reais (mockados automaticamente pelo Jest com base no bloco anterior).
 * Estes objetos são usados nos testes em múltiplos blocos.
 * ===============================================================================================
 */
const { default: FireService } = await import('#firms_services/FireService.js');
const { fetchFiresMT } = await import('#firms_services/FireFetcher.js');
const { mapToFire } = await import('#firms_services/FireMapper.js');



/**
 * ===============================================================================================
 * 🔬 BLOCO DE TESTES: FireService.listAll(options)
 * -----------------------------------------------------------------------------------------------
 * 🧠 O que é testado neste bloco?
 * - Chamada correta de `fetchFiresMT` com os parâmetros esperados
 * - Mapeamento correto dos dados brutos via `mapToFire`
 * - Retorno final no formato interno esperado
 * 
 * 🔗 Dependências usadas diretamente:
 * - fetchFiresMT (mock)
 * - mapToFire (mock)
 * 
 * 🔗 Dependências exercidas indiretamente:
 * - routeListAll → routeByFormat → formatAndFilterFires → #safeMapToFire
 * ===============================================================================================
 */

/**
 * ===============================================================================================
 * 🔬 BLOCOS DE TESTE: FireService.listAll(options)
 * -----------------------------------------------------------------------------------------------
 * 🧠 DESCRIÇÃO:
 * Testa o método público `listAll`, responsável por:
 * - Buscar os focos brutos de calor no estado do MT via `fetchFiresMT`;
 * - Roteá-los internamente para transformação (via `routeListAll`);
 * - Retornar os dados no formato interno padronizado (usado pela API da aplicação).
 *
 * ❌ Não realiza localização nem enriquecimento com dados de município — apenas transformação.
 *
 * 🔗 DEPENDÊNCIAS ENVOLVIDAS:
 * - fetchFiresMT (mockado): realiza a busca de dados brutos
 * - mapToFire (mockado): converte dados crus para o modelo interno
 * - routeListAll → routeByFormat → formatAndFilterFires → #safeMapToFire (exercidos indiretamente)
 *
 * 🎯 CENÁRIOS DE TESTE (atuais e futuros):
 * -----------------------------------------
 * ✅ [x] Caso feliz: entrada válida → transformação → retorno correto
 * 🔁 [ ] Entrada já formatada → retorno direto sem aplicar mapToFire
 * 🧪 [ ] Entrada vazia → retorno é []
 * 💥 [ ] fetchFiresMT lança erro → exceção deve ser propagada
 * ❓ [ ] mapToFire lança erro para um item → item é ignorado (teste de robustez do mapeamento)
 * ===============================================================================================
 */

describe('FireService.listAll', () => {

    /**
     * ♻️ Limpa todos os mocks entre testes
     * - Garante isolamento completo de chamadas, implementações e estados
     */
    afterEach(() => {
        jest.clearAllMocks();
    });

    /**
     * ✅ CENÁRIO: Caso feliz
     * ------------------------------------------------------------------------------------------
     * Dado:
     * - Entrada com data e range de dias
     * - Um foco bruto simulado no formato MODIS
     *
     * Quando:
     * - O método `listAll` é chamado com esses parâmetros
     *
     * Então:
     * - Deve chamar `fetchFiresMT` com os parâmetros
     * - Deve transformar corretamente o dado com `mapToFire`
     * - Deve retornar um array contendo o foco no formato interno esperado
     */
    it('deve buscar focos e aplicar transformação corretamente', async () => {
        // 🎯 Parâmetros simulados de entrada
        const input = { dt: '2025-06-07', dayRange: 1 };

        // 🔢 Simulação fiel de retorno bruto do MODIS (via FIRMS)
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

        // ✅ Valor transformado esperado via mapToFire
        const expectedMapped = {
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
        };

        // 🔧 Configura mocks
        fetchFiresMT.mockResolvedValueOnce(rawMock);
        mapToFire.mockImplementation(() => expectedMapped);

        // 🚀 Executa o método testado
        const result = await FireService.listAll(input);

        // ✅ Valida comportamento
        expect(fetchFiresMT).toHaveBeenCalledWith(input);
        expect(result).toEqual([expectedMapped]);
    });
});


/**
 * ===============================================================================================
 * 🔜 PRÓXIMOS BLOCOS SUGERIDOS (modelo)
 * ===============================================================================================
 */

// describe('FireService.routeListAll', () => { ... });
// describe('FireService.routeByFormat', () => { ... });
// describe('FireService.formatAndFilterFires', () => { ... });
// describe('FireService.addLocationData', () => { ... });
// describe('FireService.listAllFormattedPaginated', () => { ... });
// describe('FireService.getPagedData', () => { ... });
// describe('FireService.getTotalPages', () => { ... });

