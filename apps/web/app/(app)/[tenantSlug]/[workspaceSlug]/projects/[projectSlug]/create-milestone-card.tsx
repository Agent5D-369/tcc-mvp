"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../../workspace-feedback";

type CreateMilestoneCardProps = {
  projectId: string;
  embedded?: boolean;
};

export function CreateMilestoneCard({ projectId, embedded = false }: CreateMilestoneCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    const nextName = formData.get("name")?.toString() ?? "";
    const nextDescription = formData.get("description")?.toString() ?? "";
    const nextDueAt = formData.get("dueAt")?.toString() ?? "";

    setError(null);

    if (!nextName.trim()) {
      setError("Enter a milestone name.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nextName.trim(),
          description: nextDescription.trim() || undefined,
          dueAt: nextDueAt || undefined,
        }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Milestone creation failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Added milestone "${nextName.trim()}".`);
      setName("");
      setDescription("");
      setDueAt("");
      setShowDetails(false);
      router.refresh();
    });
  }

  const content = (
    <>
      <h2>Add milestone</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Capture the checkpoint first. Add success criteria or timing only when it clarifies execution.
      </p>
      <form action={onSubmit} className="form-grid">
        <label className="field">
          <span className="field-label">Milestone name</span>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Client sign-off complete"
          />
        </label>
        <div className="field-hint-row">
          <span className="muted">You can add timing and notes later.</span>
          <button type="button" className="button-secondary inline-quiet-button" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? "Hide details" : "Add details"}
          </button>
        </div>
        {showDetails ? (
          <>
            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                name="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Optional success criteria, handoff note, or dependency."
              />
            </label>
            <label className="field">
              <span className="field-label">Due date</span>
              <input name="dueAt" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            </label>
          </>
        ) : null}
        {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add milestone"}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return <div className="embedded-form">{content}</div>;
  }

  return <section className="card">{content}</section>;
}
