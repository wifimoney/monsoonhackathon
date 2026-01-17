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

**Flow:**
```typescript
classifyIntent(userMessage) 
  → matchMarkets(intent) 
  → buildActionIntent(topMatch) 
  → generateResponse()
```

### 2. **Guardians Layer** (`src/guardians/`)
Local risk engine with 7 guardian types.

#### Guardian Types:

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
- **`types.ts`** - Guardian configs, presets (Conservative/Default/Pro)
- **`state.ts`** - Persistent state (daily spend, trade count, positions)
- **`risk-engine.ts`** - Central check function for all guardians

**Pattern:**
```
Local Guardians (context-aware) → Salt Policies (tamper-resistant)
```

### 3. **Salt Integration** (`src/salt/`)
Tamper-resistant policy enforcement layer.

- **`client.ts`** - SaltClient wrapper with authenticate, transfer, submitTx
- **`config.ts`** - Salt providers and signer for server-side use
- **`chains.ts`** - Chain configuration (HyperEVM, Arbitrum Sepolia, Base Sepolia)
- **`types.ts`** - PolicyBreach, Guardrails, TransferResult types
- **`transaction-tracker.ts`** - Transaction state machine tracking

**Key Features:**
- Policy breach detection and handling
- Transaction lifecycle tracking (proposed → policy_check → signing → broadcasting → confirmed)
- Account discovery and selection
- Multi-org support

### 4. **Advanced Features** (`src/agent/`)

#### Policy Simulation
- **`policy-simulator.ts`** - Pre-flight checks before execution
- Real-time "Would Pass/Fail" feedback
- What-if scenario suggestions

#### Autonomy Levels
- **`autonomy.ts`** - 4 trust levels (Manual → Semi-Auto → Auto-Bounded → Full Auto)
- Level 1: Auto-execute trades ≤ $50 in approved markets
- Level 2: Trust Salt completely
- Level 3: Maximum freedom (requires acknowledgment)

#### Position Sizing
- **`position-sizer.ts`** - Policy-aware position recommendations
- **`spending-tracker.ts`** - Daily/weekly budget tracking
- Risk-adjusted sizing based on spread, liquidity, volatility

#### Breach Analytics
- **`breach-analytics.ts`** - Track policy violations
- Group by type, policy, market
- Suggest guardrail adjustments

---

## 📁 Project Structure

