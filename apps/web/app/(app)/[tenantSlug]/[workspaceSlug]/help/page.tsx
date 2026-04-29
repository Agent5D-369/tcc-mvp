import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@workspace-kit/auth";
import { getActiveWorkspaceRoute } from "@workspace-kit/tenancy/getActiveWorkspaceRoute";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
};

type HelpLink = {
  label: string;
  href: string;
  absolute?: boolean;
};

type HelpArticle = {
  title: string;
  summary: string;
  links: HelpLink[];
  steps: string[];
};

const helpArticles: HelpArticle[] = [
  {
    title: "Start Here",
    summary: "Use Home to choose the next workflow: capture source material, review approvals, work tasks, or open project rooms.",
    links: [
      { label: "Home", href: "" },
      { label: "Help", href: "help" },
      { label: "Templates", href: "templates" },
    ],
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
    links: [
      { label: "Capture source", href: "capture" },
      { label: "Review approvals", href: "approvals" },
      { label: "Knowledge hub", href: "knowledge" },
    ],
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
    links: [
      { label: "Review approvals", href: "approvals" },
      { label: "Tasks", href: "tasks" },
      { label: "Knowledge hub", href: "knowledge" },
    ],
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
    links: [
      { label: "Projects", href: "projects" },
      { label: "Tasks", href: "tasks" },
      { label: "Templates", href: "templates" },
    ],
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
    links: [
      { label: "Meetings", href: "meetings" },
      { label: "Projects", href: "projects" },
      { label: "Capture source", href: "capture" },
    ],
    steps: [
      "Capture meeting outcomes even when the transcript is messy.",
      "Log decisions with context, decision text, status, and date.",
      "Add review dates for decisions that should not become permanent by accident.",
      "When a meeting creates work, promote it into tasks through approval or project rooms.",
    ],
  },
  {
    title: "Knowledge Hub",
    summary: "Knowledge pages are the self-referential wiki layer: help, operating notes, SOPs, logs, and source-backed memory all point back to real work.",
    links: [
      { label: "Knowledge hub", href: "knowledge" },
      { label: "Capture source", href: "capture" },
      { label: "Templates", href: "templates" },
    ],
    steps: [
      "Create a page when the team needs a durable place to remember how something works.",
      "Use templates when the team needs starter pages and starter tasks together.",
      "Edit pages directly when humans know the truth; use approvals when the truth came from captured source material.",
      "Keep links close: pages should point to projects, tasks, decisions, meetings, and help when relevant.",
    ],
  },
  {
    title: "Threads and AI Agents",
    summary: "Threads hold collaborative AI work. Agents are Markdown-defined helpers that can be allowed on specific surfaces.",
    links: [
      { label: "Threads", href: "threads" },
      { label: "Agent library", href: "settings/agents" },
      { label: "AI settings", href: "settings/ai" },
    ],
    steps: [
      "Use threads for exploration, drafting, and AI-assisted work that should stay in context.",
      "Create focused agents with clear instructions and only the surfaces they need.",
      "Use tenant AI settings to choose managed AI or a tenant-owned OpenRouter key.",
      "Keep budget caps conservative before inviting a wider team.",
    ],
  },
  {
    title: "Admin and Setup",
    summary: "Settings is where owners and admins manage tenant structure, workspace details, members, themes, AI, agents, and guarded deletion.",
    links: [
      { label: "Settings", href: "settings" },
      { label: "AI settings", href: "settings/ai" },
      { label: "Agent library", href: "settings/agents" },
    ],
    steps: [
      "Use one tenant for one organization boundary.",
      "Create a new workspace only when a team or operating area needs a separate surface.",
      "Add members by email and assign the least-powerful role that lets them do their work.",
      "Delete only duplicate or test workspaces after switching away from them and typing the exact name.",
    ],
  },
  {
    title: "Account Access",
    summary: "Google sign-in is the normal access path. Demo access is intentionally limited so shared demos cannot mutate guarded setup.",
    links: [
      { label: "Sign in", href: "/signin", absolute: true },
      { label: "Settings", href: "settings" },
      { label: "Help", href: "help" },
    ],
    steps: [
      "Use the Sign out button in the workspace header to leave the current account.",
      "After sign-out, choose Continue with Google or demo access on the sign-in screen.",
      "Use Google for real users; password auth is not needed for the MVP unless a client cannot use Google.",
      "If Google returns to the same account, choose another Google account in the Google account chooser or sign out of Google in that browser.",
    ],
  },
  {
    title: "Healthy Team Patterns",
    summary: "The best teams keep purpose, roles, conflict paths, dependencies, money, and scale visible before they become emergencies.",
    links: [
      { label: "Templates", href: "templates" },
      { label: "Knowledge hub", href: "knowledge" },
      { label: "Projects", href: "projects" },
    ],
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
            <div className="help-link-row">
              {article.links.map((link) => (
                <Link
                  className="button-secondary inline-quiet-button"
                  href={link.absolute ? link.href : `/${route.tenantSlug}/${route.workspaceSlug}${link.href ? `/${link.href}` : ""}`}
                  key={link.label}
                >
                  {link.label}
                </Link>
              ))}
            </div>
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
