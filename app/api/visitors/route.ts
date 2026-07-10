import { NextResponse } from "next/server";
import { countVisitors } from "../../_lib/server/persistence";

export const runtime = "nodejs";

export async function GET() {
  const count = await countVisitors();
  return NextResponse.json({ count });
}

export async function POST() {
  const count = await countVisitors();
  return NextResponse.json({ count });
}