```
monsoonhackathon/
├── src/
│   ├── agent/                    # Trading agent core
│   │   ├── intent-classifier.ts  # LLM intent extraction
│   │   ├── token-matcher.ts      # Market scoring
│   │   ├── action-builder.ts     # Action intent builder
│   │   ├── market-data.ts        # Static market data
│   │   ├── response-generator.ts # LLM responses
│   │   ├── policy-simulator.ts   # Pre-flight checks
│   │   ├── autonomy.ts           # Trust levels
│   │   ├── position-sizer.ts     # Smart sizing
│   │   ├── spending-tracker.ts   # Budget tracking
│   │   └── breach-analytics.ts   # Violation tracking
│   │
│   ├── guardians/                # Risk engine
│   │   ├── types.ts              # Guardian configs
│   │   ├── state.ts              # Persistent state
│   │   ├── risk-engine.ts        # Central check
│   │   └── index.ts              # Barrel export
│   │
│   ├── salt/                     # Salt SDK integration
│   │   ├── client.ts             # SaltClient wrapper
│   │   ├── config.ts             # Providers & signer
│   │   ├── chains.ts             # Chain configs
│   │   ├── types.ts              # Salt types
│   │   ├── helpers.ts            # Utilities
│   │   └── transaction-tracker.ts # State machine
│   │
│   ├── openrouter/               # LLM client
│   │   └── client.ts             # OpenAI-compatible API
│   │
│   ├── components/
│   │   ├── chat/                 # Chat trader UI
│   │   │   ├── ChatTrader.tsx    # Main component
│   │   │   ├── ChatMessages.tsx  # Message display
│   │   │   ├── ChatInput.tsx     # Input with suggestions
│   │   │   └── TradePreview.tsx  # Trade preview card
│   │   │
│   │   ├── guardians/            # Guardian UI
│   │   │   ├── GuardianCard.tsx  # Reusable card
│   │   │   ├── PresetSelector.tsx # Preset switcher
│   │   │   └── LossGuardianCard.tsx # Kill switch
│   │   │
│   │   ├── salt/                 # Salt UI components
│   │   │   ├── PolicySimulator.tsx # What-if checks
│   │   │   ├── AutonomyControl.tsx # Trust levels
│   │   │   ├── PositionSizer.tsx   # Smart sizing
│   │   │   ├── TransactionLifecycle.tsx # Stage viz
│   │   │   ├── BreachAnalytics.tsx # Violation charts
│   │   │   └── EmergencyStop.tsx   # Kill switch
│   │   │
│   │   └── agent/                # Legacy agent UI
│   │       └── AgentChat.tsx     # Simple NLP chat
│   │
│   ├── app/
│   │   ├── (tabs)/               # Main app pages
│   │   │   ├── onboard/          # Onboarding
│   │   │   ├── trade/            # Chat trader
│   │   │   └── guardians/        # Guardian config
│   │   │
│   │   ├── agent/                # Advanced agent dashboard
│   │   │   └── page.tsx          # Full dashboard
│   │   │
│   │   └── api/
│   │       ├── chat/             # Chat endpoints
│   │       │   ├── route.ts      # Intent + matching
│   │       │   └── execute/      # Trade execution
│   │       │
│   │       ├── guardians/        # Guardian endpoints
│   │       │   ├── check/        # Pre-flight
│   │       │   ├── config/       # Get/set config
│   │       │   ├── state/        # State counters
│   │       │   └── test/         # Test denials
│   │       │
│   │       └── salt/             # Salt endpoints
│   │           ├── simulate/     # Policy simulation
│   │           ├── execute/      # Execute tx
│   │           ├── status/       # Connection status
│   │           └── breach-analytics/ # Analytics
│   │
│   └── lib/
│       └── wagmi.tsx             # Wagmi config
│
├── scripts/
│   └── test-salt.ts              # Salt SDK test script
│
├── .env.local                    # Environment variables
└── package.json                  # Dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- OpenRouter API key (for LLM)
- Salt account (for policy enforcement)

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
# OpenRouter (LLM)
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Salt SDK
PRIVATE_KEY=your_private_key
BROADCASTING_NETWORK_RPC_NODE_URL=https://api.hyperliquid-testnet.xyz/evm
BROADCASTING_NETWORK_ID=421614
ALLOWED_RECIPIENT=0x1111111111111111111111111111111111111111
SALT_ACCOUNT_ID=your_account_id

# Optional
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📱 User Interface

### 1. **Trade Page** (`/trade`)
Chat-driven trading interface.

**Features:**
- Natural language input
- LLM intent classification
- Market matching with scores
- Trade preview with rationale
- Real-time guardrails check

**Example:**
```
User: "I want safe exposure to gold, around $200"
Agent: "Based on your request, I recommend GOLD. It has good liquidity 
        and fits your safe_haven preference. Ready to execute when you approve."

Trade Preview:
  Market: GOLD/USDH
  Side: BUY
  Size: $200
  Rationale: ✓ Safe haven asset, ✓ Inflation hedge, ✓ Low risk profile
