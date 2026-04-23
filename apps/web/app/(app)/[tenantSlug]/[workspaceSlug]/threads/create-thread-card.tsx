"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type CreateThreadCardProps = {
  tenantSlug: string;
  workspaceSlug: string;
  projects: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  defaultProjectId?: string | null;
  compact?: boolean;
};

export function CreateThreadCard({
  tenantSlug,
  workspaceSlug,
  projects,
  defaultProjectId = null,
  compact = false,
}: CreateThreadCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [showDetails, setShowDetails] = useState(Boolean(defaultProjectId));
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch("/api/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        projectId: showDetails && projectId ? projectId : null,
      }),
    });

    const { data, error } = await readApiResult(response);
    setIsSaving(false);

    if (!response.ok) {
      pushToast(error || "Could not create the thread", "error");
      return;
    }

    pushToast("Thread created");
    router.push(`/${tenantSlug}/${workspaceSlug}/threads/${data.thread.id}`);
    router.refresh();
  }

  return (
    <section className={compact ? "card compact-card" : "card"}>
      <div className="section-heading">
        <div>
          <div className="kicker">Coordination</div>
          <h2 className="section-title">Start a thread</h2>
        </div>
        <p className="empty-note">Use a thread when a decision, blocker, or plan needs focused back-and-forth.</p>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          <span className="field-label">Thread title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Unblock the database cutover"
            required
          />
        </label>

        <button className="inline-quiet-button" type="button" onClick={() => setShowDetails((current) => !current)}>
          {showDetails ? "Hide details" : "Link to a project"}
        </button>

        {showDetails ? (
          <label>
            <span className="field-label">Project</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">No linked project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button className="button-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Creating..." : "Create thread"}
        </button>
      </form>
    </section>
  );
}
