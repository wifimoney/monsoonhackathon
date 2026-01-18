"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import {
  getWalletClient,
  switchChain,
  readContract,
  getPublicClient,
} from "@wagmi/core"
import { executeRoute, getRoutes, createConfig as createLiFiConfig, EVM } from "@lifi/sdk"
import { arbitrum, mainnet, optimism, polygon, base, bsc, avalanche } from "viem/chains"
import { defineChain } from "viem"
import { wagmiConfig } from "@/lib/wagmi"

// HyperEVM chain definition
const hyperEVM = defineChain({
  id: 999,
  name: "HyperEVM",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.hyperliquid.xyz/evm"],
    },
  },
  blockExplorers: {
    default: {
      name: "HyperEVM Explorer",
      url: "https://explorer.hyperliquid.xyz",
    },
  },
  testnet: false,
})

// HyperEVM constants
const HYPEREVM_USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f" as `0x${string}`
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ArrowDown, Loader2, CheckCircle2, XCircle } from "lucide-react"

// Only allow bridging FROM other chains TO HyperEVM (exclude HyperEVM as source)
const SUPPORTED_CHAINS = [mainnet, arbitrum, optimism, polygon, base, bsc, avalanche]

const CHAIN_ICONS: Record<number, string> = {
  [mainnet.id]: "ETH",
  [arbitrum.id]: "ARB",
  [optimism.id]: "OP",
  [polygon.id]: "MATIC",
  [base.id]: "BASE",
  [bsc.id]: "BNB",
  [avalanche.id]: "AVAX",
  [hyperEVM.id]: "HYPE",
}

