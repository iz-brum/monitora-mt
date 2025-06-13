import { CacheCore } from '#firms_utils/CacheCore.js'

describe('CacheCore', () => {
    beforeEach(() => {
        CacheCore.limparTodosCaches()
        CacheCore.ativarCache()
    })

    describe('controle global de cache', () => {
        test('cache começa ativo', () => {
            expect(CacheCore.isAtivo()).toBe(true)
        })

        test('desativar e ativar cache', () => {
            CacheCore.desativarCache()
            expect(CacheCore.isAtivo()).toBe(false)

            CacheCore.ativarCache()
            expect(CacheCore.isAtivo()).toBe(true)
        })
    })

    describe('setComTTL e getValido', () => {
        test('armazena e recupera valor válido dentro do TTL', () => {
            CacheCore.setComTTL(CacheCore.resultadoCache, 'chave1', 'valor1', 1000)
            expect(CacheCore.getValido(CacheCore.resultadoCache, 'chave1')).toBe('valor1')
        })

        test('remove valor expirado', () => {
            CacheCore.setComTTL(CacheCore.resultadoCache, 'chave2', 'valor2', 1) // TTL curtíssimo

            // Espera TTL expirar
            return new Promise((resolve) => {
                setTimeout(() => {
                    expect(CacheCore.getValido(CacheCore.resultadoCache, 'chave2')).toBeNull()
                    resolve()
                }, 10)
            })
        })

        test('retorna null para chave inexistente', () => {
            expect(CacheCore.getValido(CacheCore.resultadoCache, 'naoExiste')).toBeNull()
        })
    })

    describe('geração de chaves', () => {
        test('gerarChaveSensor retorna string JSON', () => {
            const key = CacheCore.gerarChaveSensor('MODIS', [1, 2, 3, 4], 5, '2025-01-01')
            expect(typeof key).toBe('string')
            expect(JSON.parse(key)).toEqual({
                sensor: 'MODIS',
                bbox: [1, 2, 3, 4],
                dayRange: 5,
                date: '2025-01-01',
            })
        })

        test('gerarChaveResultado retorna string JSON', () => {
            const key = CacheCore.gerarChaveResultado({
                dayRange: 3,
                date: '2025-01-02',
                timeRange: { start: '10:00', end: '12:00' }
            })
            expect(typeof key).toBe('string')
            expect(JSON.parse(key)).toHaveProperty('timeRange.start', '10:00')
        })

        test('gerarChaveFireStats retorna string JSON', () => {
            const key = CacheCore.gerarChaveFireStats({ sensor: 'VIIRS', zona: 'A' })
            expect(typeof key).toBe('string')
            expect(JSON.parse(key)).toEqual({ sensor: 'VIIRS', zona: 'A' })
        })
    })

    describe('limparTodosCaches', () => {
        test('limpa todas as instâncias de cache', () => {
            CacheCore.setComTTL(CacheCore.sensorCache, 'x', 'valor')
            CacheCore.setComTTL(CacheCore.resultadoCache, 'y', 'valor')
            CacheCore.setComTTL(CacheCore.fireStatsCache, 'z', 'valor')
            CacheCore.inFlightRequests.set('r', 'requisicao')

            CacheCore.limparTodosCaches()

            expect(CacheCore.sensorCache.size).toBe(0)
            expect(CacheCore.resultadoCache.size).toBe(0)
            expect(CacheCore.fireStatsCache.size).toBe(0)
            expect(CacheCore.inFlightRequests.size).toBe(0)
        })
    })
})
