"use client"

import { useState, useEffect } from "react"
import { useAccount, useSwitchChain } from "wagmi"
import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, ArrowUpRight, ArrowDownLeft, Loader2, Shield, CheckCircle, XCircle, Lock, AlertTriangle, RefreshCw } from "lucide-react"
import {
  usePoolInfo,
  useLPBalance,
  useTokenBalance,
  useDeposit,
  useWithdraw,
  useApproveToken,
  formatTokenAmount,
  parseTokenAmount
} from "@/lib/contracts/hooks"
import { HYPEREVM, DEPLOYED } from "@/lib/contracts/addresses"

// HyperEVM Testnet Chain ID
const REQUIRED_CHAIN_ID = 998

interface SimulationResult {
  approved: boolean
  reason?: string
  message?: string
}

export default function VaultPage() {
  const { address, isConnected, chain } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)

  // Action states
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null)

  // Check if on correct chain
  const isWrongChain = isConnected && chain?.id !== REQUIRED_CHAIN_ID

  // Contract reads (wagmi) - with refetch capability
  const { data: poolInfo, isLoading: poolLoading, refetch: refetchPool } = usePoolInfo()
  const { data: lpBalance, refetch: refetchLpBalance } = useLPBalance(address)
  const { data: token0Balance, refetch: refetchToken0 } = useTokenBalance(HYPEREVM.TOKEN0, address)
  const { data: token1Balance, refetch: refetchToken1 } = useTokenBalance(HYPEREVM.TOKEN1, address)

  // Contract writes (wagmi - executes on HyperEVM)
  const { approve, isPending: isApproving, isSuccess: isApproveSuccess, hash: approveHash } = useApproveToken()
  const { deposit, isPending: isDepositing, isConfirming: isDepositConfirming, isSuccess: isDepositSuccess, hash: depositHash } = useDeposit()
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithdrawConfirming, isSuccess: isWithdrawSuccess, hash: withdrawHash } = useWithdraw()

  // Auto-refresh balances after successful transactions
  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess) {
      // Delay to allow chain to update
      const timer = setTimeout(() => {
        refetchPool()
        refetchLpBalance()
        refetchToken0()
        refetchToken1()
        setActionResult({
          success: true,
          message: isDepositSuccess
            ? `Deposit confirmed! TX: ${depositHash?.slice(0, 10)}...`
            : `Withdraw confirmed! TX: ${withdrawHash?.slice(0, 10)}...`
        })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isDepositSuccess, isWithdrawSuccess, depositHash, withdrawHash])

  // Show chain switch prompt if on wrong chain
  if (isWrongChain) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="p-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Wrong Network</h2>
          <p className="text-muted-foreground mb-4">
            You're connected to <span className="font-mono text-yellow-400">{chain?.name || `Chain ${chain?.id}`}</span>.
            <br />
            Please switch to <span className="font-mono text-primary">HyperEVM Testnet</span> to use the Vault.
          </p>
          <Button
            onClick={() => switchChain({ chainId: REQUIRED_CHAIN_ID })}
            disabled={isSwitching}
            className="bg-primary hover:bg-primary/90"
          >
            {isSwitching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Switching...
              </>
            ) : (
              "Switch to HyperEVM Testnet"
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Simulate deposit/withdraw via Salt Guardian policies
  const simulateAction = async (action: 'deposit' | 'withdraw', amount: string) => {
    setIsSimulating(true)
    setSimulationResult(null)
    setActionResult(null)

    try {
      const res = await fetch('/api/vault/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          amount,
          tokenAddress: DEPLOYED.tokens.TOKEN0.address
        })
      })

      const result: SimulationResult = await res.json()
      setSimulationResult(result)
      return result.approved
    } catch (error) {
      console.error('Simulation failed:', error)
      setSimulationResult({ approved: false, reason: 'Simulation request failed' })
      return false
    } finally {
      setIsSimulating(false)
    }
  }

  // Salt-gated then wagmi deposit
  const handleDeposit = async () => {
    if (!address || !depositAmount) return

    // 1. Check with Salt Guardian first
    const approved = await simulateAction('deposit', depositAmount)
    if (!approved) return

    // 2. Salt approved → Execute via wagmi on HyperEVM
    try {
      const amount = parseTokenAmount(depositAmount, DEPLOYED.tokens.TOKEN0.decimals)

      // Approve first
      await approve(HYPEREVM.TOKEN0, amount)
      await approve(HYPEREVM.TOKEN1, amount)

      // Then deposit
      deposit(amount, amount, address)

      setActionResult({ success: true, message: 'Deposit submitted to HyperEVM!' })
      setDepositAmount("")

      // Record audit
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'deposit',
          actionCategory: 'execution',
          status: 'pending',
          account: { id: address, name: 'Wallet', address },
          payload: { amount: parseFloat(depositAmount), token: DEPLOYED.tokens.TOKEN0.symbol },
          result: { passed: true, denials: [] },
          source: 'user'
        })
      })
    } catch (error: any) {
      setActionResult({ success: false, message: error.message || 'Deposit failed' })
    }
  }

  // Salt-gated then wagmi withdraw
  const handleWithdraw = async () => {
    if (!address || !withdrawAmount) return

    // 1. Check with Salt Guardian first
    const approved = await simulateAction('withdraw', withdrawAmount)
    if (!approved) return

    // 2. Salt approved → Execute via wagmi
    try {
      const amount = parseTokenAmount(withdrawAmount, 18)
      withdraw(amount, address)

      setActionResult({ success: true, message: 'Withdraw submitted to HyperEVM!' })
      setWithdrawAmount("")

      // Record audit
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'withdraw',
          actionCategory: 'execution',
          status: 'pending',
          account: { id: address, name: 'Wallet', address },
          payload: { amount: parseFloat(withdrawAmount), token: 'mLP' },
          result: { passed: true, denials: [] },
          source: 'user'
        })
      })
    } catch (error: any) {
      setActionResult({ success: false, message: error.message || 'Withdraw failed' })
    }
  }

  // Format pool data
  const reserve0 = poolInfo ? formatTokenAmount(poolInfo[3], 6) : "0"
  const reserve1 = poolInfo ? formatTokenAmount(poolInfo[4], 18) : "0"
  const totalSupply = poolInfo ? formatTokenAmount(poolInfo[10], 18) : "0"
  const oraclePrice = poolInfo ? formatTokenAmount(poolInfo[11], 18) : "0"
  const userLPBalance = lpBalance ? formatTokenAmount(lpBalance, 18) : "0"
  const userToken0 = token0Balance ? formatTokenAmount(token0Balance, 6) : "0"
  const userToken1 = token1Balance ? formatTokenAmount(token1Balance, 18) : "0"

  const isProcessing = isSimulating || isApproving || isDepositing || isDepositConfirming || isWithdrawing || isWithdrawConfirming

  return (
    <div className="space-y-8">
      {/* Guardian Status Banner */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
        <Shield className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="font-medium text-sm">Salt Guardian Protection Active</p>
          <p className="text-caption text-xs">All vault actions are validated against your guardian policies before execution</p>
        </div>
        <Lock className="h-4 w-4 text-primary/60" />
      </div>

      {/* Your Wallet Balances */}
      {isConnected && (
        <div className="rounded-xl border border-border/50 bg-gradient-to-r from-primary/5 to-emerald-500/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Your Wallet</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-black/20">
              <p className="text-caption text-xs mb-1">{DEPLOYED.tokens.TOKEN0.symbol}</p>
              <p className="text-lg font-bold font-mono">{parseFloat(userToken0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-black/20">
              <p className="text-caption text-xs mb-1">{DEPLOYED.tokens.TOKEN1.symbol}</p>
              <p className="text-lg font-bold font-mono">{parseFloat(userToken1).toFixed(6)}</p>
            </div>
            <div className="p-3 rounded-lg bg-black/20 border border-emerald-500/20">
              <p className="text-caption text-xs mb-1">LP Tokens</p>
              <p className="text-lg font-bold font-mono text-emerald-400">{parseFloat(userLPBalance).toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Simulation / Action Result */}
      {simulationResult && !simulationResult.approved && (
        <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/30 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-red-400 font-medium text-sm">Policy Violation</p>
            <p className="text-red-400/80 text-xs">{simulationResult.reason}</p>
          </div>
        </div>
      )}

      {actionResult && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${actionResult.success
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
          {actionResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <p className="text-sm">{actionResult.message}</p>
        </div>
      )}

      {/* Stats Row with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pool Stats</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchPool()
            refetchLpBalance()
            refetchToken0()
            refetchToken1()
          }}
          disabled={poolLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${poolLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DataCard
          title="Pool Reserves (Token0)"
          value={poolLoading ? "Loading..." : `${parseFloat(reserve0).toLocaleString()}`}
          subtitle="mUSDC"
        />
        <DataCard
          title="Pool Reserves (Token1)"
          value={poolLoading ? "Loading..." : `${parseFloat(reserve1).toFixed(4)}`}
          subtitle="mWETH"
        />
        <DataCard
          title="Total LP Supply"
          value={poolLoading ? "Loading..." : `${parseFloat(totalSupply).toFixed(4)}`}
          subtitle="mLP tokens"
        />
        <DataCard
          title="Oracle Price"
          value={poolLoading ? "Loading..." : `$${parseFloat(oraclePrice).toFixed(2)}`}
          subtitle="From HyperCore"
        />
      </div>

      {/* Vault Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit/Withdraw Card */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <Tabs defaultValue="deposit" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/50">
              <TabsTrigger value="deposit" className="font-medium tracking-tight">
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="font-medium tracking-tight">
                Withdraw
              </TabsTrigger>
            </TabsList>
            <TabsContent value="deposit" className="mt-6 space-y-4">
              <div>
                <label className="text-caption mb-2 block">Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="bg-black/50 border-border/50 text-lg font-mono pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                    {DEPLOYED.tokens.TOKEN0.symbol}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Wallet Balance</span>
                <span className="font-mono">{parseFloat(userToken0).toLocaleString()} {DEPLOYED.tokens.TOKEN0.symbol}</span>
              </div>
              <Button
                onClick={handleDeposit}
                disabled={!isConnected || isProcessing || !depositAmount}
                className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 font-medium tracking-tight"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSimulating ? "Checking Guardians..." : isApproving ? "Approving..." : "Depositing..."}
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Deposit (Guardian Protected)
                  </>
                )}
              </Button>
              {!isConnected && (
                <p className="text-yellow-400 text-xs text-center">Connect wallet to deposit</p>
              )}
            </TabsContent>
            <TabsContent value="withdraw" className="mt-6 space-y-4">
              <div>
                <label className="text-caption mb-2 block">LP Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-black/50 border-border/50 text-lg font-mono pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                    mLP
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your LP Balance</span>
                <span className="font-mono">{parseFloat(userLPBalance).toFixed(4)} mLP</span>
              </div>
              <Button
                onClick={handleWithdraw}
                disabled={!isConnected || isProcessing || !withdrawAmount}
                className="w-full bg-transparent font-medium tracking-tight"
                variant="outline"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSimulating ? "Checking Guardians..." : "Withdrawing..."}
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Withdraw (Guardian Protected)
                  </>
                )}
              </Button>
              {!isConnected && (
                <p className="text-yellow-400 text-xs text-center">Connect wallet to withdraw</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Your Position */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <h2 className="mb-4">Your Position</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-border/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Monsoon LP</p>
                  <p className="text-caption font-mono">{parseFloat(userLPBalance).toFixed(4)} mLP</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono font-medium text-sm ${isConnected ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {isConnected ? "Connected" : "Not Connected"}
                </p>
                <p className="text-caption">HyperEVM Testnet</p>
              </div>
            </div>

            {/* Guardian Info */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Guardian Policy</p>
                  <p className="text-caption">Actions validated before execution</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-mono font-medium text-sm">Active</p>
                <p className="text-caption">Salt Protected</p>
              </div>
            </div>

            {!isConnected && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm">
                  Connect your wallet to view your position and interact with the vault.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
