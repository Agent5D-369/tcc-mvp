"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type CreateTaskCardProps = {
  tenantSlug: string;
  workspaceSlug: string;
  projects: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export function CreateTaskCard({ tenantSlug, workspaceSlug, projects }: CreateTaskCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueAt, setDueAt] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;

    setIsSaving(true);
    const response = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description: showDetails ? description : undefined,
        priority,
        dueAt: dueAt || undefined,
      }),
    });

    const { error } = await readApiResult(response);
    setIsSaving(false);

    if (!response.ok) {
      pushToast(error || "Could not create the task", "error");
      return;
    }

    pushToast("Task created");
    setTitle("");
    setDescription("");
    setDueAt("");
    setPriority("medium");
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="kicker">New task</div>
          <h2 className="section-title">Add a next action</h2>
        </div>
      </div>
      {projects.length ? (
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            <span className="field-label">Task title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Follow up on launch checklist" required />
          </label>

          <label>
            <span className="field-label">Project</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <div className="form-split">
            <label>
              <span className="field-label">Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
            </label>
            <label>
              <span className="field-label">Due date</span>
              <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            </label>
          </div>

          <button className="inline-quiet-button" type="button" onClick={() => setShowDetails((current) => !current)}>
            {showDetails ? "Hide details" : "Add details"}
          </button>

          {showDetails ? (
            <label>
              <span className="field-label">Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What outcome should this task produce?" />
            </label>
          ) : null}

          <button className="button-primary" type="submit" disabled={!title.trim() || !projectId || isSaving}>
            {isSaving ? "Creating..." : "Create task"}
          </button>
        </form>
      ) : (
        <>
          <p className="empty-note">Create a project first so the task has a real operating room.</p>
          <Link className="button-primary" href={`/${tenantSlug}/${workspaceSlug}/projects`}>
            Open projects
          </Link>
        </>
      )}
    </section>
  );
}
