import type { ReactNode } from "react"

const toneStyles = {
  green: "border-emerald-600/20 bg-emerald-50 text-emerald-700",
  amber: "border-amber-600/20 bg-amber-50 text-amber-700",
  red: "border-red-600/20 bg-red-50 text-red-700",
  neutral: "border-black/10 bg-black/[0.035] text-black/55",
  blue: "border-blue-600/20 bg-blue-50 text-blue-700",
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: keyof typeof toneStyles
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] tracking-wide ${toneStyles[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
