import { and, asc, eq } from "drizzle-orm";
import { createOpenRouterChat, resolveTenantOpenRouterKey } from "@workspace-kit/ai-core";
import { db, schema } from "@workspace-kit/db";

const sourceTypeMap = {
  meeting_transcript: "meeting",
  email_thread: "document",
  voice_note: "manual",
  chat_summary: "chat",
  founder_dump: "manual",
  other: "manual",
} as const;

export type CaptureSourceKind = keyof typeof sourceTypeMap;

export async function getCaptureContext(args: {
  tenantId: string;
  workspaceSlug: string;
}) {
  const { tenantId, workspaceSlug } = args;

  const [workspace] = await db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      tenantName: schema.tenants.name,
      tenantSlug: schema.tenants.slug,
    })
    .from(schema.workspaces)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.workspaces.tenantId))
    .where(and(
      eq(schema.workspaces.tenantId, tenantId),
      eq(schema.workspaces.slug, workspaceSlug),
    ))
    .limit(1);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const [projects, queues] = await Promise.all([
    db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        slug: schema.projects.slug,
        summary: schema.projects.summary,
      })
      .from(schema.projects)
      .where(and(
        eq(schema.projects.tenantId, tenantId),
        eq(schema.projects.workspaceId, workspace.id),
      ))
      .orderBy(asc(schema.projects.name)),
    db
      .select({
        id: schema.queues.id,
        name: schema.queues.name,
        slug: schema.queues.slug,
        description: schema.queues.description,
      })
      .from(schema.queues)
      .where(and(
        eq(schema.queues.tenantId, tenantId),
        eq(schema.queues.workspaceId, workspace.id),
      ))
      .orderBy(asc(schema.queues.sortOrder), asc(schema.queues.name)),
  ]);

  return {
    workspace,
    projects,
    queues,
  };
}

export async function createInteractionCapture(args: {
  tenantId: string;
  workspaceId: string;
  userId: string;
  title: string;
  sourceKind: CaptureSourceKind;
  projectId?: string | null;
  queueId?: string | null;
  occurredAt?: Date | null;
  participants?: string | null;
  rawContent: string;
}) {
  const sourceType = sourceTypeMap[args.sourceKind] ?? "manual";
  const sourceLabel = args.sourceKind.replace(/_/g, " ");
  const trimmedContent = args.rawContent.trim();
  const summary = trimmedContent.length > 240
    ? `${trimmedContent.slice(0, 240)}...`
    : trimmedContent;

  const [interaction] = await db
    .insert(schema.interactions)
    .values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      projectId: args.projectId || null,
      queueId: args.queueId || null,
      title: args.title.trim(),
      sourceType,
      sourceLabel,
      occurredAt: args.occurredAt || null,
      summary,
      rawContent: trimmedContent,
      artifactId: null,
      capturedBy: args.userId,
      metadataJson: {
        intake: "capture_hub_v0",
        sourceKind: args.sourceKind,
        participants: args.participants?.trim() || null,
      },
    })
    .returning();

  return interaction;
}

type ExtractedProposal = {
  targetType: "task" | "decision" | "compiled_page" | "memory" | "open_question";
  title: string;
  bodyMarkdown?: string;
  sourceExcerpt?: string;
  confidenceBps?: number;
  proposedPatchJson?: Record<string, unknown>;
};

function safeJsonFromText(text: string): { proposals?: ExtractedProposal[] } | null {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/```json\s*([\s\S]*?)```/)?.[1] ?? trimmed.match(/\{[\s\S]*\}/)?.[0];

  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText) as { proposals?: ExtractedProposal[] };
  } catch {
    return null;
  }
}

