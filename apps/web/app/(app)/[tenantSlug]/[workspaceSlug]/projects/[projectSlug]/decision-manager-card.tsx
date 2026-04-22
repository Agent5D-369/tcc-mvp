"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { getBadgeClass } from "./project-room-utils";

type DecisionManagerCardProps = {
  decisions: Array<{
    id: string;
    title: string;
    context: string | null;
    decisionText: string;
    status: string;
    decidedAt: string | null;
  }>;
};

function DecisionEditor({
  decision,
}: {
  decision: DecisionManagerCardProps["decisions"][number];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(decision.title);
  const [context, setContext] = useState(decision.context || "");
  const [decisionText, setDecisionText] = useState(decision.decisionText);
  const [status, setStatus] = useState(decision.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSave() {
    setError(null);

    if (!title.trim() || !decisionText.trim()) {
      setError("Decision title and decision text are required.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/decisions/${decision.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          context: context.trim() || null,
          decisionText: decisionText.trim(),
          status,
        }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        setError(result.error || "Decision update failed");
        return;
      }

      router.refresh();
    });
  }

  function onDelete() {
    if (!window.confirm(`Delete decision "${decision.title}"?`)) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/decisions/${decision.id}`, {
        method: "DELETE",
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        setError(result.error || "Decision delete failed");
        return;
      }

      router.refresh();
    });
  }

  return (
    <details className="entity-shell">
      <summary className="entity-summary">
        <div className="entity-summary-main">
          <div className="meta-row">
            <strong>{decision.title}</strong>
            <span className={getBadgeClass(decision.status)}>{decision.status}</span>
            {decision.decidedAt ? (
              <span className="badge badge-neutral">{new Date(decision.decidedAt).toLocaleDateString()}</span>
            ) : null}
          </div>
          <p className="entity-preview">{decision.decisionText}</p>
          <div className="entity-summary-meta">
            <span>{decision.context || "No decision context yet."}</span>
          </div>
        </div>
        <span className="entity-edit-hint">Edit</span>
      </summary>
      <div className="entity-editor">
        <label className="field">
          <span className="field-label">Decision title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Context</span>
          <textarea
            value={context}
            onChange={(event) => setContext(event.target.value)}
            rows={3}
            placeholder="State the trigger, tradeoff, or constraint."
          />
        </label>
        <label className="field">
          <span className="field-label">Decision</span>
          <textarea
            value={decisionText}
            onChange={(event) => setDecisionText(event.target.value)}
            rows={4}
            placeholder="State the decision in concrete terms."
          />
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="proposed">proposed</option>
            <option value="accepted">accepted</option>
            <option value="rejected">rejected</option>
            <option value="superseded">superseded</option>
          </select>
        </label>
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <div className="entity-actions">
          <button className="button-primary" type="button" onClick={onSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save decision"}
          </button>
          <button className="button-secondary button-danger" type="button" onClick={onDelete} disabled={isPending}>
            Delete
          </button>
        </div>
      </div>
    </details>
  );
}

export function DecisionManagerCard({ decisions }: DecisionManagerCardProps) {
  return (
    <section className="card">
      <div className="card-header-row">
        <h2>Decision management</h2>
        <span className="muted">{decisions.length} tracked</span>
      </div>
      {decisions.length ? (
        <div className="stack">
          {decisions.map((decision) => (
            <DecisionEditor key={decision.id} decision={decision} />
          ))}
        </div>
      ) : (
        <p className="empty-note">No decisions recorded yet.</p>
      )}
    </section>
  );
}
