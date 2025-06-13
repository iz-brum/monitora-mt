// backend/apis/mapbox/services/MapboxReverseGeocoder.js

/**
 * 🗺️ MapboxHttp
 *
 * Serviço HTTP para requisições à API do Mapbox, usado para geocodificação reversa de coordenadas.
 */
import MapboxHttp from '#mapbox_services/http.js';

/**
 * 🧭 LocationCache
 *
 * Cache compartilhado para armazenar resultados de geocodificação de localizações,
 * evitando requisições desnecessárias a serviços externos.
 */
import LocationCache from '#shared_cache_locations/LocationCache.js';

/**
 * 🗺️ GeocodingService
 *
 * Serviço responsável por processar e gerenciar operações de geocodificação,
 * incluindo chamadas à API do Mapbox, controle de rate limit, tratamento de cache
 * e formatação dos resultados de localização para uso interno no sistema.
 */
class MapboxReverseGeocoder {
  /**
 * 🏗️ Construtor da GeocodingService
 *
 * Inicializa as configurações de controle de taxa, batch e instância HTTP do Mapbox para geocodificação.
 */
  constructor() {
    // 🚦 Instância para requisições HTTP ao Mapbox
    this.mapbox = new MapboxHttp()

    // 🔁 Configuração de tentativas e intervalos
    this.maxRetries = 3         // Máximo de tentativas em caso de erro
    this.initialDelay = 1000    // Delay inicial (ms) para backoff exponencial

    // 📦 Configuração de batch
    this.batchSize = 55         // Tamanho do lote para requisições em batch

    // ⚡ Controle de concorrência e rate limit
    this.maxConcurrent = 6     // Máximo de requisições concorrentes
    this.requestsPerMinute = 600 // Máximo de requisições por minuto
    this.requestCount = 0       // Contador de requisições no minuto atual
    this.lastResetTime = Date.now() // Timestamp do último reset do contador
  }

  // --- Controle de Rate Limit ---

  /**
   * 🚦 checkRateLimit
   *
   * Método principal para checar e aplicar o controle de limite de requisições por minuto.
   * Chama o handler de rate limit e incrementa o contador de requisições.
   *
   * @returns {Promise<boolean>} True quando a chamada pode prosseguir
   */
  async checkRateLimit() {
    await this.handleRateLimit()
    this.requestCount++
    return true
  }

  /**
   * ⏳ handleRateLimit
   *
   * Se necessário, espera até que o período do rate limit seja resetado antes de liberar novas requisições.
   *
   * @returns {Promise<void>}
   */
  async handleRateLimit() {
    if (this.needsRateReset()) {
      await this.waitAndResetLimit()
    }
  }

  /**
   * 🛑 needsRateReset
   *
   * Verifica se o limite de requisições por minuto foi atingido
   * ou se o tempo do contador já expirou.
   *
   * @returns {boolean} True se precisa resetar
   */
  needsRateReset() {
    const timeElapsed = Date.now() - this.lastResetTime
    return timeElapsed >= 60000 || this.requestCount >= this.requestsPerMinute
  }

  /**
   * 🕰️ waitAndResetLimit
   *
   * Calcula o tempo de espera necessário e aguarda até poder resetar o contador de requisições.
   *
   * @returns {Promise<void>}
   */
  async waitAndResetLimit() {
    const waitTime = this.calculateWaitTime()
    await this.handleWaitTime(waitTime)
    this.resetLimits()
    console.warn(`🕰️ Rate limit atingido. Aguardando ${waitTime}ms antes de continuar.`)
  }

  /**
   * ⏲️ calculateWaitTime
   *
   * Calcula quantos milissegundos ainda faltam para o próximo ciclo do rate limit.
   *
   * @returns {number} Tempo restante (ms) para liberar novas requisições
   */
  calculateWaitTime() {
    const timeElapsed = Date.now() - this.lastResetTime
    return timeElapsed >= 60000 ? 0 : 60000 - timeElapsed
  }

  /**
   * 💤 handleWaitTime
   *
   * Aguarda pelo tempo indicado, se necessário, antes de liberar novas requisições.
   *
   * @param {number} waitTime - Tempo de espera (ms)
   * @returns {Promise<void>}
   */
  async handleWaitTime(waitTime) {
    if (waitTime > 0) {
      await this.sleep(waitTime)
    }
  }

  /**
   * 🔄 resetLimits
   *
   * Reseta o contador de requisições e o timestamp do último reset para iniciar um novo ciclo de rate limit.
   */
  resetLimits() {
    this.requestCount = 0
    this.lastResetTime = Date.now()
  }

