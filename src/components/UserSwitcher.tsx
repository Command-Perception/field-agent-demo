"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type UserRole = {
  value: string
  label: string
  initials: string
}

const ROLES: UserRole[] = [
  { value: "sales", label: "John Doe (Sales)", initials: "JD" },
  { value: "maintenance", label: "Jane Smith (Maintenance)", initials: "JS" },
  { value: "admin", label: "Admin", initials: "AD" },
]

export default function UserSwitcher() {
  const [current, setCurrent] = useState(ROLES[0])
  const [colorIndex, setColorIndex] = useState(0)
  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500"]

  return (
    <Select
      value={current.value}
      onValueChange={(val) => {
        const role = ROLES.find((r) => r.value === val) || ROLES[0]
        setCurrent(role)
        setColorIndex(ROLES.indexOf(role))
      }}
    >
      <SelectTrigger className="w-56 h-9 bg-slate-700 border-slate-600 text-white text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full ${colors[colorIndex]} flex items-center justify-center text-[10px] font-bold text-white`}>
            {current.initials}
          </div>
          <SelectValue placeholder="Select user" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role, i) => (
          <SelectItem key={role.value} value={role.value}>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full ${colors[i]} flex items-center justify-center text-[10px] font-bold text-white`}>
                {role.initials}
              </div>
              <span>{role.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
