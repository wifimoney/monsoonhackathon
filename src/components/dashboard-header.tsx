"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAccount, useDisconnect } from "wagmi"
import { readContract } from "@wagmi/core"
import { wagmiConfig } from "@/lib/wagmi"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, CreditCard, RefreshCw, Send, Wallet } from "lucide-react"
import { ConnectWallet } from "./connect-wallet"
import { CrossChainExchange } from "./cross-chain-exchange"
import { CrossChainBridge } from "./cross-chain-bridge"

const navItems = [
  { name: "Agent", href: "/dashboard/agent" },
  { name: "Trade", href: "/dashboard/trade" },
  { name: "Portfolio", href: "/dashboard/portfolio" },
  { name: "Vault", href: "/dashboard/vault" },
  { name: "Orderbook", href: "/dashboard/orderbook" },
  { name: "Guardians", href: "/dashboard/guardians" },
  { name: "Audit", href: "/dashboard/audit" },
]

const walletActions = [
  { name: "Deposit", icon: ArrowDownToLine },
  { name: "Bridge", icon: RefreshCw },
  { name: "Withdraw", icon: ArrowUpFromLine },
]

// HyperEVM USDC address and chain ID
const HYPEREVM_CHAIN_ID = 999
const HYPEREVM_USDC_ADDRESS = "0xb88339CB7199b77E23DB6E890353E22632Ba630f" as `0x${string}`
const USDC_DECIMALS = 6

// ERC20 balanceOf ABI
const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

// Format token amount from raw to human-readable (with 3 decimal places)
const formatTokenAmount = (amount: string, decimals: number): string => {
  if (!amount || amount === "0") return "0.000"
  const padded = amount.padStart(decimals + 1, "0")
  const whole = padded.slice(0, -decimals) || "0"
  const fraction = padded.slice(-decimals)
  
  // Convert to number and format to 3 decimal places
  const numericValue = parseFloat(`${whole}.${fraction}`)
  return numericValue.toFixed(3)
}

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [showCrossChainModal, setShowCrossChainModal] = useState(false)
  const [modalType, setModalType] = useState<'deposit' | 'bridge'>('deposit')
  const [mounted, setMounted] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const previousBalanceRef = useRef<string | null>(null)

  // Ensure component is mounted for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch USDC balance on HyperEVM
  useEffect(() => {
    const fetchUSDCBalance = async () => {
      if (!isConnected || !address) {
        setUsdcBalance(null)
        previousBalanceRef.current = null
        setIsLoadingBalance(false)
        return
      }

      // Only show loading on the very first load when we have no previous balance
      // For periodic refreshes, fetch silently without showing loading
      const hasPreviousBalance = previousBalanceRef.current !== null
      
      if (!hasPreviousBalance) {
        setIsLoadingBalance(true)
      }

      try {
        const balance = await readContract(wagmiConfig, {
          address: HYPEREVM_USDC_ADDRESS,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
          chainId: HYPEREVM_CHAIN_ID,
        })

        const formattedBalance = formatTokenAmount(balance.toString(), USDC_DECIMALS)
        const newBalanceNum = parseFloat(formattedBalance)
        
        if (!hasPreviousBalance) {
          // First load - always set and clear loading
          setUsdcBalance(formattedBalance)
          previousBalanceRef.current = formattedBalance
          setIsLoadingBalance(false)
        } else if (previousBalanceRef.current !== null) {
          // Subsequent loads - check difference before updating
          const currentBalanceNum = parseFloat(previousBalanceRef.current)
          const difference = Math.abs(newBalanceNum - currentBalanceNum)
          
          // Only update if difference is more than 0.0001
          // Don't show loading for small differences (< 0.001) as per user requirement
          if (difference > 0.0001) {
            setUsdcBalance(formattedBalance)
            previousBalanceRef.current = formattedBalance
          }
          // If difference is <= 0.0001, don't update (prevents unnecessary re-renders)
        }
      } catch (error) {
        console.error("[DashboardHeader] Error fetching USDC balance:", error)
        // Only clear balance on error if we don't have a previous value
        if (!hasPreviousBalance) {
          setUsdcBalance(null)
        }
        setIsLoadingBalance(false)
      }
    }

    // Fetch balance once on mount or when address changes
    fetchUSDCBalance()
  }, [isConnected, address])

  const handleDisconnect = () => {
    disconnect()
    router.push("/")
  }

  const handleWalletAction = (actionName: string) => {
    if (actionName === "Deposit") {
      console.log(`[DashboardHeader] ${actionName} clicked, opening deposit modal`)
      setModalType('deposit')
      setShowCrossChainModal(true)
    } else if (actionName === "Bridge") {
      console.log(`[DashboardHeader] ${actionName} clicked, opening bridge modal`)
      setModalType('bridge')
      setShowCrossChainModal(true)
    }
    // Add other action handlers here as needed
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

        {/* Wallet Connection */}
        {isConnected && address ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border/60 bg-black/50 hover:bg-white/5 font-mono text-sm gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                {address.slice(0, 6)}...{address.slice(-4)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-black/95 border-border/60 backdrop-blur-xl">
              {/* USDC Balance Display */}
              <div className="px-3 py-2 border-b border-border/40">
                <div className="text-xs text-muted-foreground mb-1">USDC on HyperEVM</div>
                <div className="text-sm font-semibold text-foreground">
                  {isLoadingBalance ? (
                    <span className="text-muted-foreground">Loading...</span>
                  ) : usdcBalance !== null ? (
                    `${usdcBalance} USDC`
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator className="bg-border/40" />
              {walletActions.map((action) => (
                <DropdownMenuItem
                  key={action.name}
                  onClick={() => handleWalletAction(action.name)}
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
        ) : (
          <ConnectWallet />
        )}
      </div>

      {/* Cross Chain Exchange Modal (Deposit) or Bridge Modal - Rendered in Portal */}
      {mounted && showCrossChainModal && createPortal(
        modalType === 'deposit' ? (
          <CrossChainExchange onClose={() => setShowCrossChainModal(false)} />
        ) : (
          <CrossChainBridge onClose={() => setShowCrossChainModal(false)} />
        ),
        document.body
      )}
    </header>
  )
}
