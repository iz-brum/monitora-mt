import config from '../config/config.js'

class MapboxAuth {
  constructor() {
    this.token = config.TOKEN
  }

  addAuthParams(params = {}) {
    return {
      ...params,
      access_token: this.token
    }
  }

  isConfigured() {
    return Boolean(this.token && this.token.length > 0)
  }
}

// Mudando para export default
export default new MapboxAuth()
