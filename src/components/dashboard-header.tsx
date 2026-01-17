"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, CreditCard, RefreshCw, Send } from "lucide-react"

const navItems = [
  { name: "Trade", href: "/dashboard/trade" },
  { name: "Agent", href: "/dashboard/agent" },
  { name: "Vault", href: "/dashboard/vault" },
  { name: "Orderbook", href: "/dashboard/orderbook" },
  { name: "Pear", href: "/dashboard/pear" },
  { name: "Guardians", href: "/dashboard/guardians" },
  { name: "Audit", href: "/dashboard/audit" },
]

const walletActions = [
  { name: "Deposit", icon: ArrowDownToLine },
  { name: "Bridge", icon: RefreshCw },
  { name: "Swap", icon: ArrowLeftRight },
  { name: "Buy", icon: CreditCard },
  { name: "Transfer", icon: Send },
  { name: "Withdraw", icon: ArrowUpFromLine },
]

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(true)
  const walletAddress = "0x7a16...3f9E"

  const handleDisconnect = () => {
    setIsConnected(false)
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/dashboard/trade" className="flex items-center gap-2">
          <svg className="h-7 w-7 text-primary" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 4L4 12v8l12 8 12-8v-8L16 4z" />
            <path d="M4 12l12 8 12-8" />
            <path d="M16 20v8" />
          </svg>
          <span className="bg-gradient-to-r from-primary to-red-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            Monsoon
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "px-3 py-2 text-sm font-medium tracking-tight transition-colors rounded-md",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border/60 bg-black/50 hover:bg-white/5 font-mono text-sm gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {walletAddress}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-black/95 border-border/60 backdrop-blur-xl">
            {walletActions.map((action) => (
              <DropdownMenuItem
                key={action.name}
                className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground focus:text-foreground focus:bg-white/5"
              >
                <action.icon className="h-4 w-4" />
                <span className="font-medium tracking-tight">{action.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuItem
              onClick={handleDisconnect}
              className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10"
            >
              <span className="font-medium tracking-tight">Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