  /**
   * 💤 sleep
   *
   * Promessa utilitária para pausar a execução pelo tempo informado.
   *
   * @param {number} ms - Tempo de espera em milissegundos
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // --- Geocode com Retentativas ---

  /**
   * 📍 geocodeWithRetry
   *
   * Realiza a geocodificação de uma coordenada, aplicando retentativas automáticas em caso de falha.
   *
   * @param {Object} coord - Objeto com latitude e longitude
   * @param {number} [attempt=1] - Tentativa atual (usado internamente)
   * @returns {Promise<Object>} Objeto de localização enriquecida
   */
  async geocodeWithRetry(coord, attempt = 1) {
    return this._tryExecuteGeocoding(coord, attempt)
  }

  /**
   * 🔁 _tryExecuteGeocoding
   *
   * Tenta executar a geocodificação, capturando erros e delegando para o handler de retentativa se necessário.
   *
   * @param {Object} coord - Coordenadas
   * @param {number} attempt - Tentativa atual
   * @returns {Promise<Object>} Objeto de localização ou retentativa em caso de erro
   */
  async _tryExecuteGeocoding(coord, attempt) {
    try {
      return await this.executeGeocoding(coord)
    } catch (error) {
      return this.handleGeocodingError(error, coord, attempt)
    }
  }

  /**
   * 🗺️ executeGeocoding
   *
   * Realiza a chamada à API de geocodificação, faz parsing e validação da resposta.
   *
   * @param {Object} coord - Coordenadas
   * @returns {Promise<Object>} Objeto de localização já validado
   */
  async executeGeocoding(coord) {
    const result = await this.fetchGeocodingResult(coord)
    const location = this.parseLocation(result)
    this.validateLocation(location)
    return location
  }

  /**
   * 🌐 fetchGeocodingResult
   *
   * Executa a requisição HTTP para obter o resultado de geocodificação reversa.
   *
   * @param {Object} coord - Coordenadas { longitude, latitude }
   * @returns {Promise<Object>} Resposta da API Mapbox
   */
  async fetchGeocodingResult(coord) {
    return await this.mapbox.get('/geocode/v6/reverse', {
      longitude: coord.longitude,
      latitude: coord.latitude,
      language: 'pt',
      timeout: 10000
    })
  }

  /**
   * 🛡️ validateLocation
   *
   * Lança erro se o objeto de localização não contém cidade ou estado.
   *
   * @param {Object} location - Objeto de localização parseado
   */
  validateLocation(location) {
    if (!this.isValidLocation(location)) {
      throw new Error('Dados de localização incompletos')
    }
  }

  /**
   * 🏙️ _hasCidade
   *
   * Verifica se a propriedade cidade existe na localização.
   *
   * @private
   * @param {Object} location
   * @returns {boolean}
   */
  _hasCidade(location) {
    return !!location?.cidade
  }

  /**
   * 🏞️ _hasEstado
   *
   * Verifica se a propriedade estado existe na localização.
   *
   * @private
   * @param {Object} location
   * @returns {boolean}
   */
  _hasEstado(location) {
    return !!location?.estado
  }

  /**
   * ✅ isValidLocation
   *
   * Retorna true se a localização possuir ao menos cidade **ou** estado.
   *
   * @param {Object} location
   * @returns {boolean}
   */
  isValidLocation(location) {
    return this._hasCidade(location) || this._hasEstado(location)
  }

  /**
   * 🔁 handleGeocodingError
   *
   * Aplica retentativa com backoff exponencial em caso de erro de geocodificação.
   * Lança erro se atingiu o número máximo de tentativas.
   *
   * @param {Error} error - Erro ocorrido
   * @param {Object} coord - Coordenadas
   * @param {number} attempt - Tentativa atual
   * @returns {Promise<Object>} Nova tentativa ou exceção final
   */
  async handleGeocodingError(error, coord, attempt) {
    if (attempt >= this.maxRetries) {
      throw error
    }
    const delay = this.initialDelay * Math.pow(2, attempt - 1)
    await this.sleep(delay)
    return this.geocodeWithRetry(coord, attempt + 1)
  }

  // --- Batch ---

  /**
   * 📝 _checkCoordinates
   *
   * Verifica se o array de coordenadas é válido e não está vazio.
   *
   * @private
   * @param {Array<Object>} coordinates - Lista de coordenadas [{ latitude, longitude, ... }]
   * @returns {boolean} True se for um array não vazio
   */
  _checkCoordinates(coordinates) {
    return Array.isArray(coordinates) && coordinates.length > 0
  }

