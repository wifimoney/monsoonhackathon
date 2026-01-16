# Salt DeFi Dashboard

A Next.js DeFi dashboard with wallet connection and Salt transaction guardrails.

## Features

- 🌑 **Dark Theme** - Modern dark UI with gradient accents
- 🔗 **Wallet Connect** - Connect with MetaMask, WalletConnect, and more via wagmi/viem
- 📑 **Tab Navigation** - Onboard / Trade / Guardrails pages
- 🛡️ **Transaction Guardrails** - Simulated Salt CLI output showing allowed/denied transactions
- ⚡ **Salt Integration Ready** - Configured to work with salt-autofi backend

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env.local

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for all required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID |
| `PRIVATE_KEY` | Signer private key for Salt (backend only) |
| `ORCHESTRATION_NETWORK_RPC_NODE_URL` | Salt orchestration RPC (Arbitrum Sepolia) |
| `BROADCASTING_NETWORK_RPC_NODE_URL` | Transaction broadcast network RPC |
| `BROADCASTING_NETWORK_ID` | Chain ID for broadcasting network |

## Pages

### /onboard
Welcome page with setup steps and supported networks.

### /trade
Execute DeFi strategies (Chorus One, Somnia, AAVE, HyperSwap) with live terminal output.

### /guardrails
Configure transaction policies and run Salt CLI sanity checks. Simulate allowed/denied transactions.

## Salt CLI Integration

This dashboard is designed to work with the [salt-autofi](../salt-autofi) repository. To run the Salt backend:

```bash
cd ../salt-autofi
npm install
npm start
```

## Tech Stack

- **Next.js 15** - React framework with App Router
- **wagmi v2** - React hooks for Ethereum
- **viem** - TypeScript Ethereum library
- **Tailwind CSS** - Utility-first styling
- **Salt SDK** - MPC transaction management
