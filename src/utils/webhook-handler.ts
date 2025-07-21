import { Context } from 'koishi'
import { createHmac } from 'crypto'

export interface WebhookEvent<T = any> {
  type: string
  payload: T
}

export interface WebhookHandlerOptions {
  secret?: string
  path?: string
}

export class WebhookHandler {
  private handlers: Map<string, Function[]> = new Map()
  
  constructor(private options: WebhookHandlerOptions = {}) {}

  on(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
  }

  emit(event: string, data: any) {
    const handlers = this.handlers.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in webhook handler for event ${event}:`, error)
      }
    })
  }

  verifySignature(signature: string, payload: string): boolean {
    if (!this.options.secret) return true
    
    const hmac = createHmac('sha256', this.options.secret)
    hmac.update(payload)
    const expectedSignature = 'sha256=' + hmac.digest('hex')
    
    return signature === expectedSignature
  }

  handleRequest(body: any, headers: any) {
    const event = headers['x-github-event']
    const signature = headers['x-hub-signature-256']
    
    if (!event) {
      throw new Error('Missing x-github-event header')
    }

    const payload = typeof body === 'string' ? body : JSON.stringify(body)
    
    if (this.options.secret && !this.verifySignature(signature, payload)) {
      throw new Error('Invalid signature')
    }

    const parsedBody = typeof body === 'string' ? JSON.parse(body) : body
    
    this.emit(event, { type: event, payload: parsedBody })
  }
}

export function createWebhookHandler(options: WebhookHandlerOptions = {}) {
  return new WebhookHandler(options)
}