  /**
   * 📦 batchGeocode
   *
   * Executa o processo de geocodificação em batch para uma lista de coordenadas.
   * Se a lista for inválida ou vazia, retorna array vazio.
   *
   * @param {Array<Object>} coordinates - Lista de coordenadas
   * @returns {Promise<Array<Object>>} Resultados enriquecidos com localização
   */
  async batchGeocode(coordinates) {
    if (!this._checkCoordinates(coordinates)) return []
    return this._processGeocoding(coordinates)
  }

  /**
   * 🔀 _processGeocoding
   *
   * Separa as coordenadas em batches e processa todos, gerando o relatório final.
   *
   * @private
   * @param {Array<Object>} coordinates - Lista de coordenadas
   * @returns {Promise<Array<Object>>} Resultados finais filtrados
   */
  async _processGeocoding(coordinates) {
    const batches = this.createBatches(coordinates)
    const results = await this.processBatches(batches, coordinates)
    return this.generateFinalReport(results, coordinates)
  }

  /**
   * 🗂️ createBatches
   *
   * Divide o array de coordenadas em batches conforme o tamanho definido na configuração.
   *
   * @param {Array<Object>} coordinates
   * @returns {Array<Array<Object>>} Lista de batches
   */
  createBatches(coordinates) {
    const batches = []
    for (let i = 0; i < coordinates.length; i += this.batchSize) {
      batches.push(coordinates.slice(i, i + this.batchSize))
    }
    return batches
  }

  /**
   * ⚡ processBatches
   *
   * Processa todos os batches em paralelo, respeitando o máximo de concorrência definido.
   *
   * @param {Array<Array<Object>>} batches - Lista de batches
   * @returns {Promise<Array<Object>>} Resultados agregados
   */
  async processBatches(batches) {
    let results = []
    for (let i = 0; i < batches.length; i += this.maxConcurrent) {
      const currentBatches = batches.slice(i, i + this.maxConcurrent)
      const batchResults = await Promise.all(
        currentBatches.map(batch => this.processBatch(batch))
      )
      results = results.concat(batchResults.flat())
    }
    return results
  }

  /**
   * 🔁 processBatch
   *
   * Processa um único batch de coordenadas em paralelo.
   *
   * @param {Array<Object>} batch - Lista de coordenadas
   * @returns {Promise<Array<Object>>} Resultados processados (não nulos)
   */
  async processBatch(batch) {
    const promises = batch.map(coord => this.processCoordinate(coord))
    const results = await Promise.all(promises)
    return this.summarizeBatchResults(results)
  }

  /**
   * 📊 summarizeBatchResults
   *
   * Filtra resultados nulos de um batch.
   *
   * @param {Array<any>} results - Resultados do batch
   * @returns {Array<any>} Resultados válidos (não nulos)
   */
  summarizeBatchResults(results) {
    return results.filter(r => r !== null)
  }

  /**
   * 🧾 generateFinalReport
   *
   * Gera o relatório final, filtrando novamente resultados nulos (por garantia).
   *
   * @param {Array<any>} results - Todos os resultados dos batches
   * @returns {Array<any>} Resultados finais válidos
   */
  generateFinalReport(results) {
    return results.filter(r => r !== null)
  }

  /**
   * 🧭 processCoordinate
   *
   * Processa a geocodificação de uma única coordenada, aplicando validação e tratamento de erros.
   *
   * @param {Object} coord - Coordenada
   * @returns {Promise<Object|null>} Objeto de resultado ou null em caso de erro
   */
  async processCoordinate(coord) {
    try {
      const localizacao = await this.getLocation(coord)
      return this.validateAndReturnResult(coord, localizacao)
    } catch (error) {
      console.error(`❌ Erro: ${error.message}`)
      return null
    }
  }

  /**
   * 🗺️ getLocation
   *
   * Busca a localização de uma coordenada, consultando primeiro o cache, depois a API se necessário.
   *
   * @param {Object} coord - Coordenada { latitude, longitude }
   * @returns {Promise<Object>} Objeto de localização
   */
  async getLocation(coord) {
    let localizacao = await LocationCache.get(coord.latitude, coord.longitude)
    if (!localizacao) {
      localizacao = await this.fetchNewLocation(coord)
    }
    return localizacao
  }

  // --- Helpers para validação de coordenadas/locais ---

  /**
   * 🔢 _isValidNumber
   *
   * Verifica se um valor é um número finito (não NaN/infinito).
   *
   * @private
   * @param {any} n - Valor a ser verificado
   * @returns {boolean} True se é número finito
   */
  _isValidNumber(n) {
    return Number.isFinite(n)
  }

