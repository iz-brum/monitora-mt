import axios from 'axios'
import config from '#mapbox_config/config.js'
import auth from '#mapbox_services/auth.js'
import { rateLimiter } from '#mapbox_utils/rateLimiter.js'

class MapboxHttp {
  constructor() {
    this.client = axios.create({
      baseURL: config.BASE_URL,
      timeout: config.TIMEOUT
    })
  }

  async executeRequest(url, params) {
    const authenticatedParams = auth.addAuthParams(params)
    const response = await this.client.get(url, {
      params: authenticatedParams
    })
    return response.data
  }

  handleRequestError(error) {
    if (error.response) {
      throw new Error(
        `Erro Mapbox: ${error.response.status} - ${error.response.data.message}`
      )
    }
    throw error
  }

  validateConfiguration() {
    if (!auth.isConfigured()) {
      throw new Error('Cliente Mapbox não configurado corretamente')
    }
  }

  async executeAuthenticatedRequest(url, params) {
    this.validateConfiguration()
    return await this.executeRequest(url, params)
  }

  async get(url, params = {}) {
    return rateLimiter.add(async () => {
      try {
        return await this.executeAuthenticatedRequest(url, params)
      } catch (error) {
        this.handleRequestError(error)
      }
    })
  }
}

// Exportando a classe ao invés da instância
export default MapboxHttp
