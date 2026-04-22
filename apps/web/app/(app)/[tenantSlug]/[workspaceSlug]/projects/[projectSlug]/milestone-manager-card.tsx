"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { toDateInputValue } from "./project-room-utils";

type MilestoneManagerCardProps = {
  milestones: Array<{
    id: string;
    name: string;
    description: string | null;
    dueAt: string | null;
  }>;
};

function MilestoneEditor({
  milestone,
}: {
  milestone: MilestoneManagerCardProps["milestones"][number];
}) {
  const router = useRouter();
  const [name, setName] = useState(milestone.name);
  const [description, setDescription] = useState(milestone.description || "");
  const [dueAt, setDueAt] = useState(toDateInputValue(milestone.dueAt));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSave() {
    setError(null);

    if (!name.trim()) {
      setError("Enter a milestone name.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/milestones/${milestone.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          dueAt: dueAt || null,
        }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        setError(result.error || "Milestone update failed");
        return;
      }

      router.refresh();
    });
  }

  function onDelete() {
    if (!window.confirm(`Delete milestone "${milestone.name}"?`)) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/milestones/${milestone.id}`, {
        method: "DELETE",
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        setError(result.error || "Milestone delete failed");
        return;
      }

      router.refresh();
    });
  }

  return (
    <details className="entity-shell">
      <summary className="entity-summary">
        <div className="entity-summary-main">
          <strong>{milestone.name}</strong>
          <p className="entity-preview">{milestone.description || "No milestone detail yet."}</p>
          <div className="entity-summary-meta">
            {milestone.dueAt ? <span>Due {new Date(milestone.dueAt).toLocaleDateString()}</span> : <span>No due date</span>}
          </div>
        </div>
        <span className="entity-edit-hint">Edit</span>
      </summary>
      <div className="entity-editor">
        <label className="field">
          <span className="field-label">Milestone name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Capture the checkpoint, dependency, or success criteria."
          />
        </label>
        <label className="field">
          <span className="field-label">Due date</span>
          <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <div className="entity-actions">
          <button className="button-primary" type="button" onClick={onSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save milestone"}
          </button>
          <button className="button-secondary button-danger" type="button" onClick={onDelete} disabled={isPending}>
            Delete
          </button>
        </div>
      </div>
    </details>
  );
}

export function MilestoneManagerCard({ milestones }: MilestoneManagerCardProps) {
  return (
    <section className="card">
      <div className="card-header-row">
        <h2>Milestone management</h2>
        <span className="muted">{milestones.length} tracked</span>
      </div>
      {milestones.length ? (
        <div className="stack">
          {milestones.map((milestone) => (
            <MilestoneEditor key={milestone.id} milestone={milestone} />
          ))}
        </div>
      ) : (
        <p className="empty-note">No milestones tracked yet.</p>
      )}
    </section>
  );
}
