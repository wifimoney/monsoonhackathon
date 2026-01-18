# Monsoon Hackathon - Done List

## 1. Dynamic Oracle-Centered Pricing (Must-Have)
**Status: Complete**
- **Contracts**:
  - `contracts/src/DynamicPricingModule.sol`: Implements pure library for calculating Bid/Ask spreads based on inventory skew and mid-price.
  - `contracts/src/MonsoonALM.sol`: Updated `getLiquidityQuote` to query `HyperCoreQuoter` and apply dynamic spreads via the new module.
  - `contracts/test/MonsoonALM.t.sol`: Updated tests to verify dynamic pricing integration.
- **Frontend**:
  - Exposed `baseSpread` and `oraclePrice` in `getPoolInfo` for UI consumption.

## 2. Mock Yield Module (Must-Have)
**Status: Complete**
- **Contracts**:
  - `contracts/src/yield/MockYieldStrategy.sol`: Implemented simple yield vault logic with `deposit`, `withdraw`, and simulated `accrueInterest` (if token supports minting).
  - `contracts/src/MonsoonALM.sol`: Added `allocateToYield` and `deallocateFromYield` functions.
  - **Key Architecture Change**: `MonsoonALM` now acts as the liquidity owner in the Sovereign Pool, enabling it to withdraw funds to reallocate to external strategies.
- **Verification**:
  - Added unit tests in `MonsoonALM.t.sol` confirming pool reserves decrease when allocated to yield and restore when deallocated.

## 3. Orderbook Allocation & API Executor (Must-Have)
**Status: Complete**
- **Contracts**:
  - `contracts/src/MonsoonALM.sol`: `allocateToOB` emits `AllocateToOB` event with `isBid` flag (mapped to inventory side).
- **Off-Chain**:
  - `src/executor/index.ts`: Updated to listen for `AllocateToOB`.
  - Parses event arguments.
  - Fetches Mid Price (mocked for demo, structure ready for `Hyperliquid` API).
  - Places Orders: Implemented logic to place **ASK** (Sell) if allocating Token1 (Base) and **BID** (Buy) if allocating Token0 (Quote).
  - Logs "Audit Record" to console.

## 4. Salt-Pear Integration (Critical)
**Status: Complete**
- **Authentication**: `TradePage` uses Pear Protocol (EIP-712) for user auth.
- **Middleware**: Created `src/lib/guardian-service.ts` to bridge Pear requests with Salt policies.
- **Enforcement**:
  - `GuardianService` adapts generic `TradeRequest` to Salt `ActionIntent`.
  - Runs `checkGuardrails` against `GUARDIA_PRESETS` (mocked for MVP).
  - `/api/ai-trade/accept` invokes middleware **before** executing on Pear.
- **Result**: Trades exceeding limits (e.g., $250 max) are blocked with `403 Policy Violation` before they reach the execution layer.

## 5. Build & Compatibility
**Status: Complete**
- Confirmed Node.js v22.x/v24.x compatibility.
- `forge build` and `forge test` passing.
