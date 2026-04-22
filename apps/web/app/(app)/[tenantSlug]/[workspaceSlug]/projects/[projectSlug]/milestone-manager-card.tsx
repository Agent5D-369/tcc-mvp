"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { MobileSheet } from "./mobile-sheet";
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
  onClose,
  onSaved,
}: {
  milestone: MilestoneManagerCardProps["milestones"][number];
  onClose: () => void;
  onSaved: (message: string) => void;
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

      onSaved(`Saved milestone "${name.trim()}".`);
      onClose();
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

      onSaved(`Deleted milestone "${milestone.name}".`);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="form-grid">
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
      {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
      <div className="entity-actions">
        <button className="button-primary" type="button" onClick={onSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save milestone"}
        </button>
        <button className="button-secondary button-danger" type="button" onClick={onDelete} disabled={isPending}>
          Delete
        </button>
      </div>
    </div>
  );
}

export function MilestoneManagerCard({ milestones }: MilestoneManagerCardProps) {
  const [activeMilestone, setActiveMilestone] = useState<MilestoneManagerCardProps["milestones"][number] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <section className="card">
      <div className="card-header-row">
        <h2>Milestones</h2>
        <span className="muted">{milestones.length} tracked</span>
      </div>
      {notice ? <p className="feedback-banner feedback-success">{notice}</p> : null}
      {milestones.length ? (
        <div className="stack compact-stack">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="entity-shell">
              <div className="entity-summary">
                <div className="entity-summary-main">
                  <strong>{milestone.name}</strong>
                  <p className="entity-preview">{milestone.description || "No milestone detail yet."}</p>
                  <div className="entity-summary-meta">
                    {milestone.dueAt ? <span>Due {new Date(milestone.dueAt).toLocaleDateString()}</span> : <span>No due date</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setNotice(null);
                    setActiveMilestone(milestone);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-note">No milestones tracked yet.</p>
      )}
      <MobileSheet
        open={Boolean(activeMilestone)}
        title={activeMilestone ? `Edit ${activeMilestone.name}` : "Edit milestone"}
        description="Keep milestone review compact. Open the editor only when timing or scope changed."
        onClose={() => setActiveMilestone(null)}
      >
        {activeMilestone ? (
          <MilestoneEditor
            key={activeMilestone.id}
            milestone={activeMilestone}
            onClose={() => setActiveMilestone(null)}
            onSaved={setNotice}
          />
        ) : null}
      </MobileSheet>
    </section>
  );
}
