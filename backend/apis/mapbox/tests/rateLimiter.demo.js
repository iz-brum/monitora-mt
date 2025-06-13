import MapboxHttp from '../services/http.js'

async function demonstrarRateLimiter() {
  const client = new MapboxHttp()
  const startTime = Date.now()

  // Coordenadas de diferentes regiões do MT
  const coordenadas = [
    { nome: 'Cuiabá', longitude: -56.0988, latitude: -15.5989 },
    { nome: 'Rondonópolis', longitude: -54.7056, latitude: -15.8941 },
    { nome: 'Sinop', longitude: -55.4154, latitude: -12.5437 },
    { nome: 'Cáceres', longitude: -57.6542, latitude: -16.0662 },
    { nome: 'Água Boa', longitude: -50.6657, latitude: -13.0388 },
    { nome: 'Vila Bela', longitude: -59.3195, latitude: -15.0058 },
    { nome: 'Nova Xavantina', longitude: -54.3515, latitude: -14.6913 },
    { nome: 'São Félix do Araguaia', longitude: -52.2610, latitude: -12.6819 }
  ]

  console.log('\nIniciando demonstração do Rate Limiter com locais do MT...\n')

  for (const [index, coord] of coordenadas.entries()) {
    try {
      const resultado = await client.get('/geocode/v6/reverse', {
        longitude: coord.longitude,
        latitude: coord.latitude,
        language: 'pt'
      })

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`\n=== Requisição ${index + 1} (${coord.nome}) - ${elapsed}s ===`)

      if (resultado.features?.length > 0) {
        const props = resultado.features[0].properties
        console.log('Endereço:', props.full_address)
        console.log('\nDetalhes:')
        console.log('- Tipo:', props.feature_type || 'N/A')
        console.log('- Nome:', props.name || 'N/A')
        console.log('- Bairro:', props.context?.neighborhood?.name || 'N/A')
        console.log('- Cidade:', props.context?.place?.name || 'N/A')
        console.log('- Estado:', props.context?.region?.name || 'N/A')
        console.log('- País:', props.context?.country?.name || 'N/A')
        console.log('- CEP:', props.context?.postcode?.name || 'N/A')
      } else {
        console.log('Nenhuma localização encontrada')
      }
      console.log('='.repeat(50))
    } catch (error) {
      console.error(`Erro ao buscar ${coord.nome}:`, error.message)
    }
  }

  const duration = (Date.now() - startTime) / 1000
  console.log(`\nDemonstração concluída em ${duration.toFixed(2)}s`)
}

demonstrarRateLimiter()