const ASSETS: Record<number, { symbol: string; name: string; address: string; decimals: number }[]> = {
  1: [
    { symbol: "ETH", name: "Ethereum", address: "0x0000000000000000000000000000000000000000", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
    { symbol: "USDT", name: "Tether", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  ],
  42161: [
    { symbol: "ETH", name: "Ethereum", address: "0x0000000000000000000000000000000000000000", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    { symbol: "ARB", name: "Arbitrum", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18 },
  ],
  10: [
    { symbol: "ETH", name: "Ethereum", address: "0x0000000000000000000000000000000000000000", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
  ],
  137: [
    { symbol: "MATIC", name: "Polygon", address: "0x0000000000000000000000000000000000000000", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
  ],
  8453: [
    { symbol: "ETH", name: "Ethereum", address: "0x0000000000000000000000000000000000000000", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  ],
  56: [
    { symbol: "BNB", name: "BNB", address: "0x0000000000000000000000000000000000000000", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
  ],
  43114: [
    { symbol: "AVAX", name: "Avalanche", address: "0x0000000000000000000000000000000000000000", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6 },
  ],
}

const parseTokenAmount = (amount: string, decimals: number): string => {
  if (!amount || isNaN(Number.parseFloat(amount))) return "0"
  const [whole, fraction = ""] = amount.split(".")
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals)
  const result = whole + paddedFraction
  return result.replace(/^0+/, "") || "0"
}

const formatTokenAmount = (amount: string, decimals: number): string => {
  if (!amount || amount === "0") return "0"
  const padded = amount.padStart(decimals + 1, "0")
  const whole = padded.slice(0, -decimals) || "0"
  const fraction = padded.slice(-decimals)
  const trimmedFraction = fraction.replace(/0+$/, "")
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole
}

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

// Get LiFi API key from environment
const LIFI_API_KEY = process.env.NEXT_PUBLIC_X_LIFI_KEY || process.env.X_LIFI_KEY || ''
const LIFI_API_BASE = 'https://li.quest/v1'

// Configure LiFi SDK
let lifiConfigured = false
function configureLiFi() {
  if (lifiConfigured) return
  createLiFiConfig({
    integrator: "Monsoon",
    apiKey: LIFI_API_KEY,
    providers: [
      EVM({
        getWalletClient: async () => {
          const walletClient = await getWalletClient(wagmiConfig)
          if (!walletClient) throw new Error("Wallet not connected")
          return walletClient
        },
        switchChain: async (chainId) => {
          await switchChain(wagmiConfig, { chainId } as any)
          const walletClient = await getWalletClient(wagmiConfig, { chainId })
          if (!walletClient) throw new Error("Failed to get wallet after chain switch")
          return walletClient
        },
      }),
    ],
  })
  lifiConfigured = true
}

// Map chain ID to chain key for LiFi API
const CHAIN_ID_TO_KEY: Record<number, string> = {
  1: 'eth',
  42161: 'arb',
  10: 'opt',
  137: 'pol',
  8453: 'bas',
  56: 'bsc',
  43114: 'ava',
  999: '999', // HyperEVM - may need to check actual key
}

// Fetch token info from LiFi API tokens endpoint
async function fetchTokens(chainIds?: number[]): Promise<Record<string, { logoURI?: string; symbol?: string; name?: string }>> {
  if (!LIFI_API_KEY) {
    console.warn('[LiFi] API key not configured, skipping token logo fetch')
    return {}
  }
  
  try {
    // Convert chain IDs to chain keys
    const chainKeys = chainIds && chainIds.length > 0 
      ? chainIds.map(id => CHAIN_ID_TO_KEY[id] || id.toString()).join(',')
      : ''
    const chainsParam = chainKeys ? `&chains=${chainKeys}` : ''
    const url = `${LIFI_API_BASE}/tokens?chainTypes=EVM&minPriceUSD=0${chainsParam}`
    
    const response = await fetch(url, {
      headers: {
        'x-lifi-api-key': LIFI_API_KEY,
      },
    })
    
    if (!response.ok) {
      return {}
    }
    
    const data = await response.json()
    
    // Transform token array into a map keyed by "chainId-tokenAddress"
    const tokenMap: Record<string, { logoURI?: string; symbol?: string; name?: string }> = {}
    
    if (data.tokens && Array.isArray(data.tokens)) {
      for (const token of data.tokens) {
        if (token.chainId && token.address) {
          const key = `${token.chainId}-${token.address.toLowerCase()}`
          tokenMap[key] = {
            logoURI: token.logoURI,
            symbol: token.symbol,
            name: token.name,
          }
        }
      }
    }
    
    return tokenMap
  } catch (error) {
    console.error(`[LiFi] Failed to fetch tokens:`, error)
    return {}
  }
}

// Fetch token price/info from LiFi token API
interface TokenPriceInfo {
  priceUSD?: number
  decimals?: number
  symbol?: string
  name?: string
}

async function fetchTokenPrice(chainKey: string, tokenSymbol: string): Promise<TokenPriceInfo | null> {
  if (!LIFI_API_KEY) {
    return null
  }
  
  try {
    const url = `${LIFI_API_BASE}/token?chain=${chainKey}&token=${tokenSymbol}`
    
    const response = await fetch(url, {
      headers: {
        'x-lifi-api-key': LIFI_API_KEY,
      },
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    return {
      priceUSD: data.priceUSD,
      decimals: data.decimals,
      symbol: data.symbol,
      name: data.name,
    }
  } catch (error) {
    console.error(`[LiFi] Failed to fetch token price for ${tokenSymbol} on ${chainKey}:`, error)
    return null
  }
}

// Calculate expected USDC amount on HyperEVM based on token prices
async function calculateExpectedUSDC(
  fromChainId: number,
  fromTokenSymbol: string,
  amount: string
): Promise<string | null> {
  if (!amount || isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
    return null
  }
  
  try {
    const fromChainKey = CHAIN_ID_TO_KEY[fromChainId]
    if (!fromChainKey) {
      return null
    }
    
    // Fetch source token price
    const sourceTokenInfo = await fetchTokenPrice(fromChainKey, fromTokenSymbol)
    if (!sourceTokenInfo || !sourceTokenInfo.priceUSD) {
      return null
    }
    
    // Fetch USDC price on HyperEVM (should be ~1 USD)
    const hyperEVMKey = CHAIN_ID_TO_KEY[hyperEVM.id] || '999'
    const usdcInfo = await fetchTokenPrice(hyperEVMKey, 'USDC')
    
    const usdcPriceUSD = usdcInfo?.priceUSD || 1
    const sourceTokenPriceUSD = sourceTokenInfo.priceUSD
    
    // Calculate: (amount * sourceTokenPrice) / usdcPrice
    const sourceAmount = Number.parseFloat(amount)
    const expectedUSDC = (sourceAmount * sourceTokenPriceUSD) / usdcPriceUSD
    
    return expectedUSDC.toFixed(6)
  } catch (error) {
    console.error(`[USDC Calculation] Error calculating USDC amount:`, error)
    return null
  }
}

// Fetch chain logo URI from LiFi API
async function fetchChainLogo(chainId: number): Promise<string | null> {
  if (!LIFI_API_KEY) {
    return null
  }
  
  try {
    const chainKey = CHAIN_ID_TO_KEY[chainId] || chainId.toString()
    const url = `${LIFI_API_BASE}/chains?chainTypes=EVM&chains=${chainKey}`
    
    const response = await fetch(url, {
      headers: {
        'x-lifi-api-key': LIFI_API_KEY,
      },
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    // Try to find chain by id first, then by key
    let chain = data.chains?.find((c: any) => c.id === chainId)
    if (!chain) {
      chain = data.chains?.find((c: any) => c.key === chainKey)
    }
    
    return chain?.logoURI || null
  } catch (error) {
    console.error(`[LiFi] Failed to fetch chain logo for chain ${chainId}:`, error)
    return null
  }
}

interface CrossChainBridgeProps {
  onClose?: () => void
}

export function CrossChainBridge({ onClose }: CrossChainBridgeProps) {
  const { isConnected, address, chain } = useAccount()
  const [selectedChain, setSelectedChain] = useState<number | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"chain" | "asset" | "amount" | "confirm">("chain")
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [bridgedAmount, setBridgedAmount] = useState<string>("")
  const [progressStep, setProgressStep] = useState<number>(0)
  const [progressSteps, setProgressSteps] = useState<string[]>([])
  const [chainLogos, setChainLogos] = useState<Record<number, string>>({})
  const [tokenLogos, setTokenLogos] = useState<Record<string, string>>({})
  const [expectedUSDC, setExpectedUSDC] = useState<string | null>(null)
  const [isCalculatingUSDC, setIsCalculatingUSDC] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  const availableAssets = selectedChain ? ASSETS[selectedChain] || [] : []
  const selectedChainData = SUPPORTED_CHAINS.find((c) => c.id === selectedChain)
  const selectedAssetData = availableAssets.find((a) => a.symbol === selectedAsset)

  // Fetch chain logos on mount
  useEffect(() => {
    if (!LIFI_API_KEY) {
      return
    }
    
    const fetchChainLogos = async () => {
      const logos: Record<number, string> = {}
      
      for (const chain of SUPPORTED_CHAINS) {
        const logoURI = await fetchChainLogo(chain.id)
        if (logoURI) {
          logos[chain.id] = logoURI
        }
      }
      
      setChainLogos(logos)
    }
    
    fetchChainLogos()
  }, [])

  // Fetch token logos for all supported chains on mount
  useEffect(() => {
    if (!LIFI_API_KEY) {
      return
    }
    
    const fetchAllTokenLogos = async () => {
      const chainIds = Object.keys(ASSETS).map(Number)
      const tokenData = await fetchTokens(chainIds)
      
      if (Object.keys(tokenData).length > 0) {
        const logos: Record<string, string> = {}
        
        for (const [key, token] of Object.entries(tokenData)) {
          if (token.logoURI) {
            logos[key] = token.logoURI
          }
        }
        
        setTokenLogos((prev) => ({ ...prev, ...logos }))
      }
    }
    
    fetchAllTokenLogos()
  }, [])

  // Calculate expected USDC amount when chain, asset, or amount changes
  useEffect(() => {
    if (!selectedChain || !selectedAsset || !amount || !LIFI_API_KEY) {
      setExpectedUSDC(null)
      return
    }

    const calculate = async () => {
      setIsCalculatingUSDC(true)
      try {
        const calculated = await calculateExpectedUSDC(selectedChain, selectedAsset, amount)
        setExpectedUSDC(calculated)
      } catch (error) {
        console.error('[CrossChainBridge] Error calculating USDC:', error)
        setExpectedUSDC(null)
      } finally {
        setIsCalculatingUSDC(false)
      }
    }

    // Debounce calculation slightly to avoid too many API calls
    const timeoutId = setTimeout(calculate, 300)
    return () => clearTimeout(timeoutId)
  }, [selectedChain, selectedAsset, amount])

  // Fetch balance when chain, asset, or address changes
  useEffect(() => {
    if (!address || !selectedChain || !selectedAsset || !selectedAssetData) {
      setBalance(null)
      return
    }

    const fetchBalance = async () => {
      setIsLoadingBalance(true)
      try {
        if (selectedAssetData.address === "0x0000000000000000000000000000000000000000") {
          // Native token (ETH, MATIC, etc.)
          const publicClient = getPublicClient(wagmiConfig, { chainId: selectedChain })
          if (publicClient) {
            const balance = await publicClient.getBalance({ address: address as `0x${string}` })
            const formatted = formatTokenAmount(balance.toString(), selectedAssetData.decimals)
            setBalance(formatted)
          }
        } else {
          // ERC20 token
          const balance = await readContract(wagmiConfig, {
            address: selectedAssetData.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
            chainId: selectedChain,
          })
          const formatted = formatTokenAmount(balance.toString(), selectedAssetData.decimals)
          setBalance(formatted)
        }
      } catch (error) {
        console.error('[CrossChainBridge] Error fetching balance:', error)
        setBalance(null)
      } finally {
        setIsLoadingBalance(false)
      }
    }

    fetchBalance()
  }, [address, selectedChain, selectedAsset, selectedAssetData])

  const handleChainSelect = (chainId: number) => {
    setSelectedChain(chainId)
    setSelectedAsset(null)
    setStep("asset")
  }

  const handleAssetSelect = (symbol: string) => {
    setSelectedAsset(symbol)
    setStep("amount")
  }

  const handleBack = () => {
    if (txStatus === "success" || txStatus === "error") {
      resetForm()
      return
    }
    if (step === "asset") {
      setStep("chain")
      setSelectedChain(null)
    } else if (step === "amount") {
      setStep("asset")
      setSelectedAsset(null)
    } else if (step === "confirm") {
      setStep("amount")
    }
  }

  const handleContinue = () => {
    if (step === "amount" && amount) {
      setStep("confirm")
    }
  }

  const resetForm = () => {
    setSelectedChain(null)
    setSelectedAsset(null)
    setAmount("")
    setStep("chain")
    setTxStatus("idle")
    setErrorMessage("")
    setBridgedAmount("")
    setProgressStep(0)
    setProgressSteps([])
  }

  const handleBridge = async () => {
    if (!selectedChain || !selectedAsset || !amount || !address) return

    configureLiFi()
    setIsLoading(true)
    setTxStatus("pending")
    setProgressSteps([
      `Sending ${amount} ${selectedAsset} on ${selectedChainData?.name}`,
      `Receiving USDC on HyperEVM`,
    ])
    setProgressStep(1)

    try {
      if (!selectedAssetData?.address) throw new Error("Asset address not defined")

      const tokenAmount = parseTokenAmount(amount, selectedAssetData.decimals)

      // Check balance on source chain
      if (selectedAssetData.address === "0x0000000000000000000000000000000000000000") {
        const publicClient = getPublicClient(wagmiConfig, { chainId: selectedChain })
        if (publicClient) {
          const balance = await publicClient.getBalance({ address: address as `0x${string}` })
          if (balance < BigInt(tokenAmount)) {
            throw new Error(
              `Insufficient ${selectedAsset} balance. You have ${formatTokenAmount(balance.toString(), 18)} but need ${amount}.`,
            )
          }
        }
      } else {
        const balance = await readContract(wagmiConfig, {
          address: selectedAssetData.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
          chainId: selectedChain,
        })
        if (BigInt(balance.toString()) < BigInt(tokenAmount)) {
          throw new Error(
            `Insufficient ${selectedAsset} balance. You have ${formatTokenAmount(balance.toString(), selectedAssetData.decimals)} but need ${amount}.`,
          )
        }
      }

      // Get routes from LiFi
      const result = await getRoutes({
        fromChainId: selectedChain,
        fromTokenAddress: selectedAssetData.address,
        toChainId: hyperEVM.id,
        toTokenAddress: HYPEREVM_USDC,
        fromAmount: tokenAmount,
        fromAddress: address,
        options: {
          slippage: 0.03,
          order: "RECOMMENDED",
        },
      })

      if (result.routes.length === 0) throw new Error("No route found")

      const route = result.routes[0]
      const toTokenDecimals = route.toToken?.decimals || 6
      
      // Display onchain quote information
      console.log('\n========== ONCHAIN QUOTE ==========')
      console.log('[Quote] Route ID:', route.id)
      console.log('[Quote] From Chain:', route.fromChainId, `(${route.fromToken?.symbol || 'Unknown'})`)
      console.log('[Quote] To Chain:', route.toChainId, `(${route.toToken?.symbol || 'Unknown'})`)
      console.log('[Quote] From Amount:', route.fromAmount, route.fromToken?.symbol)
      console.log('[Quote] To Amount:', route.toAmount, route.toToken?.symbol)
      console.log('[Quote] Estimated Received:', formatTokenAmount(route.toAmount, toTokenDecimals), route.toToken?.symbol)
      console.log('[Quote] Gas Cost USD:', route.gasCostUSD || 'N/A')
      console.log('[Quote] Tool:', route.steps?.[0]?.tool || 'N/A')
      console.log('[Quote] Total Steps:', route.steps?.length || 0)
      console.log('[Quote] Complete Route Object:', JSON.stringify(route, null, 2))
      console.log('===================================\n')

      const executedRoute = await executeRoute(route, {
        updateRouteHook(updatedRoute) {
          const doneSteps = updatedRoute.steps?.filter((s) => s.execution?.status === "DONE") || []
          const totalSteps = updatedRoute.steps?.length || 1
          if (doneSteps.length === totalSteps && totalSteps > 0) {
            setProgressStep(2)
          }
        },
      })

      // Verify that the bridge was actually successful
      if (!executedRoute) {
        throw new Error('Bridge failed - no route executed')
      }

      // Check if all steps completed successfully
      const allStepsCompleted = executedRoute.steps?.every(
        step => step.execution?.status === 'DONE'
      )
      
      if (!allStepsCompleted) {
        throw new Error('Bridge transaction did not complete successfully. Please try again.')
      }

      // Verify we received tokens on HyperEVM before showing success
      const receivedAmount = executedRoute.toAmount || route.toAmount
      if (!receivedAmount || BigInt(receivedAmount) === BigInt(0)) {
        throw new Error('Bridge completed but no tokens were received on HyperEVM')
      }

      const receivedAmountFormatted = receivedAmount 
        ? formatTokenAmount(receivedAmount, toTokenDecimals)
        : formatTokenAmount(route.toAmount, toTokenDecimals)

      // Store bridged amount
      setBridgedAmount(receivedAmountFormatted)
      setProgressStep(2)
      setTxStatus("success")
    } catch (error: any) {
      const errorMsg = error?.message || ""
      const isUserRejection =
        errorMsg.toLowerCase().includes("user rejected") ||
        errorMsg.toLowerCase().includes("user denied") ||
        error?.code === 4001

      if (isUserRejection) {
        setTxStatus("idle")
        setErrorMessage("")
        return
      }

      setErrorMessage(errorMsg || "Something went wrong")
      setTxStatus("error")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-xl p-6 max-w-md w-full shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Connect Wallet</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <p className="text-gray-400 text-center">
              Connect your wallet to bridge tokens to HyperEVM
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              Supported wallets: MetaMask, WalletConnect, Coinbase Wallet, and more
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50">
        <div className="space-y-6">
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Bridge</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Header with back button */}
          {(step !== "chain" || txStatus !== "idle") && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </button>
          )}

      {/* Step 1: Select Chain */}
      {step === "chain" && txStatus === "idle" && (
        <>
          <p className="text-gray-400 text-sm">Select your origin chain</p>
          <div className="grid grid-cols-2 gap-3">
            {SUPPORTED_CHAINS.map((chain) => {
              const chainLogo = chainLogos[chain.id]
              return (
                <button
                  key={chain.id}
                  onClick={() => handleChainSelect(chain.id)}
                  className="p-4 rounded-xl border border-[#1a1a2e] bg-[#12121a] text-center hover:border-primary/60 hover:bg-[#1a1a28] transition-all duration-200"
                >
                  {chainLogo ? (
                    <img 
                      src={chainLogo} 
                      alt={chain.name}
                      className="w-12 h-12 mx-auto mb-2 rounded-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const textEl = target.nextElementSibling as HTMLElement
                        if (textEl) textEl.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`text-2xl mb-2 font-bold text-primary ${chainLogo ? 'hidden' : ''}`}>
                    {CHAIN_ICONS[chain.id]}
                  </div>
                  <div className="font-semibold text-sm text-white">{chain.name}</div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Step 2: Select Asset */}
      {step === "asset" && txStatus === "idle" && (
        <>
          <p className="text-gray-400 text-sm">Select asset from {selectedChainData?.name}</p>
          <div className="space-y-2">
            {availableAssets.map((asset) => {
              const tokenLogoKey = selectedChain ? `${selectedChain}-${asset.address.toLowerCase()}` : ''
              const tokenLogo = tokenLogoKey ? tokenLogos[tokenLogoKey] : null
              
              return (
                <button
                  key={asset.symbol}
                  onClick={() => handleAssetSelect(asset.symbol)}
                  className="w-full p-4 rounded-xl border border-[#1a1a2e] bg-[#12121a] flex items-center gap-4 hover:border-primary/60 hover:bg-[#1a1a28] transition-all duration-200"
                >
                  {tokenLogo ? (
                    <img 
                      src={tokenLogo} 
                      alt={asset.symbol}
                      className="w-10 h-10 rounded-full object-contain bg-transparent"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const textEl = target.nextElementSibling as HTMLElement
                        if (textEl) textEl.classList.remove('hidden')
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      {asset.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="text-left">
                    <div className="font-semibold text-white">{asset.symbol}</div>
                    <div className="text-sm text-gray-400">{asset.name}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Step 3: Enter Amount */}
      {step === "amount" && txStatus === "idle" && (
        <>
          <p className="text-gray-400 text-sm">Enter amount to bridge</p>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[#1a1a2e] bg-[#12121a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">From</span>
                <span className="text-sm text-gray-400">{selectedChainData?.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent border-0 text-2xl font-bold p-0 h-auto focus-visible:ring-0 text-white placeholder:text-gray-600"
                />
                <div className="px-3 py-2 rounded-lg bg-[#1a1a2e] font-semibold text-white">{selectedAsset}</div>
              </div>
              <div className="mt-2 text-xs flex items-center justify-between">
                <span className="text-gray-500">Balance:</span>
                <span className={isLoadingBalance ? "text-gray-500" : "text-gray-400"}>
                  {isLoadingBalance ? "Loading..." : balance !== null ? `${balance} ${selectedAsset}` : "--"}
                </span>
              </div>
              {balance && amount && Number.parseFloat(amount) > Number.parseFloat(balance) && (
                <div className="mt-2 text-xs text-red-500">
                  Insufficient balance. You have {balance} {selectedAsset}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#12121a] border border-[#1a1a2e] flex items-center justify-center">
                <ArrowDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#1a1a2e] bg-[#12121a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">To</span>
                <span className="text-sm text-gray-400">HyperEVM</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-2xl font-bold text-primary">
                  {isCalculatingUSDC ? (
                    <span className="text-gray-400 text-lg">Calculating...</span>
                  ) : expectedUSDC ? (
                    `~${Number.parseFloat(expectedUSDC).toFixed(4)}`
                  ) : amount ? (
                    `~${amount}`
                  ) : (
                    "0.0"
                  )}
                </div>
                <div className="px-3 py-2 rounded-lg bg-primary/20 text-primary font-semibold">USDC</div>
              </div>
              {expectedUSDC && !isCalculatingUSDC && (
                <div className="mt-2 text-xs text-gray-500">
                  Expected amount based on current token prices
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={
              !amount || 
              Number.parseFloat(amount) <= 0 || 
              (balance !== null && Number.parseFloat(amount) > Number.parseFloat(balance))
            }
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </Button>
        </>
      )}

      {/* Step 4: Confirm */}
      {step === "confirm" && txStatus === "idle" && (
        <>
          <p className="text-muted-foreground text-sm">Review your bridge</p>

          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
              <span className="text-muted-foreground">From</span>
              <span className="font-semibold">
                {amount} {selectedAsset} on {selectedChainData?.name}
              </span>
            </div>
            <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
              <span className="text-muted-foreground">Bridge To</span>
              <span className="font-semibold text-primary">
                {isCalculatingUSDC ? (
                  <span className="text-gray-400">Calculating...</span>
                ) : expectedUSDC ? (
                  `~${Number.parseFloat(expectedUSDC).toFixed(4)} USDC on HyperEVM`
                ) : (
                  `~${amount} USDC on HyperEVM`
                )}
              </span>
            </div>
            <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-mono text-sm">
                {address?.slice(0, 8)}...{address?.slice(-6)}
              </span>
            </div>
          </div>

          <Button
            onClick={handleBridge}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
          >
            Confirm Bridge
          </Button>
        </>
      )}

      {/* Transaction Status with Progress Tracker */}
      {txStatus === "pending" && progressSteps.length > 0 && (
        <div className="space-y-6 py-6">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h4 className="text-lg font-bold mb-2">Processing Bridge</h4>
          </div>

          <div className="space-y-4">
            {progressSteps.map((stepDesc, index) => {
              const stepNumber = index + 1
              const isCompleted = stepNumber < progressStep
              const isCurrent = stepNumber === progressStep
              const isPending = stepNumber > progressStep

              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        isCompleted
                          ? "bg-primary text-white"
                          : isCurrent
                            ? "bg-primary text-white animate-pulse"
                            : "bg-border text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? "✓" : stepNumber}
                    </div>
                    {index < progressSteps.length - 1 && (
                      <div className={`w-1 flex-1 min-h-[40px] my-2 ${isCompleted ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>

                  <div className="flex-1 pt-2">
                    <div
                      className={`font-semibold mb-1 ${
                        isCurrent ? "text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {stepDesc}
                    </div>
                    {isCurrent && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="animate-pulse">●</span>
                        In progress...
                      </div>
                    )}
                    {isCompleted && <div className="text-xs text-primary">✓ Completed</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Success */}
      {txStatus === "success" && (
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-green-500 mb-2">Bridge Successful!</h4>
          <p className="text-muted-foreground text-sm mb-4">
            {`${bridgedAmount || amount} USDC is now on HyperEVM`}
          </p>
          <Button onClick={resetForm} variant="outline" className="border-border/60 bg-transparent">
            New Bridge
          </Button>
        </div>
      )}

      {/* Error */}
      {txStatus === "error" && (
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h4 className="text-lg font-bold text-destructive mb-2">Bridge Failed</h4>
          <p className="text-muted-foreground text-sm mb-4 max-w-[300px] mx-auto">{errorMessage}</p>
          <Button onClick={resetForm} variant="outline" className="border-border/60 bg-transparent">
            Try Again
          </Button>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