  /**
   * 🟩 _hasValidLocationAndLatitude
   *
   * Checa se a localização é válida **e** a latitude é um número válido.
   *
   * @private
   * @param {Object} localizacao
   * @param {number} latitude
   * @returns {boolean}
   */
  _hasValidLocationAndLatitude(localizacao, latitude) {
    return this.isValidLocation(localizacao) && this._isValidNumber(latitude)
  }

  /**
   * 🗂️ _shouldCacheLocation
   *
   * Define se a localização deve ser salva no cache (validando localização, latitude e longitude).
   *
   * @private
   * @param {Object} localizacao
   * @param {number} latitude
   * @param {number} longitude
   * @returns {boolean}
   */
  _shouldCacheLocation(localizacao, latitude, longitude) {
    if (!this._hasValidLocationAndLatitude(localizacao, latitude)) {
      return false
    }
    return this._isValidNumber(longitude)
  }

  /**
   * 🌐 fetchNewLocation
   *
   * Executa uma nova consulta de geocodificação reversa (via Mapbox), valida e (se adequado) salva o resultado no cache.
   *
   * @param {Object} coord - Objeto de coordenada { latitude, longitude }
   * @returns {Promise<Object>} Localização obtida da API
   */
  async fetchNewLocation(coord) {
    await this.checkRateLimit()
    const response = await this.mapbox.get('/geocode/v6/reverse', {
      longitude: coord.longitude,
      latitude: coord.latitude,
      language: 'pt'
    })
    const localizacao = this.parseLocation(response)
    const latitude = Number(coord.latitude)
    const longitude = Number(coord.longitude)

    if (!this._shouldCacheLocation(localizacao, latitude, longitude)) {
      console.warn('⚠️ Coordenada inválida NÃO será salva no cache:', coord, localizacao)
      return localizacao
    }

    await LocationCache.set({
      latitude,
      longitude,
      ...localizacao,
      outros_dados: response
    })

    return localizacao
  }

  /**
   * ✅ validateAndReturnResult
   *
   * Valida os dados de localização e retorna o resultado já formatado.
   *
   * @param {Object} coord - Coordenada original
   * @param {Object} localizacao - Dados de localização
   * @returns {Object} Resultado formatado para API
   */
  validateAndReturnResult(coord, localizacao) {
    this.validateLocationData(localizacao)
    return this.formatResult(coord, localizacao)
  }

  /**
   * 🛡️ validateLocationData
   *
   * Lança erro se faltar cidade ou estado nos dados de localização.
   *
   * @param {Object} localizacao - Dados de localização
   */
  validateLocationData(localizacao) {
    if (!this.hasRequiredData(localizacao)) {
      throw new Error('Dados incompletos')
    }
  }

  /**
   * 🔎 hasRequiredData
   *
   * Confere se cidade e estado estão presentes nos dados de localização.
   *
   * @param {Object} localizacao
   * @returns {boolean}
   */
  hasRequiredData(localizacao) {
    return this._hasCidade(localizacao) && this._hasEstado(localizacao)
  }

  /**
   * 🏷️ formatResult
   *
   * Monta o objeto final, agregando o campo de localização ao original.
   *
   * @param {Object} coord - Coordenada original
   * @param {Object} localizacao - Dados de localização
   * @returns {Object} Objeto final do batch
   */
  formatResult(coord, localizacao) {
    return { ...coord, localizacao }
  }

  // --- Helpers para parsing/extração ---

  /**
   * 🗺️ parseLocation
   *
   * Faz o parsing do resultado da geocodificação, extraindo e mapeando as propriedades do feature retornado.
   *
   * @param {Object} result - Resposta da API de geocodificação
   * @returns {Object|null} Propriedades de localização mapeadas, ou null em caso de falha
   */
  parseLocation(result) {
    const props = this.extractAndValidateProperties(result)
    return props ? this.mapProperties(props) : null
  }

  /**
   * 🧹 extractAndValidateProperties
   *
   * Tenta extrair as propriedades do resultado e loga qualquer erro encontrado.
   *
   * @param {Object} result - Resposta da API
   * @returns {Object|null} Propriedades extraídas ou null
   */
  extractAndValidateProperties(result) {
    try {
      return this.extractProperties(result)
    } catch (error) {
      this.logExtractionError(error)
      return null
    }
  }

  /**
   * 🛑 logExtractionError
   *
   * Loga no console qualquer erro de extração das propriedades do resultado.
   *
   * @param {Error} error
   */
  logExtractionError(error) {
    console.error('❌ Erro ao processar localização:', error)
  }

