import { getFacilitator } from '@/lib/facilitator'

export async function POST(req: Request) {
  try {
    const { payload, requirements } = await req.json()
    return Response.json(await getFacilitator().verify(payload, requirements))
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    )
  }
}
