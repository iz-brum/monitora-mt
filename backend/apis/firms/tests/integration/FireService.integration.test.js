// ============================================================================
// 📄 ARQUIVO: backend/apis/firms/tests/integration/FireService.integration.test.js
// ----------------------------------------------------------------------------
// 🔎 PROPÓSITO:
// Testes de integração reais (sem mocks) para validar o comportamento do
// serviço `FireService.listAll`, incluindo integração com fetchers reais,
// transformação completa dos dados e estrutura esperada para uso no painel.
// ============================================================================

import { describe, it, expect, jest } from '@jest/globals';
import FireService from '#firms_services/FireService.js';
import { validateDateRange } from '#firms_utils/dateValidation.js';
import MockDate from 'mockdate';

// ============================================================================
// 🔇 SUPRESSÃO DE LOGS (antes/depois dos testes)
// ----------------------------------------------------------------------------
// Impede poluição do terminal por logs internos (console.log/warn) durante
// execução de testes, sem afetar produção.
// ============================================================================
let logSpy, warnSpy;

beforeAll(async () => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
});



// ============================================================================
// 🧪 TESTES DE INTEGRAÇÃO — FireService.listAll
// ----------------------------------------------------------------------------
// Validações feitas com fetch e transformação reais (sem mocks)
// ============================================================================
describe('🧪 INTEGRAÇÃO — FireService.listAll (sem mocks)', () => {

    /**
     * ✅ CENÁRIO 1: Estrutura completa de foco
     * ----------------------------------------------------------------------------
     * Garante que ao menos 1 foco retornado possua todos os campos essenciais
     * utilizados para visualização e cálculos estatísticos no painel.
     */
    it(
        'deve retornar focos com todos os campos essenciais usados no painel',
        async () => {
            // 🎯 Parâmetros de entrada realistas
            const input = { dt: '2025-06-09', dayRange: 1 };

            // 🚀 Executa função real
            const result = await FireService.listAll(input);

            // ✅ Verificações básicas
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);

            // 🔍 Validação de estrutura mínima esperada
            const foco = result[0];

            expect(foco).toEqual(expect.objectContaining({
                latitude: expect.any(Number),
                longitude: expect.any(Number),
                dataAquisicao: expect.any(String),
                horaAquisicao: expect.any(String),
                temperaturaBrilho: expect.any(Number),
                temperaturaBrilhoSecundaria: expect.any(Number),
                potenciaRadiativa: expect.any(Number)
            }));
        },
        15_000 // timeout estendido por segurança
    );

    /**
     * ✅ CENÁRIO 2: Consistência estatística dos dados
     * ----------------------------------------------------------------------------
     * Valida que pelo menos 90% dos focos retornados possuam os campos essenciais
     * para que os cálculos estatísticos no painel não sejam afetados.
     */
    it(
        'pelo menos 90% dos focos devem ter os campos críticos para estatística',
        async () => {
            const input = { dt: '2025-06-09', dayRange: 1 };
            const result = await FireService.listAll(input);

            const validCount = result.filter(foco =>
                typeof foco.latitude === 'number' &&
                typeof foco.longitude === 'number' &&
                typeof foco.dataAquisicao === 'string' &&
                typeof foco.horaAquisicao === 'string' &&
                typeof foco.temperaturaBrilho === 'number' &&
                typeof foco.temperaturaBrilhoSecundaria === 'number' &&
                typeof foco.potenciaRadiativa === 'number'
            ).length;

            const ratio = validCount / result.length;

            // ✅ Garante confiabilidade mínima
            expect(ratio).toBeGreaterThan(0.9);
        },
        15_000 // timeout estendido por segurança
    );

    it.only('não deve permitir intervalos que terminem no futuro (UTC seguro)', () => {
        MockDate.set('2025-06-09T03:00:00Z'); // UTC+0, 00:00 em MT (UTC-3 ou -4)

        expect(() => {
            validateDateRange('2025-06-09', 2); // Vai até 10/06
        }).toThrow('Intervalo solicitado termina no futuro');

        expect(() => {
            validateDateRange('2025-06-08', 2); // Vai até 09/06 23:59 UTC (ok)
        }).not.toThrow();

        MockDate.reset();
    });

});
