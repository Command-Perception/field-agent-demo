type EventHandler = (data: Record<string, unknown>) => void

class WsService {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<EventHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private url = ""

  connect() {
    if (typeof window === "undefined") return
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    this.url = `${protocol}//${window.location.hostname}:3999/ws`
    this.doConnect()
  }

  private doConnect() {
    if (this.ws?.readyState === WebSocket.OPEN) return
    try {
      this.ws = new WebSocket(this.url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {}
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const { type, data } = msg
        const set = this.handlers.get(type)
        if (set) {
          set.forEach((fn) => fn(data))
        }
      } catch {}
    }
    this.ws.onclose = () => {
      this.scheduleReconnect()
    }
    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.doConnect()
    }, 3000)
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.handlers.clear()
  }

  on(type: string, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => this.off(type, handler)
  }

  off(type: string, handler: EventHandler) {
    this.handlers.get(type)?.delete(handler)
  }
}

export const wsService = new WsService()
