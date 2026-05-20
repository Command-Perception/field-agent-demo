"use client"

type Artifact = {
  id: string
  type: string
  title: string
  content?: string
  version: number
  created_at: string
}

type ArtifactViewerProps = {
  artifact: Artifact
  expanded: boolean
  onToggle: () => void
}

function EmailPreview({ content }: { content?: string }) {
  const to = content?.match(/To:\s*(.+)/)?.[1] || ""
  const subject = content?.match(/Subject:\s*(.+)/)?.[1] || ""
  const body = content?.split("\n").slice(2).join("\n").trim() || content || ""

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-col gap-0.5">
        <p className="text-xs text-gray-500"><span className="font-medium">To:</span> {to}</p>
        <p className="text-xs text-gray-500"><span className="font-medium">Subject:</span> {subject}</p>
      </div>
      <div className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">{body}</div>
    </div>
  )
}

function ProposalPreview({ content }: { content?: string }) {
  const lines = content?.split("\n") || []
  const title = lines[0] || ""
  const body = lines.slice(1).join("\n")

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-bold text-gray-900 mb-3">{title}</h4>
      <div className="text-sm text-gray-700 whitespace-pre-wrap">{body}</div>
    </div>
  )
}

function ResearchPreview({ content }: { content?: string }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-blue-50 p-4">
      <div className="text-sm text-gray-700 whitespace-pre-wrap">{content}</div>
    </div>
  )
}

function NotePreview({ content }: { content?: string }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-yellow-50 p-4">
      <div className="text-sm text-gray-700 whitespace-pre-wrap">{content}</div>
    </div>
  )
}

function ExpensePreview({ content }: { content?: string }) {
  const isFlagged = content?.startsWith("FLAGGED")
  return (
    <div
      className={`border rounded-lg p-4 ${
        isFlagged ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isFlagged ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"
          }`}
        >
          {isFlagged ? "FLAGGED" : "APPROVED"}
        </span>
      </div>
      <div className="text-sm text-gray-700 whitespace-pre-wrap">{content}</div>
    </div>
  )
}

export default function ArtifactViewer({ artifact, expanded, onToggle }: ArtifactViewerProps) {
  const renderPreview = () => {
    switch (artifact.type) {
      case "email_draft":
        return <EmailPreview content={artifact.content} />
      case "proposal":
        return <ProposalPreview content={artifact.content} />
      case "research":
        return <ResearchPreview content={artifact.content} />
      case "expense_check":
        return <ExpensePreview content={artifact.content} />
      case "note":
        return <NotePreview content={artifact.content} />
      default:
        return (
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">
            {artifact.content}
          </pre>
        )
    }
  }

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      analysis: "bg-purple-100 text-purple-700",
      email_draft: "bg-blue-100 text-blue-700",
      research: "bg-cyan-100 text-cyan-700",
      proposal: "bg-indigo-100 text-indigo-700",
      expense_check: "bg-orange-100 text-orange-700",
      note: "bg-yellow-100 text-yellow-700",
    }
    return colors[type] || "bg-gray-100 text-gray-700"
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-gray-50 rounded-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${typeBadge(artifact.type)}`}>
            {artifact.type.replace("_", " ")}
          </span>
          <span className="text-sm font-medium text-gray-700 truncate">{artifact.title}</span>
        </div>
        <span className="text-xs text-gray-400 shrink-0 ml-2">
          {expanded ? "▲" : "▼"}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2">
          {renderPreview()}
        </div>
      )}
    </div>
  )
}
