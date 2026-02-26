import { privateKeyToAccount } from 'viem/accounts'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://x402.llmer.com'

export async function GET() {
  const origin = new URL(SITE_URL).origin

  // Compute ownership proof: sign the origin URL with the facilitator/payTo private key.
  // This proves control of the payment address to discovery platforms like x402scan.
  let ownershipProofs: { address: string; signature: string; chain: string }[] | undefined
  const privateKey = process.env.FACILITATOR_PRIVATE_KEY
  if (privateKey) {
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`)
      const signature = await account.signMessage({ message: origin })
      ownershipProofs = [{ address: account.address, signature, chain: 'eip155:84532' }]
    } catch {
      // Non-fatal — discovery document is still valid without proofs
    }
  }

  const doc = {
    version: 1,
    resources: [`${origin}/api/cowsays`],
    ...(ownershipProofs && { ownershipProofs }),
    instructions:
      '## x402 demo · Base Sepolia\n\nPay 0.001 USDC per request to `/api/cowsays`.\n\nRequirements: MetaMask on Base Sepolia + test USDC from https://faucet.circle.com',
  }

  return Response.json(doc, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