  /**
   * 🧲 extractProperties
   *
   * Extrai as propriedades do primeiro feature válido no resultado.
   *
   * @param {Object} result - Resposta da API
   * @returns {Object|null} Propriedades do primeiro feature ou null
   */
  extractProperties(result) {
    return this.getFeatureProperties(result) ?? null
  }

  /**
   * 🧩 _getFeatures
   *
   * Retorna o array de features do resultado, se presente.
   *
   * @private
   * @param {Object} result - Resposta da API
   * @returns {Array|undefined} Array de features
   */
  _getFeatures(result) {
    return result && result.features
  }

  /**
   * 🟩 _isNonEmptyArray
   *
   * Checa se o parâmetro é um array não vazio.
   *
   * @private
   * @param {any} arr
   * @returns {boolean}
   */
  _isNonEmptyArray(arr) {
    return Array.isArray(arr) && arr.length > 0
  }

  /**
   * 🥇 _getFirstFeature
   *
   * Retorna o primeiro elemento do array de features, se houver.
   *
   * @private
   * @param {Array} features
   * @returns {Object|null}
   */
  _getFirstFeature(features) {
    if (!this._isNonEmptyArray(features)) return null
    return features[0]
  }

  /**
   * 🏷️ getFeatureProperties
   *
   * Retorna as propriedades do primeiro feature do resultado, se houver.
   *
   * @param {Object} result - Resposta da API
   * @returns {Object|null} Propriedades do primeiro feature ou null
   */
  getFeatureProperties(result) {
    const features = this._getFeatures(result)
    const firstFeature = this._getFirstFeature(features)
    return firstFeature ? firstFeature.properties : null
  }

  // --- Helpers para acesso nested ---

  /**
   * 🔑 hasKey
   *
   * Verifica se o objeto possui a chave informada.
   *
   * @static
   * @param {Object} obj - Objeto a ser testado
   * @param {string} key - Nome da propriedade
   * @returns {boolean} True se o objeto possui a chave
   */
  static hasKey(obj, key) {
    return obj && (key in obj)
  }

  /**
   * 🗝️ _getValue
   *
   * Retorna o valor da chave, se existir, ou null.
   *
   * @private
   * @param {Object} obj - Objeto
   * @param {string} key - Chave de acesso
   * @returns {any} Valor da chave ou null
   */
  _getValue(obj, key) {
    return MapboxReverseGeocoder.hasKey(obj, key) ? obj[key] : null
  }

  /**
   * 🔗 _getSegments
   *
   * Divide um path de acesso nested (ex: "context.place.name") em um array de segmentos.
   *
   * @private
   * @param {string} path - String com os segmentos separados por "."
   * @returns {Array<string>} Array de segmentos
   */
  _getSegments(path) {
    return path.split('.')
  }

  /**
   * 🧬 _getNestedValue
   *
   * Busca recursivamente o valor de um path nested em um objeto, usando os segmentos.
   *
   * @private
   * @param {Object} obj - Objeto de origem
   * @param {string} path - Path em notação ponto ("a.b.c")
   * @returns {any} Valor encontrado ou null
   */
  _getNestedValue(obj, path) {
    const segments = this._getSegments(path)
    return segments.reduce((current, segment) => this._getValue(current, segment), obj)
  }

  /**
   * 🏷️ mapProperties
   *
   * Faz o mapeamento das propriedades do resultado da geocodificação para o modelo interno utilizado pelo sistema.
   *
   * - tipo: feature_type
   * - nome: name
   * - endereco: full_address
   * - bairro: context.neighborhood.name
   * - cidade: context.place.name
   * - estado: context.region.name
   * - pais: context.country.name
   * - cep: context.postcode.name
   *
   * @param {Object} props - Propriedades brutas do feature retornado da API
   * @returns {Object} Propriedades normalizadas para uso interno
   */
  mapProperties(props) {
    const propertyMap = {
      tipo: 'feature_type',
      nome: 'name',
      endereco: 'full_address',
      bairro: 'context.neighborhood.name',
      cidade: 'context.place.name',
      estado: 'context.region.name',
      pais: 'context.country.name',
      cep: 'context.postcode.name'
    }

    return Object.entries(propertyMap).reduce((acc, [key, path]) => {
      acc[key] = this._getNestedValue(props, path)
      return acc
    }, {})
  }
}

/**
 * 🗺️ Exportação singleton da GeocodingService.
 *
 * Exporta uma única instância compartilhada do serviço de geocodificação para uso global na aplicação.
 */
export default new MapboxReverseGeocoder ()
