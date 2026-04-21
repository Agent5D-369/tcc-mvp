import { NextResponse } from "next/server";
import { getSession } from "@workspace-kit/auth";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ session });
}
