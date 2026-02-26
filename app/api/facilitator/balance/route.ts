import { createPublicClient, http, formatEther } from 'viem'
import { baseSepolia } from 'viem/chains'
import { getFacilitator } from '@/lib/facilitator'

export async function GET() {
  try {
    const { address } = getFacilitator()
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.RPC_URL ?? 'https://sepolia.base.org'),
    })
    const wei = await client.getBalance({ address })
    return Response.json({ address, balance: formatEther(wei) })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
