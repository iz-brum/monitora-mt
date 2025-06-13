import { describe, it, expect } from 'vitest'
import MapboxHttp from '../services/http.js'

describe('Rate Limiter do MapboxHttp', () => {
  it('deve respeitar o limite de 4 requisições por segundo', async() => {
    const client = new MapboxHttp()
    const startTime = Date.now()

    // Coordenadas de diferentes regiões do MT
    const coordenadas = [
      { longitude: -56.0988, latitude: -15.5989 }, // Cuiabá
      { longitude: -54.7056, latitude: -15.8941 }, // Rondonópolis
      { longitude: -55.4154, latitude: -12.5437 }, // Sinop
      { longitude: -57.6542, latitude: -16.0662 }, // Cáceres
      { longitude: -50.6657, latitude: -13.0388 }, // Água Boa
      { longitude: -59.3195, latitude: -15.0058 }, // Vila Bela da Santíssima Trindade
      { longitude: -54.3515, latitude: -14.6913 }, // Nova Xavantina
      { longitude: -52.2610, latitude: -12.6819 } // São Félix do Araguaia
    ]

    console.log('\nIniciando teste de rate limiting com diferentes locais do MT...')

    // Cria 8 requisições para testar o limite de 4/segundo
    const promises = coordenadas.map((coord, index) =>
      client.get('/geocode/v6/reverse', {
        longitude: coord.longitude,
        latitude: coord.latitude,
        language: 'pt'
      }).then(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
        console.log(`✓ Requisição ${index + 1} (${coord.longitude}, ${coord.latitude}) completada em ${elapsed}s`)
      })
    )

    // Aguarda todas as requisições
    await Promise.all(promises)
    const duration = Date.now() - startTime

    // Verifica se demorou pelo menos 1.75s (7 reqs / 4 por segundo)
    expect(duration).toBeGreaterThanOrEqual(1750)
    console.log(`\nTeste concluído em ${(duration / 1000).toFixed(2)}s`)
  }, 10000) // timeout de 10s para o teste
})