function fallbackProposals(interaction: {
  title: string;
  rawContent: string | null;
  queueId: string | null;
}): ExtractedProposal[] {
  const raw = interaction.rawContent || "";
  const excerpt = raw.slice(0, 220);

  return [
    {
      targetType: "task",
      title: `Review follow-up from ${interaction.title}`,
      bodyMarkdown: "Review the captured source, assign owners, and convert the real next steps into approved tasks.",
      sourceExcerpt: excerpt,
      confidenceBps: 5600,
      proposedPatchJson: {
        priority: "medium",
        status: "todo",
      },
    },
    {
      targetType: "open_question",
      title: `What needs a named owner from ${interaction.title}?`,
      bodyMarkdown: "Identify unresolved ownership, timing, or decision gaps from the captured communication.",
      sourceExcerpt: excerpt,
      confidenceBps: 5400,
      proposedPatchJson: {
        kind: "ownership_gap",
      },
    },
    {
      targetType: "compiled_page",
      title: `Update compiled memory from ${interaction.title}`,
      bodyMarkdown: "Add any stable facts, SOP updates, role clarity, hiring needs, or decisions from this source to the relevant compiled page after review.",
      sourceExcerpt: excerpt,
      confidenceBps: 5200,
      proposedPatchJson: {
        pageSlug: "project-overview",
      },
    },
  ];
}

export async function extractInteractionProposals(args: {
  tenantId: string;
  workspaceId: string;
  userId: string;
  interactionId: string;
}) {
  const [interaction] = await db
    .select()
    .from(schema.interactions)
    .where(and(
      eq(schema.interactions.tenantId, args.tenantId),
      eq(schema.interactions.workspaceId, args.workspaceId),
      eq(schema.interactions.id, args.interactionId),
    ))
    .limit(1);

  if (!interaction) {
    throw new Error("Interaction not found");
  }

  let extracted: ExtractedProposal[] | null = null;

  try {
    const runtime = await resolveTenantOpenRouterKey(args.tenantId);
    const completion = await createOpenRouterChat({
      apiKey: runtime.apiKey,
      model: runtime.model,
      maxOutputTokens: runtime.maxOutputTokens,
      messages: [
          {
            role: "system",
            content: [
              "You extract operational proposals for Team Command Center.",
              "Return JSON only with a top-level proposals array.",
              "Allowed targetType values: task, decision, compiled_page, memory, open_question.",
              "Every proposal must include title, bodyMarkdown, sourceExcerpt, confidenceBps, and proposedPatchJson.",
              "Do not create final writes. These are approval inbox proposals only.",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `Title: ${interaction.title}`,
              `Source: ${interaction.sourceLabel || interaction.sourceType}`,
              "",
              interaction.rawContent || "",
            ].join("\n"),
          },
        ],
      });
    const usage = (completion.raw as any)?.usage ?? {};

    await db.insert(schema.modelUsageEvents).values({
      tenantId: args.tenantId,
      workspaceId: args.workspaceId,
      projectId: interaction.projectId,
      threadId: null,
      userId: args.userId,
      agentId: null,
      provider: completion.provider || "openrouter",
      modelName: completion.model || runtime.model,
      inputTokens: Number(usage.prompt_tokens || usage.input_tokens || 0),
      outputTokens: Number(usage.completion_tokens || usage.output_tokens || 0),
      costMicros: 0,
    });

    extracted = safeJsonFromText(completion.text)?.proposals ?? null;
  } catch {
    extracted = null;
  }

  const proposals = (extracted?.length ? extracted : fallbackProposals(interaction))
    .filter((proposal) => proposal.title && proposal.targetType)
    .slice(0, 8);

  const inserted = [];
  for (const proposal of proposals) {
    const [row] = await db
      .insert(schema.proposals)
      .values({
        tenantId: args.tenantId,
        workspaceId: args.workspaceId,
        projectId: interaction.projectId,
        queueId: interaction.queueId,
        interactionId: interaction.id,
        targetType: proposal.targetType,
        title: proposal.title,
        bodyMarkdown: proposal.bodyMarkdown || null,
        status: "pending",
        confidenceBps: proposal.confidenceBps ?? 6500,
        sourceExcerpt: proposal.sourceExcerpt || interaction.rawContent?.slice(0, 220) || null,
        proposedPatchJson: proposal.proposedPatchJson ?? {},
        appliedEntityId: null,
        proposedBy: args.userId,
        reviewedBy: null,
        reviewedAt: null,
      })
      .returning();
    inserted.push(row);
  }

  return inserted;
}
