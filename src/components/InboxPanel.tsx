"use client"

import { useEffect, useState } from "react"
import { listEmails } from "@/lib/services/flows"
import type { MockEmail } from "@/agent/types"

type InboxPanelProps = {
  onSelectEmail: (email: MockEmail) => void
  selectedId?: string
}

export default function InboxPanel({ onSelectEmail, selectedId }: InboxPanelProps) {
  const [emails, setEmails] = useState<MockEmail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listEmails()
      .then(setEmails)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const unreadCount = emails.filter((e) => !e.read).length

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Inbox</h3>
        {unreadCount > 0 && (
          <span className="bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="h-[300px] overflow-y-auto space-y-2">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-8">Loading...</p>
        ) : emails.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No emails</p>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={`rounded-lg p-3 cursor-pointer transition-all ${
                selectedId === email.id
                  ? "bg-white border border-blue-500 shadow-sm ring-1 ring-blue-200"
                  : email.read
                  ? "bg-white border border-gray-200 hover:border-blue-300"
                  : "bg-white border border-blue-300 hover:border-blue-500"
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm ${email.read ? "font-normal text-gray-700" : "font-semibold text-gray-900"}`}>
                  {email.subject}
                </span>
                <span className="text-xs text-gray-400 ml-2 shrink-0">
                  {new Date(email.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{email.body}</p>
              <div className="mt-1.5">
                <span className="inline-block border border-gray-200 rounded px-1.5 py-0.5 text-[10px] text-gray-500">
                  {email.flow_hint}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
