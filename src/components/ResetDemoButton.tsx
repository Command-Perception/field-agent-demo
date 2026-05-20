"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/client"

type ResetDemoButtonProps = {
  onReset?: () => void
}

export default function ResetDemoButton({ onReset }: ResetDemoButtonProps) {
  const [resetting, setResetting] = useState(false)

  async function handleReset() {
    if (!confirm("Reset demo state? This will clear all data and re-seed.")) return
    setResetting(true)
    try {
      await apiRequest("/api/reset", { method: "POST" })
      onReset?.()
    } catch (err) {
      console.error("Reset failed:", err)
    } finally {
      setResetting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReset}
      disabled={resetting}
      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
    >
      {resetting ? "Resetting..." : "↻ Reset Demo"}
    </Button>
  )
}
