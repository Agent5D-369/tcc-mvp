import Link from "next/link";
import { redirect } from "next/navigation";
import { listAgentDefinitions } from "@workspace-kit/ai-core";
import { getSession } from "@workspace-kit/auth";
import { getCaptureContext } from "@workspace-kit/capture";
import { createCaptureAction, extractCaptureAction } from "./actions";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
  searchParams: Promise<{ captured?: string; extracted?: string; error?: string }>;
};

const sourceKinds = [
  { value: "meeting_transcript", label: "Meeting transcript" },
  { value: "email_thread", label: "Email thread" },
  { value: "voice_note", label: "Voice note" },
  { value: "chat_summary", label: "Chat summary" },
  { value: "founder_dump", label: "Founder dump" },
  { value: "other", label: "Other" },
];

export default async function CapturePage({ params, searchParams }: PageProps) {
  const session = await getSession();
  const route = await params;
  const query = await searchParams;

  if (!session?.activeTenantId) {
    redirect("/signin");
  }

  const data = await getCaptureContext({
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
  });
  const agents = await listAgentDefinitions({
    tenantId: session.activeTenantId,
    workspaceId: data.workspace.id,
    surface: "capture",
  });

  const createCapture = createCaptureAction.bind(null, route);
  const extractCapture = extractCaptureAction.bind(null, route);

  return (
    <main className="page-shell">
      <div className="breadcrumbs">
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}`}>{data.workspace.name}</Link>
        <span>/</span>
        <span>Capture Hub</span>
      </div>

      <section className="hero compact-hero">
        <div>
          <div className="kicker">Capture Hub v0</div>
          <h1>Drop messy communication into TCC.</h1>
          <p>
            Paste meeting notes, email threads, voice notes, copied chat summaries, or founder brain dumps. TCC stores the source first, then extraction can propose tasks, decisions, and memory.
          </p>
          <div className="meta-row">
            <span className="badge badge-neutral">Approval-first</span>
            <span className="badge badge-neutral">Source-backed</span>
            <span className="badge badge-neutral">Workspace memory</span>
          </div>
        </div>

        <div className="card">
          <h2>Next in the loop</h2>
          <ul className="list">
            <li>Capture creates an Interaction record.</li>
            <li>Extraction will generate proposals, not final writes.</li>
            <li>Approval will promote proposals into tasks, decisions, and compiled memory.</li>
          </ul>
        </div>
      </section>

      {query.captured ? (
        <section className="notice notice-success">
          <strong>{query.extracted ? "Extracted." : "Captured."}</strong>
          <span>
            {query.extracted
              ? `${query.extracted} proposal${query.extracted === "1" ? "" : "s"} added to the approval inbox.`
              : "The source is now in the interaction spine and ready for extraction."}
          </span>
          {!query.extracted ? (
            <form action={extractCapture}>
              <input name="interactionId" type="hidden" value={query.captured} />
              <label>
                <span className="field-label">Extraction agent</span>
                <select name="agentId" defaultValue="">
                  <option value="">Default extractor</option>
                  {agents.filter((agent) => agent.isActive).map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </label>
              <button className="button-secondary" type="submit">Extract proposals</button>
            </form>
          ) : null}
        </section>
      ) : null}

      {query.error ? (
        <section className="notice notice-danger">
          <strong>Missing fields.</strong>
          <span>Add a title, source type, and raw content before saving.</span>
        </section>
      ) : null}

      <section className="capture-layout">
        <form action={createCapture} className="card capture-form">
          <div className="form-grid">
            <label>
              <span>Title</span>
              <input name="title" placeholder="Founder ops follow-up, hiring sync, Read AI recap..." required />
            </label>

            <label>
              <span>Source type</span>
              <select name="sourceKind" defaultValue="meeting_transcript" required>
                {sourceKinds.map((kind) => (
                  <option key={kind.value} value={kind.value}>{kind.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Queue</span>
              <select name="queueId" defaultValue={data.queues.find((queue) => queue.slug === "ops")?.id ?? ""}>
                <option value="">No queue</option>
                {data.queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>{queue.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Project</span>
              <select name="projectId" defaultValue={data.projects[0]?.id ?? ""}>
                <option value="">No project</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Occurred at</span>
              <input name="occurredAt" type="datetime-local" />
            </label>

            <label>
              <span>Participants</span>
              <input name="participants" placeholder="Names, emails, roles, or groups" />
            </label>
          </div>

          <label className="textarea-field">
            <span>Raw communication</span>
            <textarea
              name="rawContent"
              placeholder="Paste transcript, Read AI notes, forwarded email text, voice-to-text, or copied chat summary..."
              required
            />
          </label>

          <div className="form-actions">
            <button className="button-primary" type="submit">Save capture</button>
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}`}>
              Back to dashboard
            </Link>
          </div>
        </form>

        <aside className="stack">
          <section className="card">
            <h2>Queues</h2>
            <ul className="list">
              {data.queues.map((queue) => (
                <li key={queue.id}>
                  <strong>{queue.name}</strong>
                  <div className="muted">{queue.description || "Capture lane for approval routing."}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>What this writes</h2>
            <ul className="list">
              <li>Interaction source record</li>
              <li>Raw source text</li>
              <li>Queue and project routing</li>
              <li>Metadata for later extraction</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
