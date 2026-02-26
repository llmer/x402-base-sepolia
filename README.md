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

# Optional: deployed URL for OG metadata, sitemap, discovery doc
NEXT_PUBLIC_SITE_URL=https://x402.llmer.com

# Optional: Upstash Redis for rate limiting (middleware passes through if unset)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
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
| `/api/cowsays` | GET | Paid endpoint — returns `402` without a valid payment signature, `200` with cowsay ASCII art when paid |
| `/api/events` | GET | SSE stream of live payment events (`probe` / `paid` / `failed`) |
| `/api/facilitator/supported` | GET | Returns supported schemes and networks |
| `/api/facilitator/balance` | GET | Returns facilitator wallet address and ETH balance |
| `/.well-known/x402` | GET | x402 discovery document (lists paid resources + ownership proof) |

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| x402 | `@x402/core` + `@x402/evm` |
| Ethereum | viem |
| Network | Base Sepolia (`eip155:84532`) |
| Payment asset | USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`) |
| Rate limiting | `@upstash/ratelimit` + `@upstash/redis` |
| Validation | zod + zod-to-json-schema |

---

## Project structure

```
app/
  .well-known/x402/route.ts        x402 discovery document + ownership proof
  api/cowsays/route.ts              x402 paid endpoint (verify + settle inline)
  api/events/route.ts               SSE live payment feed
  api/facilitator/balance/route.ts  facilitator ETH balance check
  api/facilitator/supported/route.ts  supported schemes and networks
  components/x402-demo.tsx          client-side payment flow UI
lib/
  constants.ts                      USDC contract address
  events.ts                         in-memory event bus for live feed
  facilitator.ts                    x402Facilitator singleton (verify + settle)
  rate-limit.ts                     Upstash Redis rate limiting config
proxy.ts                            rate-limit middleware for API routes
```

---

## License

MIT
