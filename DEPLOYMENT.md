# Monsoon Protocol - Deployment Notes

## Deployed Contracts (HyperEVM Testnet - Chain ID 998)
RPC: `https://rpc.hyperliquid-testnet.xyz/evm`

| Contract | Address |
|----------|---------|
| HyperCoreQuoter | `0x382269E2a46c4f73e83a241C13C3f3346B91f50d` |
| SovereignPool | `0xE30b0A0031De98534D0aD96c6A50007a1CC1dC98` |
| MonsoonALM | `0x77259d96Ae1AA52C771AeC5452929C7877Ab8B43` |
| MockFactory | `0xc24F38189F0e2cf70F4faD13A3037Ad9f595b038` |
| Token0 (mUSDC) | `0x2f2Af7b5fA68329b4086b04bCf9dac9E8c9f3494` |
| Token1 (mWETH) | `0x4aDEED7d8ACB3E86b54A78E51E61936165169fA6` |

## Running the Executor

```bash
export EXECUTOR_PRIVATE_KEY="your_private_key_here"
npx tsx src/executor/index.ts
```

Expected output:
```
🎯 OB Executor starting...
   ALM: 0x63825fb627b0e85b2f70a3b42fe530c7e6d72498
✅ Executor running, listening for events...
```

## Running the Frontend

```bash
npm run dev
```

Access at: http://localhost:3000

## Deployer/Strategist Account

Address: `0xB3679670E8B9Ef982B02a6FA4bD876924B9ED584`

---

*Deployed: 2026-01-17*
