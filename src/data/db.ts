import { Pool, PoolClient } from "pg"

let pool: Pool | null = null

export function initializePool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export async function query(text: string, params?: unknown[]) {
  const p = initializePool()
  const result = await p.query(text, params)
  return result.rows
}

export async function getClient(): Promise<PoolClient> {
  const p = initializePool()
  return p.connect()
}
