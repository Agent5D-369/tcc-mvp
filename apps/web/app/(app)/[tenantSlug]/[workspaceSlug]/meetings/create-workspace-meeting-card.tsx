"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type CreateWorkspaceMeetingCardProps = {
  projects: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export function CreateWorkspaceMeetingCard({ projects }: CreateWorkspaceMeetingCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !title.trim()) return;

    setIsSaving(true);
    const response = await fetch(`/api/projects/${projectId}/meetings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title.trim(),
        summary: summary.trim() || undefined,
        meetingAt: meetingAt || undefined,
      }),
    });

    const { error } = await readApiResult(response);
    setIsSaving(false);

    if (!response.ok) {
      pushToast(error || "Could not save the meeting", "error");
      return;
    }

    pushToast("Meeting captured");
    setTitle("");
    setSummary("");
    setMeetingAt("");
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="kicker">New meeting</div>
          <h2 className="section-title">Capture a meeting</h2>
        </div>
      </div>
      {projects.length ? (
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            <span className="field-label">Meeting title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Weekly operating sync" required />
          </label>
          <label>
            <span className="field-label">Project</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Summary</span>
            <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} placeholder="What changed, what was decided, and what needs follow-up?" />
          </label>
          <button className="inline-quiet-button" type="button" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? "Hide time" : "Add meeting time"}
          </button>
          {showDetails ? (
            <label>
              <span className="field-label">Meeting time</span>
              <input type="datetime-local" value={meetingAt} onChange={(event) => setMeetingAt(event.target.value)} />
            </label>
          ) : null}
          <button className="button-primary" type="submit" disabled={!title.trim() || !projectId || isSaving}>
            {isSaving ? "Saving..." : "Save meeting"}
          </button>
        </form>
      ) : (
        <p className="empty-note">Create a project first so the meeting has a place to live.</p>
      )}
    </section>
  );
}
