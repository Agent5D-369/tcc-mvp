import Link from "next/link";
import { redirect } from "next/navigation";
import { getApprovalInbox } from "@workspace-kit/approvals";
import { getSession } from "@workspace-kit/auth";
import { approveProposalAction, rejectProposalAction } from "./actions";

type PageProps = {
  params: Promise<{ tenantSlug: string; workspaceSlug: string }>;
  searchParams: Promise<{ approved?: string; rejected?: string }>;
};

type ProposalCardProps = {
  proposal: {
    id: string;
    title: string;
    targetType: string;
    bodyMarkdown: string | null;
    confidenceBps: number;
    sourceExcerpt: string | null;
    queueName: string | null;
    projectName: string | null;
    interactionTitle: string | null;
    sourceLabel: string | null;
  };
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
};

function ProposalCard({ proposal, approveAction, rejectAction }: ProposalCardProps) {
  return (
    <article className="approval-card">
      <div className="meta-row">
        <span className="badge badge-neutral">{proposal.targetType.replace(/_/g, " ")}</span>
        <span className="badge badge-neutral">{Math.round(proposal.confidenceBps / 100)}% confidence</span>
        {proposal.projectName ? <span className="badge badge-neutral">{proposal.projectName}</span> : null}
      </div>

      <form action={approveAction} className="approval-edit-form">
        <input name="proposalId" type="hidden" value={proposal.id} />
        <label>
          <span>Proposal</span>
          <input name="title" defaultValue={proposal.title} />
        </label>

        <label>
          <span>Draft write</span>
          <textarea
            name="bodyMarkdown"
            defaultValue={proposal.bodyMarkdown || ""}
            placeholder="What should be written into TCC after approval?"
          />
        </label>

        <div className="source-box">
          <strong>{proposal.interactionTitle || "Captured source"}</strong>
          <div className="muted">{proposal.sourceLabel || proposal.queueName || "Source evidence"}</div>
          <label>
            <span>Evidence excerpt</span>
            <textarea
              name="sourceExcerpt"
              defaultValue={proposal.sourceExcerpt || ""}
              placeholder="Source-backed evidence for this proposal."
            />
          </label>
        </div>

        <div className="form-actions">
          <button className="button-primary" type="submit">Approve edited</button>
        </div>
      </form>

      <form action={rejectAction}>
        <input name="proposalId" type="hidden" value={proposal.id} />
        <button className="button-secondary" type="submit">Reject</button>
      </form>
    </article>
  );
}

export default async function ApprovalsPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  const route = await params;
  const query = await searchParams;

  if (!session?.activeTenantId) {
    redirect("/signin");
  }

  const data = await getApprovalInbox({
    tenantId: session.activeTenantId,
    workspaceSlug: route.workspaceSlug,
  });

  const approveAction = approveProposalAction.bind(null, route);
  const rejectAction = rejectProposalAction.bind(null, route);
  const totalPending = data.queues.reduce((sum, queue) => sum + queue.proposals.length, data.unqueued.length);
  const proposalsByType = [...data.queues.flatMap((queue) => queue.proposals), ...data.unqueued]
    .reduce<Record<string, number>>((summary, proposal) => ({
      ...summary,
      [proposal.targetType]: (summary[proposal.targetType] ?? 0) + 1,
    }), {});

  return (
    <main className="page-shell">
      <div className="breadcrumbs">
        <Link href={`/${route.tenantSlug}/${route.workspaceSlug}`}>{data.workspace.name}</Link>
        <span>/</span>
        <span>Approval Inbox</span>
      </div>

      <section className="hero compact-hero">
        <div>
          <div className="kicker">Approval Inbox v0</div>
          <h1>Promote proposals into operating state.</h1>
          <p>
            Review source-backed suggestions before they become tasks, decisions, memory, or compiled wiki updates.
          </p>
          <div className="meta-row">
            <span className="badge badge-neutral">{totalPending} pending</span>
            <span className="badge badge-neutral">Human-approved writes</span>
          </div>
        </div>

        <div className="card">
          <h2>Approval rules</h2>
          <ul className="list">
            <li>Approve task proposals into the task list.</li>
            <li>Approve decisions into the decision log.</li>
            <li>Approve memory updates into compiled wiki revisions.</li>
            <li>Edit the draft before approval when the source is right but the wording needs a human pass.</li>
          </ul>
        </div>
      </section>

      {query.approved ? (
        <section className="notice notice-success">
          <strong>Approved.</strong>
          <span>The proposal was written into TCC operating state.</span>
        </section>
      ) : null}

      {query.rejected ? (
        <section className="notice">
          <strong>Rejected.</strong>
          <span>The proposal has been removed from the pending queue.</span>
        </section>
      ) : null}

      <section className="metric-grid">
        {["task", "decision", "compiled_page", "memory", "open_question"].map((type) => (
          <article className="metric-card" key={type}>
            <div className="metric-label">{type.replace(/_/g, " ")}</div>
            <div className="metric-value">{proposalsByType[type] ?? 0}</div>
          </article>
        ))}
      </section>

      <section className="approval-layout">
        <section className="notice">
          <strong>Approval rule of thumb.</strong>
          <span>Approve only what you would want the team to find later. Edit rough wording, reject noise, and keep durable memory tied to evidence.</span>
        </section>
        {data.queues.map((queue) => (
          <section className="approval-lane" key={queue.id}>
            <div className="split approval-lane-header">
              <div>
                <h2>{queue.name}</h2>
                <p className="muted">{queue.description || "Pending proposals routed to this queue."}</p>
              </div>
              <span className={queue.proposals.length ? "badge badge-warn" : "badge badge-neutral"}>
                {queue.proposals.length} pending
              </span>
            </div>

            {queue.proposals.length ? (
              <div className="approval-stack">
                {queue.proposals.map((proposal) => (
                  <ProposalCard
                    approveAction={approveAction}
                    key={proposal.id}
                    proposal={proposal}
                    rejectAction={rejectAction}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-note">No pending proposals in this queue.</p>
            )}
          </section>
        ))}

        {data.unqueued.length ? (
          <section className="approval-lane">
            <div className="split approval-lane-header">
              <h2>Unqueued</h2>
              <span className="badge badge-warn">{data.unqueued.length} pending</span>
            </div>
            <div className="approval-stack">
              {data.unqueued.map((proposal) => (
                <ProposalCard
                  approveAction={approveAction}
                  key={proposal.id}
                  proposal={proposal}
                  rejectAction={rejectAction}
                />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
