import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

const helpArticles = [
  {
    title: "Start Here",
    summary: "Use Home to choose the next workflow: capture source material, review approvals, work tasks, or open project rooms.",
    steps: [
      "Start with the smallest real workflow, not the whole company.",
      "Create or open one project room for work that needs structure.",
      "Capture messy communication before trying to organize it manually.",
      "Approve proposed tasks, decisions, and memory before they become official.",
    ],
  },
  {
    title: "Capture Hub",
    summary: "Capture is for raw meeting notes, transcripts, email threads, voice notes, and founder dumps.",
    steps: [
      "Paste the source first so memory stays evidence-backed.",
      "Choose a queue only when it helps route review.",
      "Extract proposals after saving; extraction suggests writes but does not finalize them.",
      "Use source excerpts to keep trust high when approving AI output.",
    ],
  },
  {
    title: "Approval Inbox",
    summary: "Approval is where suggested tasks, decisions, questions, and memory updates become operating state.",
    steps: [
      "Edit the wording before approving if the source is right but the draft is rough.",
      "Reject anything that is stale, vague, or not worth tracking.",
      "Approve decisions only when the team can live with the wording later.",
      "Use memory approvals for durable facts, not temporary chatter.",
    ],
  },
  {
    title: "Projects and Tasks",
    summary: "Projects hold structured work. Tasks should be concrete next actions with owners, priority, status, and due dates when needed.",
    steps: [
      "Create a project when work needs a room, not for every tiny idea.",
      "Keep task titles action-oriented.",
      "Use status changes instead of deleting history whenever possible.",
      "Archive completed or paused projects so the workspace stays scannable.",
    ],
  },
  {
    title: "Meetings and Decisions",
    summary: "Meetings preserve context. Decisions preserve commitments. Keep both short enough to read later.",
    steps: [
      "Capture meeting outcomes even when the transcript is messy.",
      "Log decisions with context, decision text, status, and date.",
      "Add review dates for decisions that should not become permanent by accident.",
      "When a meeting creates work, promote it into tasks through approval or project rooms.",
    ],
  },
  {
    title: "Healthy Team Patterns",
    summary: "The best teams keep purpose, roles, conflict paths, dependencies, money, and scale visible before they become emergencies.",
    steps: [
      "Write the team charter before people carry different versions of the mission.",
      "Make roles and load visible before the most responsible people burn out.",
      "Create a repair path before conflict is hot.",
      "Track dependencies and runway so promises stay grounded.",
    ],
  },
];

export default async function HelpPage({ params }: PageProps) {
  const session = await getSession();
  const route = await params;

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (!session.activeTenantId || !session.activeWorkspaceId) {
    redirect("/onboarding");
  }

  const activeRoute = await getActiveWorkspaceRoute({
    tenantId: session.activeTenantId,
    workspaceId: session.activeWorkspaceId,
  });

  if (!activeRoute) {
    redirect("/onboarding");
  }

  if (activeRoute.tenantSlug !== route.tenantSlug || activeRoute.workspaceSlug !== route.workspaceSlug) {
    redirect(`/${activeRoute.tenantSlug}/${activeRoute.workspaceSlug}/help`);
  }

  return (
    <main className="page-shell app-page-shell">
      <div className="breadcrumbs">
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}`}>Home</Link>
        <span>/</span>
        <span>Help</span>
      </div>

      <section className="hero hero-compact">
        <div>
          <div className="kicker">Built-in help</div>
          <h1>Learn the system while you use it</h1>
          <p>
            Team Command Center is designed around a simple loop: capture what happened, approve what matters, turn it into work, and keep memory current.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" href={`/${route.tenantSlug}/${route.workspaceSlug}/templates`}>
              Open templates
            </Link>
            <Link className="button-secondary" href={`/${route.tenantSlug}/${route.workspaceSlug}/capture`}>
              Capture source
            </Link>
          </div>
        </div>

        <div className="card">
          <h2>When you feel lost</h2>
          <ul className="list">
            <li>Use Capture when the input is messy.</li>
            <li>Use Approvals when AI has suggested changes.</li>
            <li>Use Projects when work needs structure.</li>
            <li>Use Templates when the team needs better operating habits.</li>
          </ul>
        </div>
      </section>

      <section className="help-grid">
        {helpArticles.map((article) => (
          <article className="card" key={article.title}>
            <h2>{article.title}</h2>
            <p className="muted">{article.summary}</p>
            <ul className="list">
              {article.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