```

### 2. **Guardians Page** (`/guardians`)
Policy configuration and testing.

**Features:**
- Preset selector (Conservative/Default/Pro)
- State counters (trades remaining, daily budget, cooldown)
- 7 guardian cards with live settings
- Test denial buttons
- Loss Guardian kill switch

**Presets:**

| Preset | Max/Trade | Leverage | Trades/Day |
|--------|-----------|----------|------------|
| Conservative | $100 | 1x | 5 |
| Default | $250 | 3x | 10 |
| Pro | $500 | 5x | 50 |

### 3. **Agent Dashboard** (`/agent`)
Advanced features dashboard.

**Features:**
- Autonomy control (4 trust levels)
- Policy simulator (what-if checks)
- Position sizer (smart recommendations)
- Transaction lifecycle (animated stages)
- Breach analytics (violation charts)
- Emergency stop button

---

## 🔧 API Routes

### Chat Endpoints

#### `POST /api/chat`
Process natural language trade intent.

**Request:**
```json
{
  "message": "I want safe exposure to gold, around $200",
  "guardrailsConfig": { ... }
}
```

**Response:**
```json
{
  "response": "Based on your request, I recommend GOLD...",
  "intent": {
    "assetClass": "commodity",
    "preference": "safe_haven",
    "constraints": { "maxSize": 200 }
  },
  "matches": [
    { "symbol": "GOLD", "score": 0.92, "matchReasons": [...] }
  ],
  "actionIntent": {
    "type": "SPOT_MARKET_ORDER",
    "market": "GOLD/USDH",
    "side": "BUY",
    "notionalUsd": 200
  },
  "guardrailsCheck": {
    "passed": true,
    "issues": []
  }
}
```

#### `POST /api/chat/execute`
Execute trade with guardrails and Salt enforcement.

**Request:**
```json
{
  "actionIntent": { ... },
  "guardrailsConfig": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "stage": "confirmed",
  "txHash": "0x...",
  "receipt": {
    "market": "GOLD/USDH",
    "side": "BUY",
    "size": 200,
    "price": 2650
  }
}
```

### Guardian Endpoints

#### `POST /api/guardians/check`
Pre-flight check all guardians.

#### `GET /api/guardians/config`
Get current guardian configuration.

#### `POST /api/guardians/config`
Update guardian configuration or apply preset.

#### `GET /api/guardians/state`
Get state counters (trades, spend, cooldown).

#### `POST /api/guardians/test`
Trigger test denial for a guardian.

### Salt Endpoints

#### `POST /api/salt/simulate`
Simulate policy checks without execution.

#### `POST /api/salt/execute`
Execute transaction with Salt enforcement.

#### `GET /api/salt/status`
Check Salt connection and configuration.

#### `GET /api/salt/breach-analytics`
Get policy breach analytics.

---

## 🎨 Design System

### Colors
```css
--primary: #6366f1 (indigo)
--card: #18181b (zinc-900)
--card-border: #27272a (zinc-800)
--muted: #71717a (zinc-500)
```

### Components
- **Cards**: Dark background with subtle borders
- **Buttons**: Primary (indigo), Success (green), Danger (red)
- **Inputs**: Dark with focus states
- **Toggles**: Animated switches
- **Sliders**: Accent color with markers

---

## 🧪 Testing

### Test Salt Connection
```bash
npx tsx scripts/test-salt.ts
```

### Test Guardian Denials
1. Go to `/guardians`
2. Click "Test Denial" on any guardian
3. Observe the denial message

### Test Chat Trader
1. Go to `/trade`
2. Type: "Buy $100 of GOLD"
3. Observe intent classification and market matching
4. Click "Approve & Execute"
5. Watch transaction lifecycle

### Test Policy Simulation
1. Go to `/agent`
2. Type a trade intent
3. Adjust size in Policy Simulator
4. Observe real-time pass/fail updates

---

## 🏛️ Salt Integration

### Policy Types

1. **PT1: Recipient Allowlist**
   - Only allowlisted contracts can receive funds
   - Enforced: Venue Guardian

2. **PT3: Transaction Limits**
   - Max spend per transaction
   - Enforced: Spend Guardian

3. **Custom Policies**
   - Leverage limits (via executor contract)
   - Exposure limits (via executor contract)
   - Time windows (local check)
   - Rate limits (local check)

### Transaction Flow

```
1. User Intent
   ↓
2. Local Guardrails Check
   ├─ Leverage ✓
   ├─ Exposure ✓
   ├─ Time Window ✓
   └─ Rate Limit ✓
   ↓
