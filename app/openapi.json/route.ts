const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://x402.llmer.com'

export async function GET() {
  const origin = new URL(SITE_URL).origin

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'x402 Cowsays API',
      version: '1.0.0',
      description:
        'Pay-per-request ASCII cow art on Base Sepolia. Each call costs 0.001 USDC via the x402 payment protocol.',
    },
    servers: [{ url: origin }],
    paths: {
      '/api/cowsays': {
        post: {
          operationId: 'cowsays',
          summary: 'Get a cowsay ASCII art quote (0.001 USDC)',
          'x-agentcash-auth': { mode: 'paid' },
          'x-payment-info': {
            protocols: ['x402'],
            pricingMode: 'fixed',
            price: '0.001',
            currency: 'USDC',
            network: 'eip155:84532',
          },
          responses: {
            '200': {
              description: 'Cowsay ASCII art with settlement receipt',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      cowsay: { type: 'string', description: 'ASCII art cowsay quote' },
                      tx: { type: 'string', description: 'On-chain settlement transaction hash' },
                      network: { type: 'string', description: 'CAIP-2 network identifier' },
                    },
                    required: ['cowsay', 'tx', 'network'],
                  },
                },
              },
            },
            '402': {
              description: 'Payment required — includes x402 payment requirements in response body and PAYMENT-REQUIRED header',
            },
          },
        },
      },
    },
    'x-agentcash-guidance': {
      llmsTxtUrl: `${origin}/llms.txt`,
    },
  }

  return Response.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
