# Monsoon - HyperEVM Liquidity Management Protocol

**Salt-gated liquidity management with HyperCore orderbook integration.**

Monsoon is a next-generation DeFi protocol that combines Valantis Sovereign Pools as the AMM base layer with HyperCore's native orderbook for price discovery. Users can deposit liquidity, and strategists can allocate portions to the HyperCore orderbook—all protected by Salt policy enforcement.

---

## 🎯 Core Concept

```
Deposit → AMM Pool ← HyperCore Price → OB Allocation → Execution
            ↓                              ↓
       Salt Policies              Off-Chain Executor
```

**Key Innovation:** Zero-oracle pricing using HyperCore's native precompile, with Salt-gated actions for institutional-grade security.

---

## 🏗️ Architecture

### 1. **Smart Contracts** (`contracts/`)
Core on-chain infrastructure deployed on Arbitrum Sepolia (testnet).

| Contract | Address | Description |
|----------|---------|-------------|
| MonsoonALM | `0x63825fb627b0e85b2f70a3b42fe530c7e6d72498` | Main liquidity module |
| HyperCoreQuoter | `0x37f4e2a0a4a59f2a0405c4e539a39d90cf355d84` | Price oracle from HyperCore |
| SovereignPool | `0x82b785a3ab55772c88381c4387083399422cdfcd` | Valantis AMM pool |
| Token0 (mUSDC) | `0xaa6a7b7faa7f28566fe5c3cfc628a1ee0583a0ba` | Mock USDC |
| Token1 (mWETH) | `0xe4e118a0b252a631b19789d84f504b10167466e2` | Mock WETH |

### 2. **Frontend** (`src/`)
Next.js 16 application with wagmi wallet integration.

| Page | Route | Features |
|------|-------|----------|
| Landing | `/` | Animated shader background |
| Trade | `/dashboard/trade` | Swap interface |
| Vault | `/dashboard/vault` | **Live deposit/withdraw with contract hooks** |
| Agent | `/dashboard/agent` | AI chat interface |
| Orderbook | `/dashboard/orderbook` | Order book viewer |
| Pear | `/dashboard/pear` | Pair trading |
| Guardians | `/dashboard/guardians` | Salt policy toggles |
| Audit | `/dashboard/audit` | Transaction history |

### 3. **Off-Chain Services** (`src/executor/`, `src/lifi/`)
Background services for orderbook execution and cross-chain bridging.

- **OB Executor** - Listens for `AllocateToOB` events and places orders on HyperLiquid
- **LI.FI Bridge** - Cross-chain deposits from Ethereum, Arbitrum, etc.

### 4. **Salt Integration** (`src/salt/`)
Policy enforcement layer with gated actions.

- **Deposit Policy** - Max amounts, allowed tokens
- **Rebalance Policy** - Max allocation %, cooldowns
- **OB Order Policy** - Max spread, order size limits

---

## 📁 Project Structure

```
monsoonhackathon/
├── contracts/                    # Foundry smart contracts
│   ├── src/
│   │   ├── MonsoonALM.sol       # Core liquidity module
│   │   ├── HyperCoreQuoter.sol  # Price oracle
│   │   └── interfaces/          # Contract interfaces
│   ├── script/
│   │   ├── Deploy.s.sol         # Production deployment
│   │   └── DeployMocks.s.sol    # Testnet deployment
│   └── test/                     # Foundry tests
│
├── src/
│   ├── app/                      # Next.js app router
│   │   ├── dashboard/            # Dashboard pages
│   │   └── api/                  # API routes
│   ├── components/               # React components
│   ├── lib/
│   │   ├── contracts/            # ABIs, addresses, wagmi hooks
│   │   └── wagmi.tsx             # Web3Provider
│   ├── salt/                     # Policy validation
│   ├── lifi/                     # Bridge integration
│   ├── executor/                 # OB executor service
│   └── audit/                    # Audit logging
│
└── DEPLOYMENT.md                 # Deployment notes
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Foundry (for contracts)
- MetaMask or compatible wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/wifimoney/monsoonhackathon.git
cd monsoonhackathon

# Install dependencies
npm install

# Install Foundry dependencies
cd contracts && forge install
```

### Running the Frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Running the Executor

```bash
export EXECUTOR_PRIVATE_KEY="your_private_key"
npx tsx src/executor/index.ts
```

### Deploying Contracts

```bash
cd contracts

# Set environment
cp .env.example .env
# Edit .env with your private key

# Deploy to Arbitrum Sepolia
forge script script/DeployMocks.s.sol --tc DeployMocksAndMonsoon \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc --broadcast
```

---

## 🔐 Security Model

### Salt Policy Layers

| Layer | Enforcement | Purpose |
|-------|-------------|---------|
| **Deposit Policy** | Max per-tx, daily limits | Prevent oversized deposits |
| **Rebalance Policy** | Max allocation %, cooldowns | Prevent aggressive OB exposure |
| **OB Order Policy** | Spread limits, size caps | Prevent market manipulation |

### Gated Actions
All sensitive operations go through Salt validation:

```typescript
const result = await gatedDeposit(amount, token, executeDeposit);
if (!result.success) {
  console.log('Blocked:', result.validationResult.reason);
}
```

---

## 🔧 Technical Architecture: Salt + HyperEVM Integration

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│  (Next.js Dashboard - Trade, Vault, Agent, Guardians pages)        │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SALT POLICY LAYER                              │
│  src/salt/policies.ts      │  src/salt/gatedActions.ts              │
│  ─────────────────────────   ─────────────────────────              │
│  • DepositPolicy           │  • gatedDeposit()                      │
│  • RebalancePolicy         │  • gatedRebalance()                    │
│  • OBOrderPolicy           │  • gatedOBOrder()                      │
│  • PolicyValidator         │                                        │
│                            │  ↓ VALIDATES before execution          │
└────────────────────────────┼────────────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
          ▼                                     ▼
