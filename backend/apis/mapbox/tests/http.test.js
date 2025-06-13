import MapboxHttp from '../services/http.js'

async function testarCliente() {
  const client = new MapboxHttp()

  console.log('Iniciando teste do cliente Mapbox...\n')

  try {
    // Teste de geocodificação reversa com coordenadas do Rio de Janeiro
    const resultado = await client.get('/geocode/v6/reverse', {
      longitude: -52.98239,
      latitude: -13.49236,
      language: 'pt'
    })

    console.log('✓ Cliente configurado corretamente')
    console.log('✓ Resposta recebida com sucesso')

    if (resultado.features && resultado.features.length > 0) {
      const endereco = resultado.features[0].properties.full_address
      console.log('\nLocalização encontrada:', endereco)

      // Exibindo informações detalhadas
      const props = resultado.features[0].properties
      console.log('\nDetalhes:')
      console.log('- Tipo:', props.feature_type || 'N/A')
      console.log('- Nome:', props.name || 'N/A')
      console.log('- Bairro:', props.context.neighborhood?.name || 'N/A')
      console.log('- Cidade:', props.context.place?.name || 'N/A')
      console.log('- Estado:', props.context.region?.name || 'N/A')
      console.log('- País:', props.context.country?.name || 'N/A')
      console.log('- CEP:', props.context.postcode?.name || 'N/A')
    } else {
      console.log('\nNenhuma localização encontrada nas coordenadas especificadas')
    }
  } catch (error) {
    console.error('Erro no teste:', error.message)
  }
}

testarCliente()
