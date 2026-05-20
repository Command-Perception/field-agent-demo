"use client"

import { useState, useCallback, useEffect } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import type { ExecutionEvent, FlowTrace } from "@/agent/types"

type ReplaySpeed = "fast" | "normal" | "slow"

const SPEED_DELAYS: Record<ReplaySpeed, number> = {
  fast: 100,
  normal: 500,
  slow: 1000,
}

export type ReplayState = {
  trace: FlowTrace | null
  cursor: number
  currentEvent: ExecutionEvent | null
  visibleEvents: ExecutionEvent[]
  speed: ReplaySpeed
  isAtStart: boolean
  isAtEnd: boolean
  autoplay: boolean
}

export type ReplayControls = {
  next: () => void
  prev: () => void
  jumpTo: (index: number) => void
  setSpeed: (speed: ReplaySpeed) => void
  toggleAutoplay: () => void
  loadTrace: (trace: FlowTrace) => void
  clearTrace: () => void
}

export function useExecutionReplay(): [ReplayState, ReplayControls] {
  const [trace, setTrace] = useState<FlowTrace | null>(null)
  const [cursor, setCursor] = useState(0)
  const [speed, setSpeed] = useState<ReplaySpeed>("normal")
  const [autoplay, setAutoplay] = useState(false)

  const events = trace?.events ?? []

  const next = useCallback(() => {
    setCursor(c => Math.min(c + 1, events.length - 1))
  }, [events.length])

  const prev = useCallback(() => {
    setCursor(c => Math.max(c - 1, 0))
  }, [])

  const jumpTo = useCallback((index: number) => {
    setCursor(Math.max(0, Math.min(index, events.length - 1)))
  }, [events.length])

  const loadTrace = useCallback((newTrace: FlowTrace) => {
    setTrace(newTrace)
    setCursor(0)
    setAutoplay(false)
  }, [])

  const clearTrace = useCallback(() => {
    setTrace(null)
    setCursor(0)
    setAutoplay(false)
  }, [])

  const toggleAutoplay = useCallback(() => {
    setAutoplay(a => !a)
  }, [])

  useHotkeys("arrowright", next, { enabled: events.length > 0 }, [events.length])
  useHotkeys("arrowleft", prev, { enabled: events.length > 0 }, [])

  useEffect(() => {
    if (!autoplay || cursor >= events.length - 1) {
      setAutoplay(false)
      return
    }
    const timer = setTimeout(next, SPEED_DELAYS[speed])
    return () => clearTimeout(timer)
  }, [autoplay, cursor, speed, events.length, next])

  const state: ReplayState = {
    trace,
    cursor,
    currentEvent: events[cursor] ?? null,
    visibleEvents: events.slice(0, cursor + 1),
    speed,
    isAtStart: cursor === 0,
    isAtEnd: cursor >= events.length - 1,
    autoplay,
  }

  const controls: ReplayControls = {
    next, prev, jumpTo, setSpeed, toggleAutoplay, loadTrace, clearTrace,
  }

  return [state, controls]
}
