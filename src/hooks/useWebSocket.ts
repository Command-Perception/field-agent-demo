"use client"

import { useEffect, useRef } from "react"
import { wsService } from "@/lib/ws"

type EventHandler = (data: Record<string, unknown>) => void

export function useWebSocket(handlers: Record<string, EventHandler>) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const unsubscribes: Array<() => void> = []

    for (const [event, handler] of Object.entries(handlers)) {
      const unsub = wsService.on(event, (data) => {
        handlersRef.current[event]?.(data)
      })
      unsubscribes.push(unsub)
    }

    wsService.connect()

    return () => {
      unsubscribes.forEach((fn) => fn())
    }
  }, [])
}
