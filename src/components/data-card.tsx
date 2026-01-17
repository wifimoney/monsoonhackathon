import { cn } from "@/lib/utils"

interface DataCardProps {
  title: string
  value: string | number
  subtitle?: string
  className?: string
}

export function DataCard({ title, value, subtitle, className }: DataCardProps) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm", className)}>
      <p className="text-label">{title}</p>
      <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-foreground">{value}</p>
      {subtitle && <p className="mt-1 text-caption">{subtitle}</p>}
    </div>
  )
}
