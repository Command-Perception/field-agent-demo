import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agent System - Visit Follow-up",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
