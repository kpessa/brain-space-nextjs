// Setup for API route testing
import '@testing-library/jest-dom'

// Mock Next.js server utilities
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url, init = {}) {
      this.url = url
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this.body = init.body
      this._bodyUsed = false
    }
    
    async json() {
      if (this._bodyUsed) {
        throw new Error('Body already read')
      }
      this._bodyUsed = true
      if (typeof this.body === 'string') {
        return JSON.parse(this.body)
      }
      return this.body || {}
    }
    
    clone() {
      return new NextRequest(this.url, {
        method: this.method,
        headers: Object.fromEntries(this.headers),
        body: this.body
      })
    }
  },
  
  NextResponse: class NextResponse {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new Map(Object.entries(init.headers || {}))
    }
    
    static json(data, init = {}) {
      const response = new NextResponse(JSON.stringify(data), init)
      response.headers.set('content-type', 'application/json')
      response._jsonData = data
      return response
    }
    
    async json() {
      if (this._jsonData) {
        return this._jsonData
      }
      return JSON.parse(this.body)
    }
  }
}))

// Global test utilities
global.Request = global.Request || class Request {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Headers(options.headers || {})
    this.body = options.body
  }
}

global.Response = global.Response || class Response {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.statusText = options.statusText || 'OK'
    this.headers = new Headers(options.headers || {})
  }
  
  async json() {
    return JSON.parse(this.body)
  }
}

global.Headers = global.Headers || class Headers {
  constructor(init = {}) {
    this._headers = {}
    Object.entries(init).forEach(([key, value]) => {
      this.set(key, value)
    })
  }
  
  set(key, value) {
    this._headers[key.toLowerCase()] = value
  }
  
  get(key) {
    return this._headers[key.toLowerCase()]
  }
}

// Mock crypto for UUID generation in tests
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    }
  }
}