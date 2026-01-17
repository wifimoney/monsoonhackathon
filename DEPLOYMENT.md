# Monsoon Protocol - Deployment Notes

## Deployed Contracts (Arbitrum Sepolia - Chain ID 421614)

| Contract | Address |
|----------|---------|
| HyperCoreQuoter | `0x37f4e2a0a4a59f2a0405c4e539a39d90cf355d84` |
| SovereignPool | `0x82b785a3ab55772c88381c4387083399422cdfcd` |
| MonsoonALM | `0x63825fb627b0e85b2f70a3b42fe530c7e6d72498` |
| MockFactory | `0x2746977b2921af42984f7d7f64597890d6e7f351` |
| Token0 (mUSDC) | `0xaa6a7b7faa7f28566fe5c3cfc628a1ee0583a0ba` |
| Token1 (mWETH) | `0xe4e118a0b252a631b19789d84f504b10167466e2` |

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
