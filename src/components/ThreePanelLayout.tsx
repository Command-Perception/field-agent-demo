"use client"

type ThreePanelLayoutProps = {
  left: React.ReactNode
  center: React.ReactNode
  right: React.ReactNode
}

export default function ThreePanelLayout({ left, center, right }: ThreePanelLayoutProps) {
  return (
    <div className="grid grid-cols-[280px_1fr_320px] min-h-[calc(100vh-57px)]">
      <div className="border-r border-gray-200 bg-gray-50 overflow-y-auto">
        {left}
      </div>
      <div className="overflow-y-auto bg-white">
        {center}
      </div>
      <div className="border-l border-gray-200 bg-gray-50 overflow-y-auto">
        {right}
      </div>
    </div>
  )
}
