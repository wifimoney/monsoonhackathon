import { cn } from "@/lib/utils"

interface TerminalOutputProps {
  content: string
  className?: string
}

export function TerminalOutput({ content, className }: TerminalOutputProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-black border border-border/50 p-4 font-mono text-xs text-emerald-400 overflow-auto",
        className,
      )}
    >
      <pre className="whitespace-pre-wrap">{content}</pre>
    </div>
  )
}
