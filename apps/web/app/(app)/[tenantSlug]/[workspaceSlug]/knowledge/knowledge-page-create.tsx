"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProjectOption = {
  id: string;
  name: string;
};

export function KnowledgePageCreate(props: {
  tenantSlug: string;
  workspaceSlug: string;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const starterContent = useMemo(() => [
    "# New Knowledge Page",
    "",
    "## Current Truth",
    "",
    "## Source Notes",
    "",
    "## Open Questions",
    "",
    "## Next Review",
    "",
  ].join("\n"), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "");
    const pageType = String(form.get("pageType") || "note");
    const projectId = String(form.get("projectId") || "");
    const summary = String(form.get("summary") || "");
    const contentMarkdown = String(form.get("contentMarkdown") || "");

    const response = await fetch("/api/knowledge/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        pageType,
        projectId: projectId || null,
        summary,
        contentMarkdown,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Could not create the knowledge page.");
      setIsSaving(false);
      return;
    }

    router.push(`/${props.tenantSlug}/${props.workspaceSlug}/knowledge/${payload.page.slug}`);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <button className="button-primary" type="button" onClick={() => setIsOpen(true)}>
        New page
      </button>
    );
  }

  return (
    <form className="card knowledge-create-panel" onSubmit={handleSubmit}>
      <div className="card-header-row">
        <div>
          <h2>Create knowledge page</h2>
          <p className="muted">Use this for living notes, SOPs, logs, open questions, and workspace memory.</p>
        </div>
        <button className="button-secondary inline-quiet-button" type="button" onClick={() => setIsOpen(false)}>
          Close
        </button>
      </div>

      <div className="form-grid">
        <div className="form-split">
          <label>
            Title
            <input name="title" required maxLength={140} placeholder="Hiring operating notes" />
          </label>
          <label>
            Type
            <select name="pageType" defaultValue="note">
              <option value="note">Note</option>
              <option value="sop">SOP</option>
              <option value="ledger">Ledger</option>
              <option value="roles">Roles</option>
              <option value="open-questions">Open questions</option>
              <option value="project-brief">Project brief</option>
            </select>
          </label>
        </div>

        <label>
          Project link
          <select name="projectId" defaultValue="">
            <option value="">Workspace-level page</option>
            {props.projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>

        <label>
          Summary
          <input name="summary" maxLength={500} placeholder="What this page helps the team remember or operate." />
        </label>

        <label>
          Page body
          <textarea name="contentMarkdown" defaultValue={starterContent} rows={10} />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button className="button-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Creating..." : "Create page"}
          </button>
        </div>
      </div>
    </form>
  );
}
