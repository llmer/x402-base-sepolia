export async function GET() {
  const doc = {
    version: 1,
    resources: ['POST /api/cowsays'],
  }

  return Response.json(doc, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
