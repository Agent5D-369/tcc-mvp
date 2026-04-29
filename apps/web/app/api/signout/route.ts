import { NextRequest, NextResponse } from "next/server";
import { clearDemoSessionCookie } from "@workspace-kit/auth/demoSession";

export async function GET(req: NextRequest) {
  await clearDemoSessionCookie();
  return NextResponse.redirect(new URL("/api/auth/signout?callbackUrl=/signin", req.url));
}
