import { x402Facilitator } from '@x402/core/facilitator'
import { registerExactEvmScheme } from '@x402/evm/exact/facilitator'
import { toFacilitatorEvmSigner, type FacilitatorEvmSigner } from '@x402/evm'
import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

// Singleton — Node.js module caching re-uses this across requests in the same process
let _facilitator: x402Facilitator | null = null
let _address: `0x${string}` | null = null

function init() {
  if (_facilitator) return

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

  // Wrap writeContract to surface the actual revert reason — the x402 library
  // catches all errors and collapses them to "transaction_failed", losing detail.
  const loggingSigner = new Proxy(signer, {
    get(target, prop) {
      if (prop !== 'writeContract') return Reflect.get(target, prop)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return async (...args: any[]) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await (target as any).writeContract(...args)
        } catch (err) {
          console.error('[facilitator] writeContract failed:', err)
          throw err
        }
      }
    },
  })

  _facilitator = new x402Facilitator()
  registerExactEvmScheme(_facilitator, { signer: loggingSigner, networks: 'eip155:84532' })
  _address = account.address
}

export function getFacilitator(): x402Facilitator & { address: `0x${string}` } {
  init()
  return Object.assign(_facilitator!, { address: _address! })
}
