"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";

type CreateMilestoneCardProps = {
  projectId: string;
  embedded?: boolean;
};

export function CreateMilestoneCard({ projectId, embedded = false }: CreateMilestoneCardProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
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
        setError(result.error || "Milestone creation failed");
        return;
      }

      setName("");
      setDescription("");
      setDueAt("");
      router.refresh();
    });
  }

  const content = (
    <>
      <h2>Add milestone</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Capture the next checkpoint so the project has a visible execution spine.
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
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
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
