"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, ArrowUpRight, ArrowDownLeft, Lock, Loader2 } from "lucide-react"
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
import { HYPEREVM } from "@/lib/contracts/addresses"

export default function VaultPage() {
  const { address, isConnected } = useAccount()
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")

  // Contract reads
  const { data: poolInfo, isLoading: poolLoading } = usePoolInfo()
  const { data: lpBalance } = useLPBalance(address)
  const { data: token0Balance } = useTokenBalance(HYPEREVM.TOKEN0, address)
  const { data: token1Balance } = useTokenBalance(HYPEREVM.TOKEN1, address)

  // Contract writes
  const { approve, isPending: isApproving } = useApproveToken()
  const { deposit, isPending: isDepositing, isConfirming: isDepositConfirming } = useDeposit()
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithdrawConfirming } = useWithdraw()

  const handleDeposit = async () => {
    if (!address || !depositAmount) return
    const amount = parseTokenAmount(depositAmount, 6) // Assuming USDC decimals

    // Approve first
    await approve(HYPEREVM.TOKEN0, amount)
    await approve(HYPEREVM.TOKEN1, amount)

    // Then deposit
    deposit(amount, amount, address)
  }

  const handleWithdraw = async () => {
    if (!address || !withdrawAmount) return
    const amount = parseTokenAmount(withdrawAmount, 18)
    withdraw(amount, address)
  }

  // Format pool data
  const reserve0 = poolInfo ? formatTokenAmount(poolInfo[3], 6) : "0"
  const reserve1 = poolInfo ? formatTokenAmount(poolInfo[4], 18) : "0"
  const totalSupply = poolInfo ? formatTokenAmount(poolInfo[10], 18) : "0"
  const oraclePrice = poolInfo ? formatTokenAmount(poolInfo[11], 18) : "0"
  const userLPBalance = lpBalance ? formatTokenAmount(lpBalance, 18) : "0"
  const userToken0 = token0Balance ? formatTokenAmount(token0Balance, 6) : "0"

  return (
    <div className="space-y-8">
      {/* Stats Row */}
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
                    className="bg-black/50 border-border/50 text-lg font-mono pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                    USDC
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available Balance</span>
                <span className="font-mono">{parseFloat(userToken0).toLocaleString()} mUSDC</span>
              </div>
              <Button
                onClick={handleDeposit}
                disabled={!isConnected || isApproving || isDepositing || isDepositConfirming}
                className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 font-medium tracking-tight"
              >
                {isApproving || isDepositing || isDepositConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isApproving ? "Approving..." : isDepositing ? "Depositing..." : "Confirming..."}
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="mr-2 h-4 w-4" />
                    Deposit to Vault
                  </>
                )}
              </Button>
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
                disabled={!isConnected || isWithdrawing || isWithdrawConfirming}
                className="w-full bg-transparent font-medium tracking-tight"
                variant="outline"
              >
                {isWithdrawing || isWithdrawConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isWithdrawing ? "Withdrawing..." : "Confirming..."}
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Withdraw from Vault
                  </>
                )}
              </Button>
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
                <p className="text-emerald-400 font-mono font-medium text-sm">
                  {isConnected ? "Active" : "Not Connected"}
                </p>
                <p className="text-caption">Flexible</p>
              </div>
            </div>

            {!isConnected && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm">Connect your wallet to view your position and interact with the vault.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
