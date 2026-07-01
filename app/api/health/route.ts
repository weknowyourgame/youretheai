import { NextResponse } from "next/server";
import { resolveGatewayTarget } from "../../../server/gateway-driver";

export const runtime = "nodejs";

export function GET() {
  try {
    const target = resolveGatewayTarget();
    return NextResponse.json({ ok: true, mode: target.mode });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      mode: "offline",
      reason: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
