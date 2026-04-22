"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";

type CreateTaskCardProps = {
  projectId: string;
};

export function CreateTaskCard({ projectId }: CreateTaskCardProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueAt, setDueAt] = useState("");
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
        setError(result.error || "Task creation failed");
        return;
      }

      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueAt("");
      router.refresh();
    });
  }

  return (
    <section className="card">
      <h2>Add next action</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Capture the next concrete task so it shows up in the operating view immediately.
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
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add task"}
        </button>
      </form>
    </section>
  );
}
