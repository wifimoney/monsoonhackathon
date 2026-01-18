"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { DataCard } from "@/components/data-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, ArrowUpRight, ArrowDownLeft, Lock, Loader2, ShieldCheck, AlertTriangle } from "lucide-react"
import { usePoolInfo, formatTokenAmount, parseTokenAmount } from "@/lib/contracts/hooks"
import { HYPEREVM } from "@/lib/contracts/addresses"
import { toast } from "sonner"

interface SaltSession {
  authenticated: boolean;
  activeAccountId: string | null;
  activeOrgId: string | null;
  activeAccountAddress: string | null;
}

interface SaltBalances {
  address: string;
  native: { balance: string };
  tokens: Array<{ symbol: string, address: string, balance: string }>;
}

export default function VaultPage() {
  const { isConnected: isWalletConnected } = useAccount()
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [selectedToken, setSelectedToken] = useState<string>(HYPEREVM.TOKEN0)

  // Salt State
  const [session, setSession] = useState<SaltSession | null>(null);
  const [balances, setBalances] = useState<SaltBalances | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Contract reads (Global Pool Stats)
  const { data: poolInfo, isLoading: poolLoading } = usePoolInfo()

  // 1. Fetch Salt Session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/salt/session');
        const data = await res.json();
        setSession(data);
      } catch (e) {
        console.error("Failed to load session", e);
      } finally {
        setIsSessionLoading(false);
      }
    };
    fetchSession();
  }, []);

  // 2. Fetch Salt Balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!session?.activeAccountId || !session?.activeOrgId) return;
      try {
        const res = await fetch(`/api/vault/balances?orgId=${session.activeOrgId}&accountId=${session.activeAccountId}`);
        const data = await res.json();
        setBalances(data);
      } catch (e) {
        console.error("Failed to load balances", e);
      }
    };
    fetchBalances();
    // Poll every 10s
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const handleDeposit = async () => {
    if (!session?.authenticated || !depositAmount) return;

    setIsDepositing(true);
    try {
      const res = await fetch('/api/vault/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: session.activeOrgId,
          accountId: session.activeAccountId,
          tokenAddress: selectedToken,
          amount: parseTokenAmount(depositAmount, 6).toString()
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Deposit Initiated via Salt", {
          description: `Tx: ${data.txHash?.slice(0, 10)}...`
        });
        setDepositAmount("");
      } else {
        toast.error("Deposit Failed", { description: data.error || "Unknown error" });
      }
    } catch (e) {
      toast.error("Error submitting deposit");
    } finally {
      setIsDepositing(false);
    }
  }

  // Format pool data
  const reserve0 = poolInfo ? formatTokenAmount(poolInfo[3], 6) : "0"
  const reserve1 = poolInfo ? formatTokenAmount(poolInfo[4], 18) : "0"
  const totalSupply = poolInfo ? formatTokenAmount(poolInfo[10], 18) : "0"
  const oraclePrice = poolInfo ? formatTokenAmount(poolInfo[11], 18) : "0"

  // User Data (from Salt)
  const saltUSDC = balances?.tokens.find(t => t.symbol === "mUSDC")?.balance || "0";
  // For LP balance, we'd need to fetch the LP token balance of the salt account. 
  // Our current API only returns Token0/Token1. 
  // TODO: Add LP token to balances API. For now, show placeholder.
  const saltLP = "0.00";

  return (
    <div className="space-y-8">
      {/* Session Status */}
      <div className="flex items-center justify-between bg-card/30 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          {isSessionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : session?.authenticated ? (
            <>
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Salt Guarded Session Active</p>
                <p className="text-xs text-muted-foreground font-mono">
                  Vault: {session.activeAccountAddress?.slice(0, 8)}...{session.activeAccountAddress?.slice(-6)}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <p className="text-sm text-yellow-400">Salt Session Not Connected. Env vars missing.</p>
            </>
          )}
        </div>
      </div>

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
                <span className="text-muted-foreground">Salt Vault Balance</span>
                <span className="font-mono">{parseFloat(saltUSDC).toLocaleString()} mUSDC</span>
              </div>
              <Button
                onClick={handleDeposit}
                disabled={!session?.authenticated || isDepositing}
                className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 font-medium tracking-tight"
              >
                {isDepositing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing via Salt...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Secure Deposit
                  </>
                )}
              </Button>
            </TabsContent>
            <TabsContent value="withdraw" className="mt-6 space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <p className="text-sm text-yellow-400">Withdrawals are managed via Policy Proposal only in this demo.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Your Position */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <h2 className="mb-4">Vault Position</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-border/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Monsoon LP (Salt Vault)</p>
                  <p className="text-caption font-mono">-- mLP</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-mono font-medium text-sm">
                  {session?.authenticated ? "Secured" : "Unknown"}
                </p>
                <p className="text-caption">Auto-Compounding</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
