import type React from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = "confirmed" | "denied" | "pending"

interface StatusBadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  denied: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
}

const dotStyles: Record<BadgeVariant, string> = {
  confirmed: "bg-emerald-400",
  denied: "bg-red-400",
  pending: "bg-yellow-400",
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
        variantStyles[variant],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[variant])} />
      {children}
    </span>
  )
}
