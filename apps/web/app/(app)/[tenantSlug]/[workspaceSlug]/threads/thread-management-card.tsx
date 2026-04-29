"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type ThreadManagementCardProps = {
  threadId: string;
  tenantSlug: string;
  workspaceSlug: string;
  initialTitle: string;
  initialPinned: boolean;
};

export function ThreadManagementCard({
  threadId,
  tenantSlug,
  workspaceSlug,
  initialTitle,
  initialPinned,
}: ThreadManagementCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [title, setTitle] = useState(initialTitle);
  const [pinned, setPinned] = useState(initialPinned);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveThread() {
    if (!title.trim()) {
      setError("Enter a thread title.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          pinned,
        }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Thread update failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast("Thread updated");
      router.refresh();
    });
  }

  function archiveThread() {
    if (!window.confirm(`Archive thread "${initialTitle}"?`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: "DELETE",
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Thread archive failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast("Thread archived");
      router.push(`/${tenantSlug}/${workspaceSlug}/threads`);
      router.refresh();
    });
  }

  return (
    <section className="card">
      <h2>Manage thread</h2>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Thread title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
          <span>Pin this thread</span>
        </label>
        {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
        <div className="entity-actions">
          <button className="button-primary" type="button" onClick={saveThread} disabled={isPending}>
            {isPending ? "Saving..." : "Save thread"}
          </button>
          <button className="button-secondary button-danger" type="button" onClick={archiveThread} disabled={isPending}>
            Archive
          </button>
        </div>
      </div>
    </section>
  );
}
