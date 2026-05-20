function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:3999`
  }
  return process.env.API_URL || "http://localhost:3999"
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, {
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
    throw new ApiError(message, res.status)
  }

  return res.json()
}
