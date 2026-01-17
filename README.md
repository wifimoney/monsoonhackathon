# Monsoon - Policy-Controlled Trading Agent

**AI-powered trading with Salt policy enforcement for HyperEVM.**

Monsoon is a next-generation trading platform that combines LLM-powered intent classification with deterministic market matching and Salt's policy enforcement layer. Users describe trades in natural language, and the system handles everything from market selection to guardrail checks to tamper-resistant execution.

---

## 🎯 Core Concept

```
Natural Language → LLM Intent → Market Matching → Guardrails → Salt Enforcement → Execution
```

**Example:**
```
User: "I want safe exposure to gold, around $200"
  ↓
LLM: { assetClass: "commodity", preference: "safe_haven", size: 200 }
  ↓
Matcher: GOLD (score: 0.92), SILVER (0.71)
  ↓
Guardrails: ✅ Passed (within limits)
  ↓
Salt: ✅ Approved (policy compliant)
  ↓
Execution: BUY GOLD/USDH $200
```

---

## 🏗️ Architecture

### 1. **Agent Layer** (`src/agent/`)
Handles natural language processing and trade intent classification.

- **`intent-classifier.ts`** - LLM-powered intent extraction via OpenRouter (Claude 3.5 Sonnet)
- **`token-matcher.ts`** - Deterministic market scoring (relevance + liquidity + risk)
- **`action-builder.ts`** - Converts matched markets into executable actions
- **`market-data.ts`** - Static market data (GOLD, OIL, SILVER, BTC, ETH)
- **`response-generator.ts`** - LLM-generated natural language responses

### 2. **Robo Guardians Layer** (`src/guardians/`)
Local risk engine with 7 guardian types protecting your automation.

| Guardian | Enforces | Salt Native? |
|----------|----------|--------------|
| 💰 **Spend** | Max $250/trade, $1000/day | ✅ Yes |
| 📊 **Leverage** | Max 3x leverage | ❌ Local |
| 🎯 **Exposure** | Max $500 per asset | ❌ Local |
| 🏛️ **Venue** | Allowlisted contracts only | ✅ Yes |
| ⏱️ **Rate** | 10 trades/day, 60s cooldown | ❌ Local |
| 🕐 **Time Window** | 09:00-17:00 UTC | ❌ Local |
| 🛑 **Loss** | Drawdown kill switch | ❌ Local |

**Files:**
- **`types.ts`** - Guardian configs, presets, strategy configs
- **`state.ts`** - Persistent state (daily spend, trade count, positions)
- **`risk-engine.ts`** - Central check function for all guardians

### 3. **Salt Integration** (`src/salt/`)
Tamper-resistant policy enforcement layer.

- **`client.ts`** - SaltClient wrapper with authenticate, transfer, submitTx
- **`config.ts`** - Salt providers and signer for server-side use
- **`chains.ts`** - Chain configuration (HyperEVM, Arbitrum Sepolia, Base Sepolia)
- **`types.ts`** - PolicyBreach, Guardrails, TransferResult types

### 4. **Strategy Presets** (`src/guardians/types.ts`)
Pre-configured "Robo Manager" strategies for specific use cases:

| Preset | Purpose | Key Policies |
|--------|---------|--------------|
| 📊 **Basis/Funding Arb** | Funding/basis arbitrage | Min funding rate, max exposure |
| ⚖️ **Auto-Hedge Delta** | Delta-neutral hedging | Delta threshold, max hedge size |
| 🕐 **Market Hours Mode** | Time-restricted trading | 9-17 UTC, weekend lock |
| 🛑 **Drawdown Stop** | Circuit breaker | Max drawdown, account pause |

### 5. **Human-in-the-Loop Approvals** (`src/approvals/`)
Explicit approval flow for agent automation.

- **`types.ts`** - PendingAction, ActionType, ApprovalStatus
- **`store.ts`** - Propose/approve/reject logic
- **API**: `/api/approvals` - List & propose, `/api/approvals/[id]` - Approve/reject

**Flow:**
```
1️⃣ Agent proposes action → 2️⃣ Policy check → 3️⃣ Human approves → 4️⃣ Salt executes
```

### 6. **Audit Trail** (`src/audit/`)
SQLite-backed audit logging for all actions.

- **`db.ts`** - SQLite database with WAL mode
- **`store.ts`** - CRUD operations, filtering, stats, CSV export
- **`types.ts`** - AuditRecord, AuditFilter, AuditStats

---

## 📁 Project Structure

```
monsoonhackathon/
├── src/
│   ├── agent/                    # Trading agent core
│   ├── guardians/                # Local risk engine (Robo Guardians)
│   ├── salt/                     # Salt SDK integration
│   ├── approvals/                # Human-in-the-loop approval system
│   ├── audit/                    # Audit trail (SQLite)
│   ├── openrouter/               # LLM client
│   │
│   ├── components/
│   │   ├── chat/                 # Chat trader UI
│   │   ├── guardians/            # Guardian configuration + Strategy presets
│   │   ├── approvals/            # Pending actions queue, action cards
│   │   ├── audit/                # Audit table, filters, stats, detail view
│   │   ├── salt/                 # Salt UI (Simulators, Lifecycle)
│   │   └── TabNav.tsx            # Main navigation
│   │
│   ├── app/
│   │   ├── (tabs)/               # Main app pages
│   │   │   ├── onboard/          # Onboarding & Connection
│   │   │   ├── trade/            # Chat Trading Interface
│   │   │   ├── agent/            # Robo Manager (Human-in-the-Loop)
│   │   │   ├── guardians/        # Guardian Configuration + Strategies
│   │   │   └── audit/            # Audit Log & Receipts
│   │   │
│   │   └── api/                  # API Routes
│   │       ├── chat/             # Intent & Execution
│   │       ├── guardians/        # Config, State, Strategy eligibility
│   │       ├── approvals/        # Pending actions CRUD
│   │       ├── audit/            # Audit records, stats, export
│   │       └── salt/             # Simulation & Status
│   │
├── data/                         # SQLite database (gitignored)
├── scripts/
│   ├── check-salt-connection.ts  # Verify SDK auth
│   └── test-guardrails-trades.ts # Full system test suite
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Salt account (for policy enforcement)
- OpenRouter API key (for LLM)
- Ethereum Wallet (MetaMask, Rabby, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/wifimoney/monsoonhackathon.git
cd monsoonhackathon

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```bash
# Data & Network
PRIVATE_KEY=your_private_key
ORCHESTRATION_NETWORK_RPC_NODE_URL=https://sepolia-rollup.arbitrum.io/rpc
BROADCASTING_NETWORK_RPC_NODE_URL=https://sepolia-rollup.arbitrum.io/rpc
BROADCASTING_NETWORK_ID=421614
AGENT="SOMNIA"

