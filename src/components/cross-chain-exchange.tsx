"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import {
  getWalletClient,
  switchChain,
  writeContract,
  waitForTransactionReceipt,
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
const CORE_DEPOSIT_WALLET = "0x6b9e773128f453f5c2c60935ee2de2cbc5390a24" as `0x${string}`
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ArrowDown, Loader2, CheckCircle2, XCircle } from "lucide-react"

const SUPPORTED_CHAINS = [mainnet, arbitrum, optimism, polygon, base, bsc, avalanche, hyperEVM]

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
  999: [{ symbol: "USDC", name: "USD Coin", address: HYPEREVM_USDC, decimals: 6 }],
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
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

const CORE_DEPOSIT_WALLET_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDex", type: "uint32" },
    ],
    outputs: [],
  },
] as const

// Configure LiFi SDK
let lifiConfigured = false
function configureLiFi() {
  if (lifiConfigured) return
  createLiFiConfig({
    integrator: "Monsoon",
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

interface CrossChainExchangeProps {
  onClose?: () => void
}

export function CrossChainExchange({ onClose }: CrossChainExchangeProps) {
  const { isConnected, address, chain } = useAccount()
  const [selectedChain, setSelectedChain] = useState<number | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"chain" | "asset" | "amount" | "confirm">("chain")
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [destinationDex, setDestinationDex] = useState<"spot" | "perps">("spot")
  const [bridgedAmount, setBridgedAmount] = useState<string>("")
  const [showDepositAfterBridge, setShowDepositAfterBridge] = useState(false)
  const [progressStep, setProgressStep] = useState<number>(0)
  const [progressSteps, setProgressSteps] = useState<string[]>([])

  const availableAssets = selectedChain ? ASSETS[selectedChain] || [] : []
  const selectedChainData = SUPPORTED_CHAINS.find((c) => c.id === selectedChain)
  const selectedAssetData = availableAssets.find((a) => a.symbol === selectedAsset)
  const isHyperEVMSelected = selectedChain === hyperEVM.id

  const handleChainSelect = (chainId: number) => {
    setSelectedChain(chainId)
    setSelectedAsset(null)
    if (chainId === hyperEVM.id) {
      setSelectedAsset("USDC")
      setStep("amount")
    } else {
      setStep("asset")
    }
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
      if (isHyperEVMSelected) {
        setStep("chain")
        setSelectedChain(null)
        setSelectedAsset(null)
      } else {
        setStep("asset")
        setSelectedAsset(null)
      }
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
    setShowDepositAfterBridge(false)
    setProgressStep(0)
    setProgressSteps([])
  }

  const handleDeposit = async (depositAmountOverride?: string) => {
    const depositAmount = depositAmountOverride || amount
    if (!selectedChain || !selectedAsset || !depositAmount || !address) return

    setIsLoading(true)
    setTxStatus("pending")

    if (progressSteps.length === 3) {
      setProgressSteps([
        progressSteps[0],
        progressSteps[1],
        `Depositing ${depositAmount} USDC to HyperCore ${destinationDex === "spot" ? "Spot" : "Perps"} account`,
      ])
      setProgressStep(3)
    } else {
      setProgressSteps([
        `Depositing ${depositAmount} USDC to HyperCore ${destinationDex === "spot" ? "Spot" : "Perps"} account`,
      ])
      setProgressStep(1)
    }

    try {
      const assetData =
        depositAmountOverride && selectedChain
          ? ASSETS[hyperEVM.id]?.find((a) => a.symbol === "USDC")
          : selectedAssetData

      if (!assetData?.address) throw new Error("Asset address not defined")

      // Switch to HyperEVM if needed
      const walletClientForCheck = await getWalletClient(wagmiConfig)
      const currentChainId = walletClientForCheck ? await walletClientForCheck.getChainId() : chain?.id

      if (currentChainId !== hyperEVM.id) {
        await switchChain(wagmiConfig, { chainId: hyperEVM.id })
        let attempts = 0
        while (attempts < 60) {
          await new Promise((r) => setTimeout(r, 500))
          const wc = await getWalletClient(wagmiConfig)
          if (wc && (await wc.getChainId()) === hyperEVM.id) break
          attempts++
        }
      }

      const tokenAmount = parseTokenAmount(depositAmount, assetData.decimals)
      const amountBigInt = BigInt(tokenAmount)

      // Check balance
      const balance = await readContract(wagmiConfig, {
        address: HYPEREVM_USDC,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
        chainId: hyperEVM.id,
      })

      if (BigInt(balance.toString()) < amountBigInt) {
        throw new Error(
          `Insufficient USDC balance. You have ${formatTokenAmount(balance.toString(), 6)} USDC but need ${depositAmount} USDC.`,
        )
      }

      // Check allowance and approve if needed
      const currentAllowance = await readContract(wagmiConfig, {
        address: HYPEREVM_USDC,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address as `0x${string}`, CORE_DEPOSIT_WALLET],
        chainId: hyperEVM.id,
      })

      if (currentAllowance < amountBigInt) {
        const approveHash = await writeContract(wagmiConfig, {
          address: HYPEREVM_USDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CORE_DEPOSIT_WALLET, amountBigInt],
          chainId: hyperEVM.id,
        })
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash })
      }

      // Execute deposit
      const destinationDexValue = destinationDex === "spot" ? 4294967295 : 0

      const depositHash = await writeContract(wagmiConfig, {
        address: CORE_DEPOSIT_WALLET,
        abi: CORE_DEPOSIT_WALLET_ABI,
        functionName: "deposit",
        args: [amountBigInt, destinationDexValue],
        chainId: hyperEVM.id,
      })

      await waitForTransactionReceipt(wagmiConfig, { hash: depositHash })

      if (depositAmountOverride) {
        setSelectedChain(hyperEVM.id)
        setSelectedAsset("USDC")
        setAmount(depositAmount)
      }
      setBridgedAmount("")
      setShowDepositAfterBridge(false)
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

  const handleExchange = async () => {
    if (!selectedChain || !selectedAsset || !amount || !address) return

    configureLiFi()
    setIsLoading(true)
    setTxStatus("pending")
    setProgressSteps([
      `Sending ${amount} ${selectedAsset} on ${selectedChainData?.name}`,
      `Receiving USDC on HyperEVM`,
      `Depositing to HyperCore ${destinationDex === "spot" ? "Spot" : "Perps"} account`,
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

      await executeRoute(route, {
        updateRouteHook(updatedRoute) {
          const doneSteps = updatedRoute.steps?.filter((s) => s.execution?.status === "DONE") || []
          const totalSteps = updatedRoute.steps?.length || 1
          if (doneSteps.length === totalSteps && totalSteps > 0) {
            setProgressStep(2)
          }
        },
      })

      // Store bridged amount for deposit step
      const receivedAmount = formatTokenAmount(route.toAmount, toTokenDecimals)
      setBridgedAmount(receivedAmount)
      setShowDepositAfterBridge(true)
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

  const handleDepositAfterBridge = async () => {
    if (!bridgedAmount) return
    await handleDeposit(bridgedAmount)
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
              Connect your wallet to deposit or bridge tokens to HyperCore
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
            <h2 className="text-xl font-semibold text-white">Deposit / Bridge</h2>
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
            {SUPPORTED_CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => handleChainSelect(chain.id)}
                className="p-4 rounded-xl border border-[#1a1a2e] bg-[#12121a] text-center hover:border-primary/60 hover:bg-[#1a1a28] transition-all duration-200"
              >
                <div className="text-2xl mb-2 font-bold text-primary">{CHAIN_ICONS[chain.id]}</div>
                <div className="font-semibold text-sm text-white">{chain.name}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Step 2: Select Asset */}
      {step === "asset" && !isHyperEVMSelected && txStatus === "idle" && (
        <>
          <p className="text-gray-400 text-sm">Select asset from {selectedChainData?.name}</p>
          <div className="space-y-2">
            {availableAssets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => handleAssetSelect(asset.symbol)}
                className="w-full p-4 rounded-xl border border-[#1a1a2e] bg-[#12121a] flex items-center gap-4 hover:border-primary/60 hover:bg-[#1a1a28] transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  {asset.symbol.slice(0, 2)}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">{asset.symbol}</div>
                  <div className="text-sm text-gray-400">{asset.name}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Step 3: Enter Amount */}
      {step === "amount" && txStatus === "idle" && (
        <>
          <p className="text-gray-400 text-sm">
            {isHyperEVMSelected ? "Enter amount to deposit to your Hyperliquid account" : "Enter amount to exchange"}
          </p>

          {isHyperEVMSelected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#1a1a2e] bg-[#12121a]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Deposit Amount</span>
                  <span className="text-sm text-gray-400">HyperEVM</span>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="flex-1 bg-transparent border-0 text-2xl font-bold p-0 h-auto focus-visible:ring-0 text-white placeholder:text-gray-600"
                  />
                  <div className="px-3 py-2 rounded-lg bg-primary/20 text-primary font-semibold">USDC</div>
                </div>
              </div>

              {/* Destination Selection */}
              <div className="p-4 rounded-xl border border-[#1a1a2e] bg-[#12121a]">
                <label className="block text-sm font-semibold mb-2 text-white">Deposit Destination</label>
                <div className="text-xs text-gray-400 mb-3">Choose where to deposit your USDC in HyperCore</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDestinationDex("spot")}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      destinationDex === "spot"
                        ? "border-primary bg-primary/15"
                        : "border-[#1a1a2e] bg-[#0a0a0f] hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          destinationDex === "spot" ? "border-primary bg-primary" : "border-gray-600"
                        }`}
                      >
                        {destinationDex === "spot" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">Spot Account</div>
                        <div className="text-xs text-gray-400 mt-1">For spot trading</div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinationDex("perps")}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      destinationDex === "perps"
                        ? "border-primary bg-primary/15"
                        : "border-[#1a1a2e] bg-[#0a0a0f] hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          destinationDex === "perps" ? "border-primary bg-primary" : "border-gray-600"
                        }`}
                      >
                        {destinationDex === "perps" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">Perps Account</div>
                        <div className="text-xs text-gray-400 mt-1">For perpetuals</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <Button
                onClick={handleContinue}
                disabled={!amount || Number.parseFloat(amount) <= 0}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
              >
                Continue to Deposit
              </Button>
            </div>
          ) : (
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
                  <div className="flex-1 text-2xl font-bold text-gray-500">{amount ? "~" + amount : "0.0"}</div>
                  <div className="px-3 py-2 rounded-lg bg-primary/20 text-primary font-semibold">USDC</div>
                </div>
              </div>

              {/* Destination Selection for cross-chain */}
              <div className="p-4 rounded-xl border border-[#1a1a2e] bg-[#12121a]">
                <label className="block text-sm font-semibold mb-2 text-white">Final Destination (HyperCore)</label>
                <div className="text-xs text-gray-400 mb-3">
                  Choose where to deposit your USDC after bridging
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDestinationDex("spot")}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      destinationDex === "spot"
                        ? "border-primary bg-primary/15"
                        : "border-[#1a1a2e] bg-[#0a0a0f] hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          destinationDex === "spot" ? "border-primary bg-primary" : "border-gray-600"
                        }`}
                      >
                        {destinationDex === "spot" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">Spot</div>
                        <div className="text-xs text-gray-400 mt-1">Spot trading</div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinationDex("perps")}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      destinationDex === "perps"
                        ? "border-primary bg-primary/15"
                        : "border-[#1a1a2e] bg-[#0a0a0f] hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          destinationDex === "perps" ? "border-primary bg-primary" : "border-gray-600"
                        }`}
                      >
                        {destinationDex === "perps" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">Perps</div>
                        <div className="text-xs text-gray-400 mt-1">Perpetuals</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <Button
                onClick={handleContinue}
                disabled={!amount || Number.parseFloat(amount) <= 0}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
              >
                Continue
              </Button>
            </div>
          )}
        </>
      )}

      {/* Step 4: Confirm */}
      {step === "confirm" && txStatus === "idle" && (
        <>
          <p className="text-muted-foreground text-sm">
            {isHyperEVMSelected ? "Review your deposit" : "Review your exchange"}
          </p>

          <div className="space-y-3">
            {isHyperEVMSelected ? (
              <>
                <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
                  <span className="text-muted-foreground">Deposit Amount</span>
                  <span className="font-semibold">{amount} USDC</span>
                </div>
                <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
                  <span className="text-muted-foreground">Destination</span>
                  <span className="font-semibold">{destinationDex === "spot" ? "Spot Account" : "Perps Account"}</span>
                </div>
                <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-semibold">HyperEVM → HyperCore</span>
                </div>
                <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-mono text-sm">
                    {address?.slice(0, 8)}...{address?.slice(-6)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-semibold">
                    {amount} {selectedAsset} on {selectedChainData?.name}
                  </span>
                </div>
                <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
                  <span className="text-muted-foreground">Bridge To</span>
                  <span className="font-semibold text-primary">~{amount} USDC on HyperEVM</span>
                </div>
                <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
                  <span className="text-muted-foreground">Final Destination</span>
                  <span className="font-semibold">
                    HyperCore {destinationDex === "spot" ? "Spot" : "Perps"} Account
                  </span>
                </div>
                <div className="p-4 rounded-lg border border-border/40 bg-black flex items-center justify-between">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-mono text-sm">
                    {address?.slice(0, 8)}...{address?.slice(-6)}
                  </span>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={isHyperEVMSelected ? () => handleDeposit() : handleExchange}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isHyperEVMSelected ? "Confirm Deposit" : "Confirm Exchange"}
          </Button>
        </>
      )}

      {/* Transaction Status with Progress Tracker */}
      {txStatus === "pending" && progressSteps.length > 0 && (
        <div className="space-y-6 py-6">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h4 className="text-lg font-bold mb-2">
              {isHyperEVMSelected ? "Processing Deposit" : "Processing Transaction"}
            </h4>
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
          <h4 className="text-lg font-bold text-green-500 mb-2">
            {isHyperEVMSelected || (progressSteps.length === 3 && progressStep === 3)
              ? "Deposit Successful!"
              : "Bridge Successful!"}
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            {isHyperEVMSelected || (progressSteps.length === 3 && progressStep === 3)
              ? `${amount || bridgedAmount} USDC transferred from HyperEVM to HyperCore ${destinationDex === "spot" ? "Spot" : "Perps"} account`
              : `${bridgedAmount || amount} USDC is now on HyperEVM`}
          </p>
          {!isHyperEVMSelected && !(progressSteps.length === 3 && progressStep === 3) && showDepositAfterBridge && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 mb-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Your USDC is on HyperEVM. Ready to deposit to HyperCore.
                </div>
                <div className="text-xs text-muted-foreground">
                  Destination: <strong>{destinationDex === "spot" ? "Spot" : "Perps"} Account</strong>
                </div>
              </div>
              <Button onClick={handleDepositAfterBridge} className="w-full bg-primary hover:bg-primary/90">
                Deposit to HyperCore {destinationDex === "spot" ? "Spot" : "Perps"}
              </Button>
              <Button onClick={resetForm} variant="outline" className="w-full border-border/60 bg-transparent">
                Done
              </Button>
            </div>
          )}
          {(isHyperEVMSelected || !showDepositAfterBridge) && (
            <Button onClick={resetForm} variant="outline" className="border-border/60 bg-transparent">
              {isHyperEVMSelected ? "New Deposit" : "New Exchange"}
            </Button>
          )}
        </div>
      )}

      {/* Error */}
      {txStatus === "error" && (
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h4 className="text-lg font-bold text-destructive mb-2">
            {isHyperEVMSelected ? "Deposit Failed" : "Exchange Failed"}
          </h4>
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
