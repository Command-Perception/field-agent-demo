"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type ReplaySpeed = "fast" | "normal" | "slow"

type PlaybackControlsProps = {
  cursor: number
  total: number
  speed: ReplaySpeed
  autoplay: boolean
  isAtStart: boolean
  isAtEnd: boolean
  onPrev: () => void
  onNext: () => void
  onSpeedChange: (speed: ReplaySpeed) => void
  onToggleAutoplay: () => void
}

const SPEED_LABELS: Record<ReplaySpeed, string> = {
  fast: "Fast",
  normal: "Normal",
  slow: "Slow",
}

export default function PlaybackControls({
  cursor, total, speed, autoplay, isAtStart, isAtEnd,
  onPrev, onNext, onSpeedChange, onToggleAutoplay,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={isAtStart}>
          ← Prev
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={isAtEnd}>
          Next →
        </Button>
        <span className="text-xs text-gray-500 ml-2">
          Step {cursor + 1} of {total}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={autoplay ? "default" : "outline"}
          size="sm"
          onClick={onToggleAutoplay}
          disabled={isAtEnd}
        >
          {autoplay ? "⏸ Pause" : "▶ Play"}
        </Button>

        <div className="flex gap-1">
          {(["fast", "normal", "slow"] as ReplaySpeed[]).map((s) => (
            <Badge
              key={s}
              variant={speed === s ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => onSpeedChange(s)}
            >
              {SPEED_LABELS[s]}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