# Salt Account
ALLOWED_RECIPIENT=0x...
SALT_ORG_ID=your_org_id
SALT_ACCOUNT_ID=your_account_id

# LLM
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📱 User Interface

### 1. **Trade Page** (`/trade`)
**"Talk to your portfolio."**
- Chat interface for natural language trading
- Real-time intent classification
- Market matching with confidence scores
- Instant guardrail feedback

### 2. **Agent Page** (`/agent`) 🆕
**"Human-in-the-loop automation."**
- **Robo Manager Actions**: Auto-hedge, Deploy Liquidity, Rebalance, Basket Trade
- **Pending Queue**: Actions awaiting approval with countdown timers
- **Approve/Reject**: One-click decisions with policy check status
- **Recent Decisions**: History of approved/rejected actions

### 3. **Guardians Page** (`/guardians`)
**"Configure your safety net."**
- **Presets**: One-click switch between Conservative/Default/Pro
- **Strategy Presets**: Basis Arb, Auto-Hedge, Market Hours, Drawdown Stop
- **Live Counters**: Track remaining daily budget and trades
- **Toggles**: Enable/disable individual guardians
- **Test Mode**: Simulate denials and strategy eligibility

### 4. **Audit Page** (`/audit`) 🆕
**"Complete transaction history."**
- **Stats Dashboard**: Total actions, success rate, denials, volume
- **Filterable Table**: By status, action type, category, time range
- **Detail View**: Full audit record with policy denials
- **CSV Export**: Download for offline analysis
- **Auto-Refresh**: Real-time updates

### 5. **Onboard Page** (`/onboard`)
**"Connect and verify."**
- Wallet connection (Injected/MetaMask)
- Salt account status
- System health checks

---

## 🧪 Testing & Verification

We include comprehensive test scripts to verify the entire stack.

### 1. Run the Full Test Suite
Tests connectivity, all 7 guardians, and trade simulation flows.

```bash
# Use your local env vars
export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/test-guardrails-trades.ts
```

**What it tests:**
- ✅ Salt SDK Authentication
- ✅ Spend Limit enforcement
- ✅ Leverage Limit enforcement
- ✅ Rate Limit cooldowns
- ✅ Time Window restrictions
- ✅ Loss Guardian kill switch
- ✅ Full trade lifecycle (Pre-flight → Execute → Record)

### 2. Check Salt Connectivity Only
```bash
export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/check-salt-connection.ts
```

### 3. Test Strategy Presets
```bash
# Test Basis Arb eligibility
curl "http://localhost:3000/api/guardians/strategy?strategy=basisArb"

# Test Market Hours (blocked on weekends)
curl "http://localhost:3000/api/guardians/strategy?strategy=marketHours"

# Simulate failure
curl "http://localhost:3000/api/guardians/strategy?strategy=basisArb&fail=true"
```

### 4. Test Approvals Flow
```bash
# Create demo pending actions
curl -X POST "http://localhost:3000/api/approvals" -d '{"demo": true}'

# List pending actions
curl "http://localhost:3000/api/approvals"

# Approve an action
curl -X POST "http://localhost:3000/api/approvals/ACTION_ID" -d '{"action": "approve"}'
```

### 5. Manual UI Testing
1. Go to **/guardians** → Scroll to Strategy Presets → Click "Test"
2. Go to **/agent** → Click "Create Demo Pending Actions" → Approve/Reject
3. Go to **/audit** → View logged actions and filter

---

## 🔐 Security Model

### Local Guardrails vs. Salt Policies

| Feature | Local Guardrails | Salt Policies |
|---------|------------------|---------------|
| **Enforcement** | Client/Server code | On-chain / MPC |
| **Logic** | Context-aware (Time, PnL) | Deterministic (Allowlist, Limits) |
| **Flexibility** | High (Change in UI) | Low (Requires signing) |
| **Purpose** | Operational safety | Catastrophic loss prevention |

**Best Practice:** Use Local Guardrails for day-to-day risk management and Salt Policies for hard limits that must never be breached.

---

## 🆕 New Features Summary

| Feature | Tab | Description |
|---------|-----|-------------|
| **Strategy Presets** | `/guardians` | 4 pre-configured trading strategies with eligibility checks |
| **Human-in-the-Loop** | `/agent` | Propose → Approve → Execute flow for automation |
| **Audit Trail** | `/audit` | SQLite-backed logging with filtering and export |

---

## 📝 License

MIT

---

## 📧 Contact

For questions or support, please open an issue on GitHub.
