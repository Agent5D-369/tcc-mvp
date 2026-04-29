"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function KnowledgePageEditor(props: {
  pageId: string;
  title: string;
  pageType: string;
  summary: string | null;
  contentMarkdown: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/knowledge/pages/${props.pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title") || ""),
        pageType: String(form.get("pageType") || ""),
        summary: String(form.get("summary") || ""),
        contentMarkdown: String(form.get("contentMarkdown") || ""),
        changeSummary: String(form.get("changeSummary") || ""),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Could not save the page.");
      setIsSaving(false);
      return;
    }

    setIsEditing(false);
    setIsSaving(false);
    router.refresh();
  }

  if (!isEditing) {
    return (
      <article className="knowledge-document">
        <div className="knowledge-document-toolbar">
          <div>
            <span className="metric-label">Approved page</span>
            <h2>{props.title}</h2>
          </div>
          <button className="button-primary" type="button" onClick={() => setIsEditing(true)}>
            Edit page
          </button>
        </div>
        <pre>{props.contentMarkdown || "No approved content yet."}</pre>
      </article>
    );
  }

  return (
    <form className="card knowledge-editor" onSubmit={handleSubmit}>
      <div className="card-header-row">
        <div>
          <h2>Edit knowledge page</h2>
          <p className="muted">Saving creates a new approved revision so the page history stays intact.</p>
        </div>
        <button className="button-secondary inline-quiet-button" type="button" onClick={() => setIsEditing(false)}>
          Cancel
        </button>
      </div>

      <div className="form-grid">
        <div className="form-split">
          <label>
            Title
            <input name="title" required maxLength={140} defaultValue={props.title} />
          </label>
          <label>
            Type
            <input name="pageType" required maxLength={60} defaultValue={props.pageType} />
          </label>
        </div>

        <label>
          Summary
          <input name="summary" maxLength={500} defaultValue={props.summary ?? ""} />
        </label>

        <label>
          Page body
          <textarea name="contentMarkdown" required rows={18} defaultValue={props.contentMarkdown} />
        </label>

        <label>
          Change note
          <input name="changeSummary" maxLength={240} placeholder="What changed in this revision?" />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button className="button-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save revision"}
          </button>
        </div>
      </div>
    </form>
  );
}
