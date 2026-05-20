import { WebSocketServer, WebSocket } from "ws"
import type { Server } from "http"

type WSEvent = {
  type: string
  data: Record<string, unknown>
}

let wss: WebSocketServer | null = null

export function initWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" })

  wss.on("connection", (ws) => {
    ws.on("close", () => {})
  })
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
