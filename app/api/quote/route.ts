import { getFacilitator } from '@/lib/facilitator'
import {
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  decodePaymentSignatureHeader,
} from '@x402/core/http'
import type { PaymentRequirements } from '@x402/core/types'

const PRICE = '1000' // 0.001 USDC (6 decimals)
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

const QUOTES = [
  'The best way to predict the future is to invent it. — Alan Kay',
  'Code is like humor. When you have to explain it, it\'s bad. — Cory House',
  'Programs must be written for people to read. — Harold Abelson',
  'Simplicity is the ultimate sophistication. — Leonardo da Vinci',
  'Make it work, make it right, make it fast. — Kent Beck',
  'The most dangerous phrase is: we\'ve always done it this way. — Grace Hopper',
  'Walking on water and developing software from a specification are easy if both are frozen. — Edward Berard',
  'Any fool can write code that a computer can understand. Good programmers write code that humans can understand. — Martin Fowler',
]

export async function GET(req: Request) {
  const payTo = process.env.PAYTO_ADDRESS
  if (!payTo) {
    return Response.json({ error: 'PAYTO_ADDRESS not configured' }, { status: 500 })
  }

  const requirements: PaymentRequirements = {
    scheme: 'exact',
    network: 'eip155:84532',
    asset: USDC_BASE_SEPOLIA,
    amount: PRICE,
    payTo,
    maxTimeoutSeconds: 300,
    extra: {},
  }

  const paymentHeader = req.headers.get('PAYMENT-SIGNATURE') ?? req.headers.get('payment-signature')

  // No payment — return 402 with requirements
  if (!paymentHeader) {
    const paymentRequired = {
      x402Version: 2 as const,
      resource: {
        url: new URL(req.url).pathname,
        description: 'Random inspirational quote',
        mimeType: 'application/json',
      },
      accepts: [requirements],
    }
    return new Response(null, {
      status: 402,
      headers: { 'PAYMENT-REQUIRED': encodePaymentRequiredHeader(paymentRequired) },
    })
  }

  // Decode and verify payment
  let payload
  try {
    payload = decodePaymentSignatureHeader(paymentHeader)
  } catch {
    return Response.json({ error: 'Invalid PAYMENT-SIGNATURE header' }, { status: 400 })
  }

  const facilitator = getFacilitator()

  const verifyResult = await facilitator.verify(payload, requirements)
  if (!verifyResult.isValid) {
    return Response.json(
      { error: verifyResult.invalidReason ?? 'Payment verification failed' },
      { status: 402 },
    )
  }

  const settleResult = await facilitator.settle(payload, requirements)
  if (!settleResult.success) {
    return Response.json(
      { error: settleResult.errorReason ?? 'Payment settlement failed' },
      { status: 402 },
    )
  }

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]

  return new Response(
    JSON.stringify({ quote, tx: settleResult.transaction, network: settleResult.network }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'PAYMENT-RESPONSE': encodePaymentResponseHeader(settleResult),
      },
    },
  )
}
