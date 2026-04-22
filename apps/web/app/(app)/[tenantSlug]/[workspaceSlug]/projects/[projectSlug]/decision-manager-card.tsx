"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { MobileSheet } from "./mobile-sheet";
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
  onClose,
  onSaved,
}: {
  decision: DecisionManagerCardProps["decisions"][number];
  onClose: () => void;
  onSaved: (message: string) => void;
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

      onSaved(`Saved decision "${title.trim()}".`);
      onClose();
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

      onSaved(`Deleted decision "${decision.title}".`);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="form-grid">
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
      {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
      <div className="entity-actions">
        <button className="button-primary" type="button" onClick={onSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save decision"}
        </button>
        <button className="button-secondary button-danger" type="button" onClick={onDelete} disabled={isPending}>
          Delete
        </button>
      </div>
    </div>
  );
}

export function DecisionManagerCard({ decisions }: DecisionManagerCardProps) {
  const [activeDecision, setActiveDecision] = useState<DecisionManagerCardProps["decisions"][number] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <section className="card">
      <div className="card-header-row">
        <h2>Decisions</h2>
        <span className="muted">{decisions.length} tracked</span>
      </div>
      {notice ? <p className="feedback-banner feedback-success">{notice}</p> : null}
      {decisions.length ? (
        <div className="stack compact-stack">
          {decisions.map((decision) => (
            <div key={decision.id} className="entity-shell">
              <div className="entity-summary">
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
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setNotice(null);
                    setActiveDecision(decision);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-note">No decisions recorded yet.</p>
      )}
      <MobileSheet
        open={Boolean(activeDecision)}
        title={activeDecision ? `Edit ${activeDecision.title}` : "Edit decision"}
        description="Review the decision log first. Edit only when the call, context, or status changed."
        onClose={() => setActiveDecision(null)}
      >
        {activeDecision ? (
          <DecisionEditor
            key={activeDecision.id}
            decision={activeDecision}
            onClose={() => setActiveDecision(null)}
            onSaved={setNotice}
          />
        ) : null}
      </MobileSheet>
    </section>
  );
}
