"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../../workspace-feedback";

type CreateTaskCardProps = {
  projectId: string;
  embedded?: boolean;
};

export function CreateTaskCard({ projectId, embedded = false }: CreateTaskCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueAt, setDueAt] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    const nextTitle = formData.get("title")?.toString() ?? "";
    const nextDescription = formData.get("description")?.toString() ?? "";
    const nextPriority = formData.get("priority")?.toString() ?? "medium";
    const nextDueAt = formData.get("dueAt")?.toString() ?? "";

    setError(null);

    if (!nextTitle.trim()) {
      setError("Enter a task title.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: nextTitle.trim(),
          description: nextDescription.trim() || undefined,
          priority: nextPriority,
          dueAt: nextDueAt || undefined,
        }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Task creation failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Added task "${nextTitle.trim()}".`);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueAt("");
      setShowDetails(false);
      router.refresh();
    });
  }

  const content = (
    <>
      <h2>Add next action</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Start with the task title. Add timing or context only if it changes how the team should execute.
      </p>
      <form action={onSubmit} className="form-grid">
        <label className="field">
          <span className="field-label">Task title</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Confirm launch checklist with client"
          />
        </label>
        <div className="field-hint-row">
          <span className="muted">Priority defaults to medium.</span>
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
                placeholder="Optional execution note or handoff context."
              />
            </label>
            <div className="form-split">
              <label className="field">
                <span className="field-label">Priority</span>
                <select name="priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Due date</span>
                <input name="dueAt" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              </label>
            </div>
          </>
        ) : null}
        {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add task"}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return <div className="embedded-form">{content}</div>;
  }

  return <section className="card">{content}</section>;
}
