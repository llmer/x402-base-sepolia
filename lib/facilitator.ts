import { x402Facilitator } from '@x402/core/facilitator'
import { registerExactEvmScheme } from '@x402/evm/exact/facilitator'
import { toFacilitatorEvmSigner, type FacilitatorEvmSigner } from '@x402/evm'
import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

// Singleton — Node.js module caching re-uses this across requests in the same process
let _facilitator: x402Facilitator | null = null

export function getFacilitator(): x402Facilitator {
  if (_facilitator) return _facilitator

  const privateKey = process.env.FACILITATOR_PRIVATE_KEY
  if (!privateKey) throw new Error('FACILITATOR_PRIVATE_KEY environment variable is required')

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const client = createWalletClient({ account, chain: baseSepolia, transport: http(process.env.RPC_URL) }).extend(
    publicActions,
  )

  // viem's generic WalletClient types are more specific than FacilitatorEvmSigner's
  // simple interface — cast to satisfy toFacilitatorEvmSigner
  const signer = toFacilitatorEvmSigner(
    client as unknown as Omit<FacilitatorEvmSigner, 'getAddresses'> & { address: `0x${string}` },
  )

  _facilitator = new x402Facilitator()
  registerExactEvmScheme(_facilitator, { signer, networks: 'eip155:84532' })

  return _facilitator
}
