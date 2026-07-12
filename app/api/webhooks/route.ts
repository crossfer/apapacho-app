import { NextResponse, type NextRequest } from 'next/server'

// Placeholder for external webhooks (e.g. Resend delivery events, Supabase
// database webhooks). This route is excluded from the auth middleware matcher.
export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)
  // TODO: verify signature and dispatch by event type.
  void payload
  return NextResponse.json({ received: true })
}
