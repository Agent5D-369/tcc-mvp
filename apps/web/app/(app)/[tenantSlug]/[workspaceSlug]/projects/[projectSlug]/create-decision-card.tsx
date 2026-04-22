"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";

type CreateDecisionCardProps = {
  projectId: string;
};

export function CreateDecisionCard({ projectId }: CreateDecisionCardProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [status, setStatus] = useState("accepted");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    const nextTitle = formData.get("title")?.toString() ?? "";
    const nextContext = formData.get("context")?.toString() ?? "";
    const nextDecisionText = formData.get("decisionText")?.toString() ?? "";
    const nextStatus = formData.get("status")?.toString() ?? "accepted";

    setError(null);

    if (!nextTitle.trim()) {
      setError("Enter a decision title.");
      return;
    }

    if (!nextDecisionText.trim()) {
      setError("Enter the decision itself.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}/decisions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: nextTitle.trim(),
          context: nextContext.trim() || undefined,
          decisionText: nextDecisionText.trim(),
          status: nextStatus,
        }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        setError(result.error || "Decision logging failed");
        return;
      }

      setTitle("");
      setContext("");
      setDecisionText("");
      setStatus("accepted");
      router.refresh();
    });
  }

  return (
    <section className="card">
      <h2>Log decision</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Capture the call so execution, ownership, and audit history stay in the project room.
      </p>
      <form action={onSubmit} className="form-grid">
        <label className="field">
          <span className="field-label">Decision title</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Railway remains the Phase 1 hosting target"
          />
        </label>
        <label className="field">
          <span className="field-label">Context</span>
          <textarea
            name="context"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            rows={3}
            placeholder="Optional trigger, constraint, or alternatives considered."
          />
        </label>
        <label className="field">
          <span className="field-label">Decision</span>
          <textarea
            name="decisionText"
            value={decisionText}
            onChange={(event) => setDecisionText(event.target.value)}
            rows={4}
            placeholder="State the call in concrete terms."
          />
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="accepted">accepted</option>
            <option value="proposed">proposed</option>
            <option value="rejected">rejected</option>
            <option value="superseded">superseded</option>
          </select>
        </label>
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Logging..." : "Log decision"}
        </button>
      </form>
    </section>
  );
}
