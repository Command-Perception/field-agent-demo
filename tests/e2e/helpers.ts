import WebSocket from "ws"

const BASE_URL = process.env.API_URL || "http://localhost:3999"
const WS_URL = BASE_URL.replace(/^http/, "ws")

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const data = await res.json()
      message = data.error || message
    } catch {}
    throw new Error(message)
  }
  return res.json()
}

export function connectWs(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}/ws`)
    ws.onopen = () => resolve(ws)
    ws.onerror = () => reject(new Error("WebSocket connection failed"))
    setTimeout(() => reject(new Error("WebSocket connection timeout")), 5000)
  })
}

export function waitForWsEvent(
  ws: WebSocket,
  eventType: string,
  timeout = 30000
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", handler as any)
      reject(new Error(`Timeout waiting for event: ${eventType}`))
    }, timeout)

    function handler(data: WebSocket.Data) {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === eventType) {
          clearTimeout(timer)
          resolve(msg.data)
        }
      } catch {}
    }

    ws.on("message", handler)
  })
}

export async function waitForRunComplete(
  visitId: string,
  timeout = 60000
): Promise<string> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const visit: any = await apiRequest(`/api/visits/${visitId}`)
    const run = visit.runs?.[0]
    if (!run) {
      await sleep(1000)
      continue
    }
    if (run.status === "completed" || run.status === "waiting_on_human" || run.status === "failed") {
      return run.status
    }
    await sleep(2000)
  }
  throw new Error(`Run did not complete within ${timeout}ms`)
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