3. Salt Policy Check
   ├─ Recipient Allowlist ✓
   └─ Transaction Limit ✓
   ↓
4. Execution
   ├─ Proposed
   ├─ Policy Check
   ├─ Signing
   ├─ Broadcasting
   ├─ Confirming
   └─ Confirmed ✅
```

---

## 🤖 LLM Integration

### OpenRouter Configuration
- **Model**: Claude 3.5 Sonnet
- **Temperature**: 0.1 (intent classification), 0.7 (responses)
- **Max Tokens**: 500 (classification), 200 (responses)

### Intent Classification Prompt
```
You are a trading intent classifier. Extract:
- assetClass: commodity | crypto | all
- preference: low_risk | high_yield | balanced | hedge
- strategy: directional_long | directional_short
- constraints: { maxSize?, markets?, excludeMarkets? }
- timeHorizon: short | medium | long
- confidence: 0-1

Output JSON only.
```

### Response Generation Prompt
```
You are a helpful trading assistant. Given:
- User's intent
- Matched markets
- Recommended action

Provide a brief, helpful response (2-3 sentences).
Mention the top recommendation and any risk factors.
```

---

## 📊 Market Matching Algorithm

### Scoring Components

1. **Relevance Score** (40%)
   - Keyword matching (gold → precious_metal, safe_haven)
   - Tag overlap with intent

2. **Liquidity Score** (30%)
   - Volume24h normalized
   - OpenInterest normalized

3. **Risk Score** (20%)
   - Spread (lower is better)
   - Funding rate (closer to 0 is better)

4. **Preference Bonus** (10%)
   - Safe haven boost for hedge preference
   - High volume boost for balanced preference

### Example
```typescript
User: "I want safe exposure to gold"

GOLD:
  relevanceScore: 0.9 (matches "gold", "safe")
  liquidityScore: 0.7 (high volume)
  riskScore: 0.8 (low spread)
  preferenceBonus: 0.3 (safe haven)
  → Total: 0.85

SILVER:
  relevanceScore: 0.6 (matches "safe")
  liquidityScore: 0.4 (medium volume)
  riskScore: 0.7
  preferenceBonus: 0.3
  → Total: 0.58
```

---

## 🔐 Security

### Local Guardrails
- **Purpose**: Context-aware checks (leverage, exposure, time, rate)
- **Enforcement**: Pre-execution validation
- **Bypass Risk**: Medium (can be modified locally)

### Salt Policies
- **Purpose**: Tamper-resistant limits (spend, venue)
- **Enforcement**: On-chain policy engine
- **Bypass Risk**: None (cryptographically enforced)

### Best Practices
1. Use Salt for critical limits (spend, venue)
2. Use local guardrails for context (leverage, exposure)
3. Always show policy denials to user
4. Log all breaches for analytics
5. Implement emergency stop (Loss Guardian)

---

## 🚧 Roadmap

### Phase 1: Core (✅ Complete)
- [x] LLM intent classification
- [x] Market matching
- [x] Chat trader UI
- [x] Salt integration
- [x] Basic guardrails

### Phase 2: Advanced Features (✅ Complete)
- [x] Policy simulation
- [x] Autonomy levels
- [x] Position sizing
- [x] Transaction lifecycle
- [x] Breach analytics
- [x] 7 guardian types

### Phase 3: Production (🚧 In Progress)
- [ ] Real Hyperliquid API integration
- [ ] Multi-account support
- [ ] Portfolio tracking
- [ ] PnL calculation
- [ ] Historical trade log

### Phase 4: Scale (📋 Planned)
- [ ] Strategy backtesting
- [ ] Custom guardian creation
- [ ] Multi-chain support
- [ ] Mobile app
- [ ] Social trading

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

- **Salt SDK** - Policy enforcement layer
- **OpenRouter** - LLM API gateway
- **Hyperliquid** - Trading venue
- **Next.js** - React framework
- **Wagmi** - Ethereum React hooks

---

## 📧 Contact

For questions or support, please open an issue on GitHub.
