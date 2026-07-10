import { cookies } from "next/headers";

const COOKIE_NAME = "yta_vid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getVisitorId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setVisitorId(visitorId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, visitorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}
