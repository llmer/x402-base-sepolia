'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { RequestEvent } from '@/lib/events'
import { createWalletClient, createPublicClient, custom, http, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import { x402Client } from '@x402/core/client'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { decodePaymentRequiredHeader, encodePaymentSignatureHeader } from '@x402/core/http'
import type { ClientEvmSigner } from '@x402/evm'
import { USDC_BASE_SEPOLIA } from '@/lib/constants'

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34' // 84532
const QUOTE_ENDPOINT = '/api/cowsays'
const BASESCAN_TX = (tx: string) => `https://sepolia.basescan.org/tx/${tx}`

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'account', type: 'address' as const }],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
] as const

// ─── Types ───────────────────────────────────────────────────────────────────

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  isMetaMask?: boolean
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

interface WalletState {
  address: `0x${string}`
  balance: string
}

type FlowStep =
  | { id: 'idle' }
  | { id: 'requesting' }
  | { id: 'got-402'; payTo: string }
  | { id: 'signing' }
  | { id: 'retrying' }
  | { id: 'done'; cowsay: string; tx: string }
  | { id: 'error'; message: string; failedPhase: 1 | 2 | 3 }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatUsdc(raw: bigint) {
  return formatUnits(raw, 6)
}

async function readUsdcBalance(address: `0x${string}`): Promise<string> {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  })
  const raw = (await publicClient.readContract({
    address: USDC_BASE_SEPOLIA,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [address],
  })) as bigint
  return formatUsdc(raw)
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepRow({
  n,
  label,
  detail,
  state,
}: {
  n: number
  label: string
  detail?: string
  state: 'pending' | 'active' | 'done' | 'error'
}) {
  const dotClasses = {
    pending: 'border border-zinc-700 text-zinc-600',
    active: 'bg-blue-500 text-white animate-pulse',
    done: 'bg-emerald-500 text-white',
    error: 'bg-red-500 text-white',
  }[state]

  const textClass = state === 'pending' ? 'text-zinc-600' : state === 'error' ? 'text-red-400' : 'text-zinc-200'

  return (
    <div className="flex items-start gap-3">
      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${dotClasses}`}>
        {state === 'done' ? '✓' : state === 'error' ? '✗' : n}
      </div>
      <div>
        <div className={`text-sm font-medium ${textClass}`}>{label}</div>
        {detail && (
          <div className="text-xs text-zinc-500 mt-0.5 font-mono">{detail}</div>
        )}
      </div>
    </div>
  )
}

// ─── Live feed hook ──────────────────────────────────────────────────────────

function useLiveRequests() {
  const [events, setEvents] = useState<RequestEvent[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource('/api/events')

    es.onopen = () => setConnected(true)

    es.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as RequestEvent
        setEvents((prev) => [event, ...prev].slice(0, 50))
      } catch {
        // ignore malformed messages
      }
    }

    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      setConnected(false)
    }
  }, [])

  return { events, connected }
}

// ─── Live feed component ──────────────────────────────────────────────────────

function RelativeTime({ ts }: { ts: number }) {
  const [label, setLabel] = useState(() => formatRelative(ts))
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    ref.current = setInterval(() => setLabel(formatRelative(ts)), 5000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [ts])

  return <span>{label}</span>
}

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function LiveFeed() {
  const { events, connected } = useLiveRequests()

  return (
    <div className="border border-zinc-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Live requests</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Resets on page refresh</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="text-xs text-zinc-500">{connected ? 'live' : 'connecting…'}</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-xs text-zinc-600 py-4 text-center">
          Waiting for requests to <code className="text-zinc-500">/api/cowsays</code>…
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 text-xs py-1.5 border-b border-zinc-900 last:border-0"
            >
              {/* Status badge */}
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded font-mono font-semibold ${
                  event.type === 'paid'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : event.type === 'failed'
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'bg-zinc-700/40 text-zinc-400 border border-zinc-700'
                }`}
              >
                {event.type === 'paid' ? '200' : event.type === 'failed' ? 'ERR' : '402'}
              </span>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-300 font-medium">
                    {event.type === 'paid' ? 'paid' : event.type === 'failed' ? 'failed' : 'probe'}
                  </span>
                  {event.from && (
                    <code className="text-zinc-500">{shortAddr(event.from)}</code>
                  )}
                  {event.tx && (
                    <a
                      href={BASESCAN_TX(event.tx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline font-mono"
                    >
                      {event.tx.slice(0, 8)}…{event.tx.slice(-4)} ↗
                    </a>
                  )}
                  {event.error && (
                    <span className="text-orange-400 truncate">{event.error}</span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span className="shrink-0 text-zinc-600 tabular-nums">
                <RelativeTime ts={event.ts} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Facilitator balance banner ──────────────────────────────────────────────

const LOW_ETH_THRESHOLD = 0.005

function FacilitatorBanner() {
  const [balance, setBalance] = useState<number | null>(null)
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch('/api/facilitator/balance')
        if (!res.ok) return
        const data = (await res.json()) as { address: string; balance: string }
        if (cancelled) return
        setBalance(parseFloat(data.balance))
        setAddress(data.address)
      } catch {
        // silent — banner just won't show
      }
    }

    check()
    const id = setInterval(check, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (balance === null || balance >= LOW_ETH_THRESHOLD) return null

  return (
    <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-2.5 text-center">
      <span className="text-red-400 text-xs font-medium">
        Facilitator is low on gas — {balance.toFixed(6)} ETH remaining
      </span>
      {address && (
        <span className="text-zinc-500 text-xs ml-3">
          Send Sepolia ETH to{' '}
          <a
            href={`https://sepolia.basescan.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-300 font-mono"
          >
            {shortAddr(address)}
          </a>
          {' '}·{' '}
          <a
            href="https://faucet.quicknode.com/base/sepolia"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-300"
          >
            faucet
          </a>
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function X402Demo() {
  const [wallet, setWallet] = useState<WalletState | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [step, setStep] = useState<FlowStep>({ id: 'idle' })

  // ── Wallet connection ────────────────────────────────────────────────────

  const connectWallet = useCallback(async () => {
    setConnectError(null)
    setConnecting(true)
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not detected. Install MetaMask to try the browser demo.')
      }

      // Switch to (or add) Base Sepolia
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }],
        })
      } catch (switchErr: unknown) {
        if ((switchErr as { code?: number })?.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BASE_SEPOLIA_CHAIN_ID_HEX,
                chainName: 'Base Sepolia Testnet',
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              },
            ],
          })
        } else {
          throw switchErr
        }
      }

      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum),
      })
      const [address] = await walletClient.requestAddresses()
      const balance = await readUsdcBalance(address)
      setWallet({ address, balance })
      setStep({ id: 'idle' })
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setConnecting(false)
    }
  }, [])

  // ── x402 payment flow ────────────────────────────────────────────────────

  const runFlow = useCallback(async () => {
    if (!wallet) return
    setStep({ id: 'requesting' })

    // Track the active phase so errors point to the right step
    let failedPhase: 1 | 2 | 3 = 1

    try {
      // Phase 1: Initial request — expect 402
      const res1 = await fetch(QUOTE_ENDPOINT)

      if (res1.status !== 402) {
        // Show the actual server error, not a generic "Expected 402" message
        let detail = `HTTP ${res1.status}`
        try {
          const body = await res1.json() as { error?: string }
          if (body.error) detail = body.error
        } catch { /* non-JSON body */ }
        throw new Error(detail)
      }

      const paymentRequiredHeader =
        res1.headers.get('payment-required') ?? res1.headers.get('PAYMENT-REQUIRED')
      if (!paymentRequiredHeader) {
        throw new Error('Missing PAYMENT-REQUIRED header in 402 response')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentRequired = decodePaymentRequiredHeader(paymentRequiredHeader) as any
      const requirements = paymentRequired.accepts?.[0]
      const payTo = requirements?.payTo ?? 'unknown'

      setStep({ id: 'got-402', payTo })

      // Phase 2: Build x402 client with MetaMask signer and sign
      failedPhase = 2

      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum!),
      })
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http('https://sepolia.base.org'),
      })

      const signer: ClientEvmSigner = {
        address: wallet.address,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signTypedData: (msg: any) =>
          walletClient.signTypedData({
            account: wallet.address,
            domain: msg.domain,
            types: msg.types,
            primaryType: msg.primaryType,
            message: msg.message,
          }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        readContract: (args: any) =>
          publicClient.readContract({
            address: args.address,
            abi: args.abi,
            functionName: args.functionName,
            args: args.args,
          }),
      }

      const client = new x402Client()
      registerExactEvmScheme(client, {
        signer,
        networks: ['eip155:84532'],
      })

      setStep({ id: 'signing' })

      // Creates EIP-3009 TransferWithAuthorization and signs via MetaMask
      const paymentPayload = await client.createPaymentPayload(paymentRequired)
      const paymentHeader = encodePaymentSignatureHeader(paymentPayload)

      // Phase 3: Retry with signed payment
      failedPhase = 3
      setStep({ id: 'retrying' })

      const res2 = await fetch(QUOTE_ENDPOINT, {
        headers: { 'PAYMENT-SIGNATURE': paymentHeader },
      })

      if (!res2.ok) {
        const body = await res2.json().catch(() => ({ error: `HTTP ${res2.status}` })) as { error?: string }
        throw new Error(body.error ?? `Payment failed (${res2.status})`)
      }

      const data = await res2.json() as { cowsay: string; tx: string }

      // Refresh balance
      const newBalance = await readUsdcBalance(wallet.address)
      setWallet((w) => (w ? { ...w, balance: newBalance } : w))

      setStep({ id: 'done', cowsay: data.cowsay, tx: data.tx })
    } catch (err: unknown) {
      setStep({
        id: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
        failedPhase,
      })
    }
  }, [wallet])

  // ── Derived state ────────────────────────────────────────────────────────

  const failedPhase = step.id === 'error' ? step.failedPhase : null

  const phase1State = (): 'pending' | 'active' | 'done' | 'error' => {
    if (step.id === 'requesting') return 'active'
    if (step.id === 'error') return failedPhase === 1 ? 'error' : failedPhase! > 1 ? 'done' : 'pending'
    if (['got-402', 'signing', 'retrying', 'done'].includes(step.id)) return 'done'
    return 'pending'
  }
  const phase2State = (): 'pending' | 'active' | 'done' | 'error' => {
    if (step.id === 'got-402' || step.id === 'signing') return 'active'
    if (step.id === 'error') return failedPhase === 2 ? 'error' : failedPhase! > 2 ? 'done' : 'pending'
    if (step.id === 'retrying' || step.id === 'done') return 'done'
    return 'pending'
  }
  const phase3State = (): 'pending' | 'active' | 'done' | 'error' => {
    if (step.id === 'retrying') return 'active'
    if (step.id === 'error') return failedPhase === 3 ? 'error' : 'pending'
    if (step.id === 'done') return 'done'
    return 'pending'
  }

  const payTo = (step.id === 'got-402' || step.id === 'signing' || step.id === 'retrying' || step.id === 'done')
    ? (step as { payTo?: string }).payTo
    : undefined

  const isRunning = ['requesting', 'got-402', 'signing', 'retrying'].includes(step.id)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">

      {/* Testnet banner */}
      <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-center">
        <span className="text-amber-400 text-xs font-medium">⚠ Base Sepolia Testnet Only</span>
        <span className="text-zinc-500 text-xs ml-3">
          Test USDC · not real money ·{' '}
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-300"
          >
            get test USDC
          </a>
          {' '}·{' '}
          <a
            href="https://faucet.quicknode.com/base/sepolia"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-300"
          >
            get test ETH
          </a>
        </span>
      </div>

      {/* Low-gas warning — only visible when facilitator ETH is below threshold */}
      <FacilitatorBanner />

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-12">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">x402 demo</h1>
          <p className="text-zinc-500 text-sm mt-1">
            HTTP 402 Payment Required — pay-per-request API on Base Sepolia
          </p>
        </div>

        {/* Endpoint card */}
        <div className="border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              GET
            </span>
            <code className="text-sm text-white">/api/cowsays</code>
          </div>

          <div className="h-px bg-zinc-800" />

          <div className="grid grid-cols-[7rem,1fr] gap-y-3 text-sm">
            <span className="text-zinc-500">Price</span>
            <span className="text-emerald-400 font-medium">0.001 USDC</span>

            <span className="text-zinc-500">Network</span>
            <span>
              Base Sepolia{' '}
              <span className="text-zinc-600 text-xs">· eip155:84532</span>
            </span>

            <span className="text-zinc-500">Asset</span>
            <code className="text-xs text-zinc-400 break-all">{USDC_BASE_SEPOLIA}</code>

            <span className="text-zinc-500">Scheme</span>
            <span className="text-zinc-400">exact · EIP-3009 TransferWithAuthorization</span>

            <span className="text-zinc-500">Returns</span>
            <span className="text-zinc-400">cowsay ASCII art</span>
          </div>

          <div className="h-px bg-zinc-800" />

          {/* curl example */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Try without payment:</p>
            <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 overflow-x-auto text-zinc-400">
              <span className="text-zinc-600">$</span>{' '}
              <span className="text-white">curl -i</span>{' '}
              <span className="text-emerald-400">https://x402.llmer.com/api/cowsays</span>
              {'\n'}
              <span className="text-zinc-600">{'# → HTTP 402  PAYMENT-REQUIRED: <base64>'}</span>
            </pre>
          </div>
        </div>

        {/* Wallet section */}
        <div className="border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Try it in browser</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Connect MetaMask on Base Sepolia to pay and get a cowsay
              </p>
            </div>

            {!wallet ? (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="shrink-0 text-xs font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connecting ? 'Connecting…' : 'Connect MetaMask'}
              </button>
            ) : (
              <div className="text-right">
                <div className="text-xs text-emerald-400 font-medium">Connected</div>
                <code className="text-xs text-zinc-400">{shortAddr(wallet.address)}</code>
              </div>
            )}
          </div>

          {connectError && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {connectError}
            </div>
          )}

          {wallet && (
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500">USDC Balance · Base Sepolia</div>
                  <div className="text-sm text-white mt-0.5">{wallet.balance} USDC</div>
                </div>
                <div className="text-xs text-zinc-600">
                  {parseFloat(wallet.balance) === 0 && (
                    <a
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline"
                    >
                      Get test USDC ↗
                    </a>
                  )}
                </div>
              </div>

              <button
                onClick={runFlow}
                disabled={isRunning}
                className="w-full text-sm font-medium bg-white text-black px-4 py-2.5 rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? 'Processing payment…' : 'Pay 0.001 USDC & get cowsay →'}
              </button>
            </>
          )}
        </div>

        {/* Flow visualization — only shown when active or done */}
        {step.id !== 'idle' && (
          <div className="border border-zinc-800 rounded-xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-white">Request flow</h2>

            <div className="space-y-4">
              <StepRow
                n={1}
                label="Initial request"
                detail={`GET ${QUOTE_ENDPOINT}  →  HTTP 402 Payment Required`}
                state={phase1State()}
              />

              <StepRow
                n={2}
                label="Sign EIP-3009 payment"
                detail={
                  payTo
                    ? `0.001 USDC  →  ${shortAddr(payTo)}`
                    : 'TransferWithAuthorization via MetaMask'
                }
                state={phase2State()}
              />

              <StepRow
                n={3}
                label="Retry with payment signature"
                detail={`GET ${QUOTE_ENDPOINT}  →  HTTP 200 OK`}
                state={phase3State()}
              />
            </div>

            {step.id === 'error' && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {step.message}
              </div>
            )}

            {step.id === 'done' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
                <pre className="text-xs text-emerald-400 leading-relaxed overflow-x-auto">{step.cowsay}</pre>
                <div className="h-px bg-zinc-800" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Settled on Base Sepolia</span>
                  <a
                    href={BASESCAN_TX(step.tx)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline font-mono"
                  >
                    {step.tx.slice(0, 10)}…{step.tx.slice(-6)} ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live feed */}
        <LiveFeed />

        {/* Footer */}
        <div className="text-xs text-zinc-600 text-center pb-4">
          Base Sepolia · Chain ID 84532 · USDC{' '}
          <a
            href={`https://sepolia.basescan.org/address/${USDC_BASE_SEPOLIA}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 underline"
          >
            {shortAddr(USDC_BASE_SEPOLIA)}
          </a>
        </div>
      </main>
    </div>
  )
}
