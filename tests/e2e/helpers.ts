import WebSocket from "ws"
import * as fs from "fs"
import * as path from "path"

const BASE_URL = process.env.API_URL || "http://localhost:3999"
const WS_URL = BASE_URL.replace(/^http/, "ws")
const LOG_DIR = path.join(__dirname, "logs")

function log(message: string) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}\n`
  fs.appendFileSync(path.join(LOG_DIR, "e2e-run.log"), line)
}

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  log(`→ ${options.method || "GET"} ${path}`)
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
    log(`✗ ${options.method || "GET"} ${path} → ${res.status}: ${message}`)
    throw new Error(message)
  }
  log(`✓ ${options.method || "GET"} ${path} → ${res.status}`)
  return res.json()
}

export function connectWs(): Promise<WebSocket> {
  log(`→ WS connect ${WS_URL}/ws`)
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}/ws`)
    ws.onopen = () => {
      log(`✓ WS connected`)
      resolve(ws)
    }
    ws.onerror = () => {
      log(`✗ WS connection failed`)
      reject(new Error("WebSocket connection failed"))
    }
    setTimeout(() => {
      log(`✗ WS connection timeout`)
      reject(new Error("WebSocket connection timeout"))
    }, 5000)
  })
}

export function waitForWsEvent(
  ws: WebSocket,
  eventType: string,
  timeout = 30000
): Promise<Record<string, unknown>> {
  log(`→ waiting for WS event: ${eventType} (timeout: ${timeout}ms)`)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", handler as any)
      log(`✗ WS event timeout: ${eventType}`)
      reject(new Error(`Timeout waiting for event: ${eventType}`))
    }, timeout)

    function handler(data: WebSocket.Data) {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === eventType) {
          clearTimeout(timer)
          log(`✓ WS event received: ${eventType}`)
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
  log(`→ waiting for run to complete (visitId: ${visitId}, timeout: ${timeout}ms)`)
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const visit: any = await apiRequest(`/api/visits/${visitId}`)
    const run = visit.runs?.[0]
    if (!run) {
      await sleep(1000)
      continue
    }
    if (run.status === "completed" || run.status === "waiting_on_human" || run.status === "failed") {
      log(`✓ run complete: ${run.status}`)
      return run.status
    }
    await sleep(2000)
  }
  log(`✗ run did not complete within timeout`)
  throw new Error(`Run did not complete within ${timeout}ms`)
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
