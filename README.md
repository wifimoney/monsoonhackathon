# Monsoon: The AI Agentic Asset Manager

**Monsoon** is an intelligent asset management protocol built for the **Salt & Valantis Hackathon**. It bridges the gap between on-chain DeFi liquidity and off-chain AI execution, protected by Salt's robust guardrail infrastructure.

---

## 🚀 Key Features

### 1. 🛡️ Guarded AI Agents (Salt + Pear Protocol)
Monsoon enables users to trade via natural language ("Buy $100 ETH") while enforcing strict safety policies.
- **Middleware Interception**: All AI intents are intercepted by our `GuardianService` before execution.
- **Policy Enforcement**: Trades exceeding limits (e.g., >$250/trade or restricted assets) are **blocked instantly** before reaching the chain.
- **Execution**: Validated intents are executed efficiently on **Hyperliquid** via the **Pear Protocol** SDK.

### 2. 💧 Sovereign ALM (Valantis)
A custom Automated Liquidity Manager (ALM) built on Valantis Sovereign Pools that intelligently routes liquidity.
- **Dynamic Pricing**: Calculates Bid/Ask spreads based on inventory skew and real-time oracle data (`HyperCoreQuoter`).
- **Yield Allocation**: Automatically routes idle capital to yield-bearing strategies (Mocked Chorus One/Aave adapters) to maximize efficiency.
- **Orderbook Integration**: Emits `AllocateToOB` events to sync on-chain reserves with off-chain CLOB orders.

### 3. ⚡ Off-Chain Executor
A TypeScript-based service that listens to on-chain ALM events and mirrors them on the Hyperliquid orderbook in real-time.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User[User Interface] -->|1. Chat Intent| AI[Intelligence Layer]
    AI -->|2. Structured Proposal| API[API Route / accept]
    
    subgraph "Safety Layer"
        API -->|3. Validate| Guardian[Guardian Service]
        Guardian -->|4. Check Policy| Salt[Salt Policies]
        Salt -- Blocked --> Reject[403 Forbidden]
        Salt -- Approved --> Pear[Pear Protocol SDK]
    end
    
    Pear -->|5. Execute Trade| HL[Hyperliquid]
    
    subgraph "DeFi Vault Layer"
        ALM[MonsoonALM] -->|Query| Oracle[Dynamic Pricing Module]
        ALM -->|Route| Yield[Yield Strategy]
        ALM -->|Event| Event[AllocateToOB]
    end
    
    Event -.->|Listen| Executor[Off-Chain Executor]
    Executor -->|Place Order| HL
```

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js v20+
- `pnpm` or `npm`
- Arbitrum Sepolia RPC URL

### 1. Clone & Install
```bash
git clone https://github.com/wifimoney/monsoonhackathon.git
cd monsoonhackathon
npm install
```

### 2. Environment Configuration
Create `.env.local`:
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_id"
OPENROUTER_API_KEY="your_key" # For Agent Chat
EXECUTOR_PRIVATE_KEY="your_pk" # For OB Executor
```

### 3. Running the App
```bash
# Start the Next.js Frontend
npm run dev
```
Access the dashboard at `http://localhost:3000`.

### 4. Running the Executor
To enable the Orderbook syncing service:
```bash
# In a separate terminal
export EXECUTOR_PRIVATE_KEY="your_private_key"
npx tsx src/executor/index.ts
```

---

## 📜 Contract Addresses (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| **MonsoonALM** | `0x63825fb627b0e85b2f70a3b42fe530c7e6d72498` |
| **SovereignPool** | `0x82b785a3ab55772c88381c4387083399422cdfcd` |
| **HyperCoreQuoter** | `0x37f4e2a0a4a59f2a0405c4e539a39d90cf355d84` |
| **Token0 (mUSDC)** | `0xaa6a7b7faa7f28566fe5c3cfc628a1ee0583a0ba` |
| **Token1 (mWETH)** | `0xe4e118a0b252a631b19789d84f504b10167466e2` |

---

## 🧪 Verification

### Verify Guardrails
Run the included script to test safety policies:
```bash
./verify_guardrails.sh
```
*   **Normal Trade ($100)**: Should PASS.
*   **Volatile Trade ($300)**: Should be BLOCKED by Salt Policy.

---

## 👥 The Team
Built with ❤️ for the Salt & Valantis Hackathon.
