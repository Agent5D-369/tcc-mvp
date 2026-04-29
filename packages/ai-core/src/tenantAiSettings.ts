import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@workspace-kit/db";

export const LOW_COST_MANAGED_MODEL = "openai/gpt-4.1-mini";

export type AiMode = "managed" | "byo_key" | "disabled";

export type TenantAiSettings = {
  mode: AiMode;
  provider: "openrouter";
  defaultModel: string;
  monthlyBudgetCents: number;
  maxOutputTokens: number;
};

export const DEFAULT_AI_SETTINGS: TenantAiSettings = {
  mode: "managed",
  provider: "openrouter",
  defaultModel: LOW_COST_MANAGED_MODEL,
  monthlyBudgetCents: 500,
  maxOutputTokens: 1200,
};

type TenantSettingsJson = {
  ai?: Partial<TenantAiSettings>;
};

function readAiSettings(settingsJson: Record<string, unknown>): TenantAiSettings {
  const raw = (settingsJson as TenantSettingsJson).ai ?? {};
  const mode = raw.mode === "byo_key" || raw.mode === "disabled" || raw.mode === "managed"
    ? raw.mode
    : DEFAULT_AI_SETTINGS.mode;

  return {
    mode,
    provider: "openrouter",
    defaultModel: typeof raw.defaultModel === "string" && raw.defaultModel.trim()
      ? raw.defaultModel.trim()
      : DEFAULT_AI_SETTINGS.defaultModel,
    monthlyBudgetCents: typeof raw.monthlyBudgetCents === "number"
      ? Math.max(0, Math.floor(raw.monthlyBudgetCents))
      : DEFAULT_AI_SETTINGS.monthlyBudgetCents,
    maxOutputTokens: typeof raw.maxOutputTokens === "number"
      ? Math.min(4000, Math.max(256, Math.floor(raw.maxOutputTokens)))
      : DEFAULT_AI_SETTINGS.maxOutputTokens,
  };
}

function encryptionKey() {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("Missing AI_KEY_ENCRYPTION_SECRET. Add a strong secret before saving customer provider keys.");
  }

  return createHash("sha256").update(secret).digest();
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSecret(value: string) {
  const [, ivRaw, tagRaw, encryptedRaw] = value.split(":");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Stored provider key is malformed");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function keyHint(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "saved";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export async function getTenantAiSettings(tenantId: string) {
  const [tenant] = await db
    .select({
      settingsJson: schema.tenants.settingsJson,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const [providerKey] = await db
    .select({
      provider: schema.tenantAiProviderKeys.provider,
      keyHint: schema.tenantAiProviderKeys.keyHint,
      status: schema.tenantAiProviderKeys.status,
      updatedAt: schema.tenantAiProviderKeys.updatedAt,
    })
    .from(schema.tenantAiProviderKeys)
    .where(and(
      eq(schema.tenantAiProviderKeys.tenantId, tenantId),
      eq(schema.tenantAiProviderKeys.provider, "openrouter"),
    ))
    .orderBy(desc(schema.tenantAiProviderKeys.updatedAt))
    .limit(1);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [usage] = await db
    .select({
      costMicros: sql<number>`coalesce(sum(${schema.modelUsageEvents.costMicros}), 0)`.mapWith(Number),
      inputTokens: sql<number>`coalesce(sum(${schema.modelUsageEvents.inputTokens}), 0)`.mapWith(Number),
      outputTokens: sql<number>`coalesce(sum(${schema.modelUsageEvents.outputTokens}), 0)`.mapWith(Number),
    })
    .from(schema.modelUsageEvents)
    .where(and(
      eq(schema.modelUsageEvents.tenantId, tenantId),
      gte(schema.modelUsageEvents.createdAt, monthStart),
    ));

  const settings = readAiSettings(tenant.settingsJson);

  return {
    settings,
    providerKey: providerKey
      ? {
        provider: providerKey.provider,
        keyHint: providerKey.keyHint,
        status: providerKey.status,
        updatedAt: providerKey.updatedAt.toISOString(),
      }
      : null,
    usage: {
      monthlyBudgetCents: settings.monthlyBudgetCents,
      costCents: Math.ceil((usage?.costMicros ?? 0) / 10_000),
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
    },
  };
}

export async function updateTenantAiSettings(args: {
  tenantId: string;
  userId: string;
  mode: AiMode;
  defaultModel: string;
  monthlyBudgetCents: number;
  maxOutputTokens: number;
  openRouterApiKey?: string | null;
}) {
  const [tenant] = await db
    .select({
      settingsJson: schema.tenants.settingsJson,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, args.tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const nextSettings: TenantAiSettings = {
    mode: args.mode,
    provider: "openrouter",
    defaultModel: args.defaultModel.trim() || DEFAULT_AI_SETTINGS.defaultModel,
    monthlyBudgetCents: Math.max(0, Math.floor(args.monthlyBudgetCents)),
    maxOutputTokens: Math.min(4000, Math.max(256, Math.floor(args.maxOutputTokens))),
  };

  await db
    .update(schema.tenants)
    .set({
      settingsJson: {
        ...tenant.settingsJson,
        ai: nextSettings,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, args.tenantId));

  const apiKey = args.openRouterApiKey?.trim();
  if (apiKey) {
    await db
      .insert(schema.tenantAiProviderKeys)
      .values({
        tenantId: args.tenantId,
        provider: "openrouter",
        encryptedKey: encryptSecret(apiKey),
        keyHint: keyHint(apiKey),
        status: "connected",
        createdBy: args.userId,
        updatedBy: args.userId,
      })
      .onConflictDoUpdate({
        target: [schema.tenantAiProviderKeys.tenantId, schema.tenantAiProviderKeys.provider],
        set: {
          encryptedKey: encryptSecret(apiKey),
          keyHint: keyHint(apiKey),
          status: "connected",
          updatedBy: args.userId,
          updatedAt: new Date(),
        },
      });
  }

  return getTenantAiSettings(args.tenantId);
}

export async function resolveTenantOpenRouterKey(tenantId: string) {
  const { settings, usage } = await getTenantAiSettings(tenantId);
  if (settings.mode === "disabled") {
    throw new Error("AI is disabled for this tenant");
  }

  if (settings.monthlyBudgetCents <= 0) {
    throw new Error("AI budget is set to zero for this tenant");
  }

  if (usage.costCents >= settings.monthlyBudgetCents) {
    throw new Error("AI monthly budget has been reached for this tenant");
  }

  if (settings.mode === "managed") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("QuickLaunch-managed AI is not configured");
    }

    return {
      apiKey,
      model: settings.defaultModel,
      maxOutputTokens: settings.maxOutputTokens,
      providerMode: settings.mode,
    };
  }

  const [providerKey] = await db
    .select({
      encryptedKey: schema.tenantAiProviderKeys.encryptedKey,
    })
    .from(schema.tenantAiProviderKeys)
    .where(and(
      eq(schema.tenantAiProviderKeys.tenantId, tenantId),
      eq(schema.tenantAiProviderKeys.provider, "openrouter"),
    ))
    .limit(1);

  if (!providerKey) {
    throw new Error("Add an OpenRouter key before using bring-your-own-key AI mode");
  }

  return {
    apiKey: decryptSecret(providerKey.encryptedKey),
    model: settings.defaultModel,
    maxOutputTokens: settings.maxOutputTokens,
    providerMode: settings.mode,
  };
}
