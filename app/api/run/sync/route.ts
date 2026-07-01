import { NextResponse } from "next/server";
import { syncRun } from "../../../_lib/server/persistence";
import { getVisitorId } from "../../../_lib/server/visitor-cookie";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      runId?: string;
      status?: string;
      currentLevel?: number;
      score?: number;
    };

    const visitorId = await getVisitorId();

    if (
      !visitorId ||
      typeof body.runId !== "string" ||
      typeof body.status !== "string" ||
      typeof body.currentLevel !== "number" ||
      typeof body.score !== "number"
    ) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    await syncRun({
      runId: body.runId,
      visitorId,
      status: body.status,
      currentLevel: body.currentLevel,
      score: body.score,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/run/sync] failed", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
