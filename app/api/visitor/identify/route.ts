import { NextResponse } from "next/server";
import { upsertVisitor } from "../../../_lib/server/persistence";
import { setVisitorId } from "../../../_lib/server/visitor-cookie";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { fingerprint?: string };
    const fingerprint = body.fingerprint;

    if (typeof fingerprint !== "string" || fingerprint.length === 0) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const userAgent = request.headers.get("user-agent") ?? undefined;
    const visitor = await upsertVisitor(fingerprint, userAgent);

    if (visitor) {
      await setVisitorId(visitor.id);
    }

    return NextResponse.json({ ok: Boolean(visitor) });
  } catch (error) {
    console.error("[api/visitor/identify] failed", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
