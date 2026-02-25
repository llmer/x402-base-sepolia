import { getFacilitator } from '@/lib/facilitator'

export async function GET() {
  try {
    return Response.json(getFacilitator().getSupported())
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