┌─────────────────────────┐         ┌─────────────────────────────────┐
│   HYPEREVM CONTRACTS    │         │      OFF-CHAIN EXECUTOR         │
│   (On-chain)            │         │      src/executor/index.ts      │
│   ─────────────────────  │         │      ─────────────────────────  │
│   MonsoonALM:           │◄────────┤   • Listens for AllocateToOB   │
│   • deposit()           │  events │   • Places orders on HyperCore  │
│   • withdraw()          │         │   • Uses Salt OBOrderPolicy     │
│   • allocateToOB()      │         │                                 │
│   • deallocateFromOB()  │         │                                 │
│                         │         │                                 │
│   HyperCoreQuoter:      │         └─────────────────────────────────┘
│   • getMidPrice() ◄─────┼─── Calls HyperCore precompile (0x800)
│                         │
└─────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    HYPERCORE NATIVE ORDERBOOK                       │
│         (Hyperliquid's L1 - accessed via precompile)               │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Layer | Responsibility |
|-----------|-------|----------------|
| **Salt Policies** | Off-chain | Define limits (max deposit, max allocation %, spreads) |
| **Gated Actions** | Off-chain | Validate actions BEFORE sending to chain |
| **Wagmi Hooks** | Off-chain | `useDeposit()`, `useAllocateToOB()` contract calls |
| **MonsoonALM** | On-chain | Execute deposits, emit events, manage liquidity |
| **HyperCoreQuoter** | On-chain | Call precompile `0x800` for live prices |
| **OB Executor** | Off-chain | Listen to events, place orders on HyperCore |

### Flow Example: Salt-Gated Deposit

```typescript
// 1. User clicks "Deposit" in UI
// 2. Salt validates the action BEFORE sending to chain:

const result = await gatedDeposit(
  parseUnits("1000", 6),           // amount
  TOKEN0_ADDRESS,                   // token
  async () => {
    // 3. Only if Salt approves, execute on HyperEVM:
    return deposit(amount0, amount1, recipient);
  }
);

if (!result.success) {
  // Salt blocked it - show denial in UI
  console.log("Blocked:", result.validationResult.reason);
  // Reason: "Amount exceeds max per transaction (100000)"
}
```

### Flow Example: Rebalance → OB Order

```
┌─────────┐    ┌───────────┐    ┌─────────────┐    ┌──────────────┐
│Strategist│───▶│   Salt    │───▶│ MonsoonALM  │───▶│  Executor   │
│   UI     │    │ Validates │    │ allocateToOB│    │ Places Order│
└─────────┘    └───────────┘    └─────────────┘    └──────────────┘
     │              │                   │                  │
     │   maxAlloc   │    emit event     │   validate       │
     │   cooldown   │                   │   OBOrderPolicy  │
     │              │                   │                  │
                                        ▼                  ▼
                                 ┌─────────────────────────────┐
                                 │   HyperCore Orderbook       │
                                 │   (Native L1 matching)      │
                                 └─────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/salt/policies.ts` | Policy definitions (DepositPolicy, RebalancePolicy, OBOrderPolicy) |
| `src/salt/gatedActions.ts` | Wrapper functions that validate before execution |
| `src/lib/contracts/hooks.ts` | Wagmi hooks for contract interactions |
| `src/executor/index.ts` | Event listener + order placement service |
| `contracts/src/MonsoonALM.sol` | Core vault with OB allocation logic |
| `contracts/src/HyperCoreQuoter.sol` | Precompile wrapper for HyperCore prices |

### HyperCore Price Integration

The `HyperCoreQuoter` contract calls HyperCore's native precompile at address `0x800`:

```solidity
// contracts/src/HyperCoreQuoter.sol
function getMidPrice() external view returns (uint256) {
    // Try native HyperCore precompile first
    (bool success, bytes memory data) = HYPERCORE_PRECOMPILE.staticcall(
        abi.encodeWithSelector(IHyperCoreRead.getMidPriceForMarket.selector, ASSET_INDEX)
    );
    
    if (success && data.length >= 32) {
        return abi.decode(data, (uint256));
    }
    
    // Fallback to off-chain updated price
    return fallbackPrice;
}
```

This provides **zero-oracle pricing** by reading directly from Hyperliquid's L1 orderbook state.

### Summary

| Module | Role |
|--------|------|
| **Salt** | Off-chain policy enforcement (prevents bad actions) |
| **HyperEVM** | On-chain execution (deposits, allocations) |
| **HyperCore** | Native orderbook (price discovery, order matching) |
| **Executor** | Bridge between on-chain events and orderbook orders |


## 🧪 Testing

### Smart Contract Tests
```bash
cd contracts
forge test -vvv
```

### Frontend
```bash
npm run dev
# Navigate to http://localhost:3000/dashboard/vault
# Connect wallet and interact
```

---

## 📊 Key Features

| Feature | Status | Description |
|---------|--------|-------------|
| ✅ Valantis Integration | Complete | Sovereign Pool as AMM base |
| ✅ HyperCore Pricing | Complete | Zero-oracle via precompile |
| ✅ Wagmi Wallet | Complete | Real wallet connection |
| ✅ Live Vault Page | Complete | Contract reads/writes |
| ✅ Salt Policies | Complete | Gated deposit/rebalance |
| ✅ OB Executor | Complete | Event-driven order placement |
| ✅ LI.FI Bridge | Complete | Cross-chain deposits |
| ✅ Audit Trail | Complete | Action logging |

---

## 📝 License

MIT

---

## 📧 Contact

For questions or support, please open an issue on GitHub.
