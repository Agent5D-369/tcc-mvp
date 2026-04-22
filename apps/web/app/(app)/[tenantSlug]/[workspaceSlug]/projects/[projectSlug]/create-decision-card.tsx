"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../../workspace-feedback";

type CreateDecisionCardProps = {
  projectId: string;
  embedded?: boolean;
};

export function CreateDecisionCard({ projectId, embedded = false }: CreateDecisionCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [status, setStatus] = useState("accepted");
  const [showDetails, setShowDetails] = useState(false);
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
        const message = result.error || "Decision logging failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Logged decision "${nextTitle.trim()}".`);
      setTitle("");
      setContext("");
      setDecisionText("");
      setStatus("accepted");
      setShowDetails(false);
      router.refresh();
    });
  }

  const content = (
    <>
      <h2>Log decision</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Record the decision title and the call itself first. Context and status are optional on first pass.
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
          <span className="field-label">Decision</span>
          <textarea
            name="decisionText"
            value={decisionText}
            onChange={(event) => setDecisionText(event.target.value)}
            rows={4}
            placeholder="State the call in concrete terms."
          />
        </label>
        <div className="field-hint-row">
          <span className="muted">Status defaults to accepted.</span>
          <button type="button" className="button-secondary inline-quiet-button" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? "Hide details" : "Add details"}
          </button>
        </div>
        {showDetails ? (
          <>
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
              <span className="field-label">Status</span>
              <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="accepted">accepted</option>
                <option value="proposed">proposed</option>
                <option value="rejected">rejected</option>
                <option value="superseded">superseded</option>
              </select>
            </label>
          </>
        ) : null}
        {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Logging..." : "Log decision"}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return <div className="embedded-form">{content}</div>;
  }

  return <section className="card">{content}</section>;
}
