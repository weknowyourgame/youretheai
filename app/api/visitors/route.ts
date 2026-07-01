import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COUNTER_FILE = path.join(process.cwd(), ".data", "visitor-count.json");

async function readCount() {
  try {
    const raw = await fs.readFile(COUNTER_FILE, "utf8");
    const parsed = JSON.parse(raw) as { count?: number };
    return typeof parsed.count === "number" ? parsed.count : 0;
  } catch {
    return 0;
  }
}

async function writeCount(count: number) {
  await fs.mkdir(path.dirname(COUNTER_FILE), { recursive: true });
  await fs.writeFile(COUNTER_FILE, JSON.stringify({ count }), "utf8");
}

export async function GET() {
  const count = await readCount();
  return NextResponse.json({ count });
}

export async function POST() {
  const count = (await readCount()) + 1;
  await writeCount(count);
  return NextResponse.json({ count });
}
