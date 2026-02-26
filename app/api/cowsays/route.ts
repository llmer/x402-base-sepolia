import { getFacilitator } from '@/lib/facilitator'
import { emit } from '@/lib/events'
import { USDC_BASE_SEPOLIA } from '@/lib/constants'
import {
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  decodePaymentSignatureHeader,
} from '@x402/core/http'
import type { PaymentRequirements } from '@x402/core/types'

const PRICE = '1000' // 0.001 USDC (6 decimals)

const QUOTES = [
  'The best way to predict the future is to invent it. — Alan Kay',
  "Code is like humor. When you have to explain it, it's bad. — Cory House",
  'Programs must be written for people to read. — Harold Abelson',
  'Simplicity is the ultimate sophistication. — Leonardo da Vinci',
  'Make it work, make it right, make it fast. — Kent Beck',
  "The most dangerous phrase is: we've always done it this way. — Grace Hopper",
  'Walking on water and developing software from a specification are easy if both are frozen. — Edward Berard',
  'Any fool can write code that a computer can understand. Good programmers write code that humans can understand. — Martin Fowler',
]

function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (current.length === 0) {
      current = word
    } else if (current.length + 1 + word.length <= maxWidth) {
      current += ' ' + word
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

function cowsay(text: string): string {
  const MAX_WIDTH = 40
  const lines = wordWrap(text, MAX_WIDTH)
  const boxWidth = Math.max(...lines.map((l) => l.length))
  const border = '-'.repeat(boxWidth + 2)

  let bubble: string
  if (lines.length === 1) {
    bubble = ` ${'_'.repeat(boxWidth + 2)}\n< ${lines[0].padEnd(boxWidth)} >\n ${'‾'.repeat(boxWidth + 2)}`
  } else {
    const top = ` ${'_'.repeat(boxWidth + 2)}`
    const bottom = ` ${border}`
    const middle = lines.map((line, i) => {
      const padded = line.padEnd(boxWidth)
      if (i === 0) return `/ ${padded} \\`
      if (i === lines.length - 1) return `\\ ${padded} /`
      return `| ${padded} |`
    })
    bubble = [top, ...middle, bottom].join('\n')
  }

  const cow = [
    '        \\   ^__^',
    '         \\  (oo)\\_______',
    '            (__)\\       )\\/\\',
    '                ||----w |',
    '                ||     ||',
  ].join('\n')

  return `${bubble}\n${cow}`
}

export async function GET(req: Request) {
  // Default to the facilitator's own address so the demo works without extra config
  let payTo = process.env.PAYTO_ADDRESS
  if (!payTo) {
    try {
      payTo = getFacilitator().address
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Facilitator not configured'
      return Response.json({ error }, { status: 500 })
    }
  }

  const requirements: PaymentRequirements = {
    scheme: 'exact',
    network: 'eip155:84532',
    asset: USDC_BASE_SEPOLIA,
    amount: PRICE,
    payTo,
    maxTimeoutSeconds: 300,
    // EIP-712 domain for USDC on Base Sepolia — required by the exact EVM scheme
    // to construct the TransferWithAuthorization typed data
    extra: {
      name: 'USDC',
      version: '2',
    },
  }

  const paymentHeader = req.headers.get('PAYMENT-SIGNATURE') ?? req.headers.get('payment-signature')
  const eventId = crypto.randomUUID()

  // No payment — return 402 with requirements
  if (!paymentHeader) {
    emit({ id: eventId, ts: Date.now(), type: 'probe' })
    const paymentRequired = {
      x402Version: 2 as const,
      resource: {
        url: new URL(req.url).pathname,
        description: 'cowsay ASCII art',
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
    emit({ id: eventId, ts: Date.now(), type: 'failed', error: 'Invalid PAYMENT-SIGNATURE header' })
    return Response.json({ error: 'Invalid PAYMENT-SIGNATURE header' }, { status: 400 })
  }

  let facilitator
  try {
    facilitator = getFacilitator()
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Facilitator not configured'
    emit({ id: eventId, ts: Date.now(), type: 'failed', error })
    return Response.json({ error }, { status: 500 })
  }

  let verifyResult
  try {
    verifyResult = await facilitator.verify(payload, requirements)
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Verification error'
    emit({ id: eventId, ts: Date.now(), type: 'failed', error })
    return Response.json({ error }, { status: 500 })
  }

  if (!verifyResult.isValid) {
    const error = verifyResult.invalidReason ?? 'Payment verification failed'
    emit({ id: eventId, ts: Date.now(), type: 'failed', error })
    return Response.json({ error }, { status: 402 })
  }

  let settleResult
  try {
    settleResult = await facilitator.settle(payload, requirements)
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Settlement error'
    emit({ id: eventId, ts: Date.now(), type: 'failed', error })
    return Response.json({ error }, { status: 500 })
  }

  if (!settleResult.success) {
    const error = settleResult.errorReason ?? 'Payment settlement failed'
    emit({ id: eventId, ts: Date.now(), type: 'failed', error })
    return Response.json({ error }, { status: 402 })
  }

  // Extract payer address from EIP-3009 authorization (best-effort — structure varies by x402 version)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (payload as any)?.payload?.authorization?.from as string | undefined

  emit({
    id: eventId,
    ts: Date.now(),
    type: 'paid',
    from,
    tx: settleResult.transaction,
  })

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  const art = cowsay(quote)

  return new Response(
    JSON.stringify({ cowsay: art, tx: settleResult.transaction, network: settleResult.network }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'PAYMENT-RESPONSE': encodePaymentResponseHeader(settleResult),
      },
    },
  )
}
