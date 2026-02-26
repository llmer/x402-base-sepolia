# x402 demo · Base Sepolia

An interactive demo of the HTTP 402 Payment Required protocol — pay-per-request APIs with USDC, no subscriptions, no API keys.

**Live demo:** https://x402.llmer.com

---

## What is x402?

HTTP 402 was reserved in 1991 for "Payment Required" but never standardized. The x402 protocol revives it: a server returns `402` with a `PAYMENT-REQUIRED` header describing what's owed, the client signs an EIP-3009 authorization (no gas required, no broadcast), and retries with a `PAYMENT-SIGNATURE` header. The server settles the transfer on-chain and returns the real response. The whole round-trip adds one extra HTTP hop.

## How it works

```
1. GET /api/cowsays
        ← 402 + PAYMENT-REQUIRED header (amount, asset, recipient, network)

2. Client signs EIP-3009 transferWithAuthorization
        (MetaMask popup, no gas required)

3. GET /api/cowsays  +  PAYMENT-SIGNATURE: <signed payload>
        ← 200 + cowsay ASCII art  +  tx hash in response headers
```

## Live demo

Try it at **https://x402.llmer.com** — connect MetaMask on Base Sepolia, get test USDC from the [Circle faucet](https://faucet.circle.com), and pay 0.001 USDC to call the API.

---

## Getting started

### Clone and install

```bash
git clone https://github.com/llmer/x402-base-sepolia.git
cd x402-base-sepolia
pnpm install
```

### Configure environment

Create `.env.local`:

```bash
# Required: wallet that signs on-chain settlements (needs Base Sepolia ETH for gas)
FACILITATOR_PRIVATE_KEY=0x...

# Optional: address to receive USDC payments (defaults to facilitator address)
PAYTO_ADDRESS=0x...

# Optional: Base Sepolia RPC (defaults to https://sepolia.base.org)
RPC_URL=https://...
```

**Faucets:**
- USDC (Base Sepolia): https://faucet.circle.com
- ETH (Base Sepolia): https://faucet.quicknode.com/base/sepolia

### Run

```bash
pnpm dev   # http://localhost:3000
```

---

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/cowsays` | GET | Paid endpoint — returns `402` without a valid payment signature, `200` cowsay ASCII art with one |
| `/api/events` | GET | SSE stream of live payment events (`probe` / `paid` / `failed`) |
| `/api/facilitator/verify` | POST | Verify a payment payload |
| `/api/facilitator/settle` | POST | Settle a payment payload on-chain |
| `/api/facilitator/supported` | GET | Returns supported schemes and networks |

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| x402 | `@x402/core` + `@x402/evm` |
| Ethereum | viem |
| Network | Base Sepolia (`eip155:84532`) |
| Payment asset | USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`) |

---

## Project structure

```
app/
  api/cowsays/route.ts            x402 paid endpoint
  api/events/route.ts             SSE live payment feed
  api/facilitator/*/route.ts      verify, settle, supported
  components/x402-demo.tsx        client-side payment flow UI
lib/
  facilitator.ts                  x402Facilitator singleton (verify + settle)
  events.ts                       in-memory event bus for live feed
```

---

## License

MIT
