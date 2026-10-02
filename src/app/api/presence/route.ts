import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Presence beacon sink.
 *
 * The browser fires `navigator.sendBeacon()` here on `beforeunload` so the
 * request survives page teardown. Availability itself is maintained by the
 * client: a Realtime Presence channel carries liveness, and `profiles.presence`
 * is the column other users actually read.
 *
 * This endpoint only acknowledges receipt. Marking a user offline from here
 * would require the service_role key, because the beacon carries no usable
 * credential once the page has started tearing down. It is not needed: a
 * dropped Realtime socket is itself the liveness signal.
 */
export async function POST() {
  return new NextResponse(null, { status: 204 });
}

export function GET() {
  return NextResponse.json({ ok: true });
}
