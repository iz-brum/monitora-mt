import config from '../config/config.js'

class RateLimiter {
  constructor() {
    this.queue = []
    this.running = false
    this.lastRequestTime = 0
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this.process()
    })
  }

  async process() {
    if (this.running) return
    this.running = true

    try {
      await this.processQueue()
    } finally {
      this.running = false
    }
  }

  async processQueue() {
    while (this.queue.length > 0) {
      await this.handleRateLimit()
      await this.processQueueItem()
    }
  }

  async handleRateLimit() {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime

    if (timeSinceLastRequest < config.RATE_LIMIT.DELAY_MS) {
      await new Promise(resolve =>
        setTimeout(resolve, config.RATE_LIMIT.DELAY_MS - timeSinceLastRequest)
      )
    }
  }

  async processQueueItem() {
    const { fn, resolve, reject } = this.queue.shift()

    try {
      this.lastRequestTime = Date.now()
      const result = await fn()
      resolve(result)
    } catch (error) {
      reject(error)
    }
  }
}

export const rateLimiter = new RateLimiter()
