"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { MobileSheet } from "../../mobile-sheet";
import { useWorkspaceFeedback } from "../../workspace-feedback";
import { toDateInputValue } from "./project-room-utils";

type ProjectSettingsCardProps = {
  project: {
    id: string;
    name: string;
    summary: string | null;
    status: string;
    health: string;
    startDate: string | null;
    targetDate: string | null;
  };
  workspaceHref: string;
};

export function ProjectSettingsCard({ project, workspaceHref }: ProjectSettingsCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [summary, setSummary] = useState(project.summary || "");
  const [status, setStatus] = useState(project.status);
  const [health, setHealth] = useState(project.health);
  const [startDate, setStartDate] = useState(toDateInputValue(project.startDate));
  const [targetDate, setTargetDate] = useState(toDateInputValue(project.targetDate));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setName(project.name);
    setSummary(project.summary || "");
    setStatus(project.status);
    setHealth(project.health);
    setStartDate(toDateInputValue(project.startDate));
    setTargetDate(toDateInputValue(project.targetDate));
  }, [project]);

  async function onSubmit(formData: FormData) {
    const nextName = formData.get("name")?.toString() ?? "";
    const nextSummary = formData.get("summary")?.toString() ?? "";
    const nextStatus = formData.get("status")?.toString() ?? project.status;
    const nextHealth = formData.get("health")?.toString() ?? project.health;
    const nextStartDate = formData.get("startDate")?.toString() ?? "";
    const nextTargetDate = formData.get("targetDate")?.toString() ?? "";

    setError(null);

    if (!nextName.trim()) {
      setError("Enter a project name.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nextName.trim(),
          summary: nextSummary.trim() || null,
          status: nextStatus,
          health: nextHealth,
          startDate: nextStartDate || null,
          targetDate: nextTargetDate || null,
        }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Project update failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Saved project "${nextName.trim()}".`);
      setIsEditing(false);
      router.refresh();
    });
  }

  function onArchive() {
    if (!window.confirm(`Archive project "${project.name}"?`)) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Project archive failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Archived project "${project.name}".`);
      router.push(workspaceHref);
      router.refresh();
    });
  }

  return (
    <section className="card">
      <div className="card-header-row">
        <h2>Project settings</h2>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            setError(null);
            setIsEditing((value) => !value);
          }}
        >
          Edit
        </button>
      </div>

      <div className="stack compact-stack">
        <div className="record-summary-grid">
          <div>
            <div className="field-label">Project name</div>
            <strong>{project.name}</strong>
          </div>
          <div>
            <div className="field-label">Status</div>
            <span>{project.status}</span>
          </div>
          <div>
            <div className="field-label">Health</div>
            <span>{project.health}</span>
          </div>
          <div>
            <div className="field-label">Target date</div>
            <span>{project.targetDate ? new Date(project.targetDate).toLocaleDateString() : "None set"}</span>
          </div>
        </div>
        <p className="entity-preview">{project.summary || "No project summary yet."}</p>
      </div>

      <MobileSheet
        open={isEditing}
        title={`Edit ${project.name}`}
        description="Project settings stay out of the way until the scope, timing, or execution posture actually changes."
        onClose={() => {
          setError(null);
          setIsEditing(false);
        }}
      >
        <form action={onSubmit} className="form-grid section-divider">
          <label className="field">
            <span className="field-label">Project name</span>
            <input name="name" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Summary</span>
            <textarea
              name="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              placeholder="State the outcome, scope, and why this project matters."
            />
          </label>
          <div className="form-split">
            <label className="field">
              <span className="field-label">Status</span>
              <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="completed">completed</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Health</span>
              <select name="health" value={health} onChange={(event) => setHealth(event.target.value)}>
                <option value="green">green</option>
                <option value="yellow">yellow</option>
                <option value="red">red</option>
                <option value="unknown">unknown</option>
              </select>
            </label>
          </div>
          <div className="form-split">
            <label className="field">
              <span className="field-label">Start date</span>
              <input
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Target date</span>
              <input
                name="targetDate"
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </label>
          </div>
          {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
          <div className="entity-actions">
            <button className="button-primary" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save project"}
            </button>
            <button className="button-secondary button-danger" type="button" onClick={onArchive} disabled={isPending}>
              Archive project
            </button>
          </div>
        </form>
      </MobileSheet>
    </section>
  );
}
