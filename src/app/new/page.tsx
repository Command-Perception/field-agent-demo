"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createVisit } from "@/lib/services/visits"

export default function NewVisitPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    account_name: "",
    account_industry: "",
    subject: "",
    notes: "",
    outcomes: "",
    owner_alias: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.account_name || !form.subject) {
      setError("Account name and subject are required")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const visit = await createVisit(form)
      router.push(`/visits/${visit.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create visit")
    } finally {
      setSubmitting(false)
    }
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <a href="/" className="text-sm text-blue-600 hover:underline">
            &larr; Dashboard
          </a>
          <h1 className="text-xl font-bold text-gray-900 mt-1">New Visit</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Account Name *
              </label>
              <input
                type="text"
                value={form.account_name}
                onChange={(e) => update("account_name", e.target.value)}
                placeholder="e.g. Acme Corp"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Industry
              </label>
              <input
                type="text"
                value={form.account_industry}
                onChange={(e) => update("account_industry", e.target.value)}
                placeholder="e.g. Healthcare"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Subject *
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="e.g. Q1 review meeting"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Detailed notes from the visit..."
              rows={5}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Outcomes
            </label>
            <textarea
              value={form.outcomes}
              onChange={(e) => update("outcomes", e.target.value)}
              placeholder="What was agreed, decided, or committed..."
              rows={4}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Owner
            </label>
            <input
              type="text"
              value={form.owner_alias}
              onChange={(e) => update("owner_alias", e.target.value)}
              placeholder="e.g. jdoe"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <a
              href="/"
              className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating..." : "Create Visit"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
