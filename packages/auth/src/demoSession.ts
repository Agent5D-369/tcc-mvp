import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const DEMO_SESSION_COOKIE = "tcc_demo_session";
const DEMO_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type DemoSessionPayload = {
  userId: string;
  email: string;
  fullName: string | null;
  tenantId: string;
  workspaceId: string;
  expiresAt: number;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }

  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url");
}

export async function createDemoSessionToken(payload: Omit<DemoSessionPayload, "expiresAt">) {
  const fullPayload: DemoSessionPayload = {
    ...payload,
    expiresAt: Date.now() + DEMO_SESSION_MAX_AGE_SECONDS * 1000,
  };

  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function readDemoSessionToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as DemoSessionPayload;

    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.tenantId !== "string" ||
      typeof payload.workspaceId !== "string" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setDemoSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(DEMO_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearDemoSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
}
