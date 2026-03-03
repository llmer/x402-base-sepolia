const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://x402.llmer.com'

const BODY = `# x402 Cowsays API

> Pay-per-request ASCII cow art on Base Sepolia.

## Endpoint

POST {ORIGIN}/api/cowsays

## Pricing

- Cost: 0.001 USDC per request (fixed)
- Currency: USDC on Base Sepolia (0x036CbD53842c5426634e7929541eC2318f3dCF7e)
- Network: Base Sepolia (eip155:84532)

## Payment Flow (x402)

1. Send a POST to /api/cowsays with no payment header.
2. Receive a 402 response with payment requirements in the JSON body and the PAYMENT-REQUIRED header.
3. Construct a USDC TransferWithAuthorization (EIP-3009) for the amount and payTo address from the requirements.
4. Resend the POST with a PAYMENT-SIGNATURE header containing the signed authorization.
5. The server verifies and settles the payment on-chain, then returns the cowsay art.

## Response

JSON object with three fields:
- cowsay (string): ASCII art cowsay with a random quote
- tx (string): on-chain settlement transaction hash
- network (string): CAIP-2 network identifier (eip155:84532)

## Notes

- No request body or parameters needed — each call returns a random quote.
- Both GET and POST methods are supported; POST is preferred.
- This is a testnet demo. Use Base Sepolia test USDC from https://faucet.circle.com.
`

export async function GET() {
  const origin = new URL(SITE_URL).origin
  const body = BODY.replace('{ORIGIN}', origin)

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
