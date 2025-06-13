// apis/mapbox/config/config.js

import dotenv from 'dotenv'
dotenv.config()

// eslint-disable-next-line no-undef
if (!process.env.MAPBOX_TOKEN) {
  throw new Error('Token do Mapbox não encontrado no arquivo .env')
}

// Usando export default para um objeto de configuração
const config = {
  // eslint-disable-next-line no-undef
  TOKEN: process.env.MAPBOX_TOKEN,
  BASE_URL: 'https://api.mapbox.com/search',
  TIMEOUT: 5000,
  RETRIES: 3,
  RATE_LIMIT: {
    MAX_REQUESTS_PER_SECOND: 4,
    WINDOW_MS: 1000, // 1 segundo em milissegundos
    DELAY_MS: 250 // 1000ms / 4 = 250ms entre requisições
  },
  GEOCODING: {
    DEFAULT_LANGUAGE: 'pt',
    LIMIT: 1,
    PERMANENT: false
  }
}

export default config
