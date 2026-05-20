import { WebSocketServer, WebSocket } from "ws"
import type { Server } from "http"

type WSEvent = {
  type: string
  data: Record<string, unknown>
}

let wss: WebSocketServer | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

export function initWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" })

  wss.on("connection", (ws) => {
    ws.on("pong", () => {
      ;(ws as any).isAlive = true
    })
    ;(ws as any).isAlive = true
  })

  heartbeatTimer = setInterval(() => {
    if (!wss) return
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) return ws.terminate()
      ;(ws as any).isAlive = false
      ws.ping()
    })
  }, 30000)

  wss.on("close", () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
  })
}

export function closeWebSocketServer() {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  if (wss) {
    wss.clients.forEach((client) => client.close())
    wss.close()
    wss = null
  }
}

export function emit(event: string, data: Record<string, unknown>) {
  if (!wss) return
  const message: WSEvent = { type: event, data }
  const raw = JSON.stringify(message)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(raw)
    }
  })
}
