"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { readApiResult } from "../../../lib/read-api-result";
import { getBadgeClass, toDateInputValue } from "./projects/[projectSlug]/project-room-utils";
import { useWorkspaceFeedback } from "./workspace-feedback";

export type EditableTaskRecord = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: string;
  statusId: string | null;
  statusName: string | null;
  statusKind: string | null;
  projectName?: string | null;
  projectSlug?: string | null;
};

type TaskEditorFormProps = {
  task: EditableTaskRecord;
  statuses: Array<{
    id: string;
    name: string;
    kind: string;
  }>;
  tenantSlug?: string;
  workspaceSlug?: string;
  onClose: () => void;
};

export function TaskEditorForm({
  task,
  statuses,
  tenantSlug,
  workspaceSlug,
  onClose,
}: TaskEditorFormProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [dueAt, setDueAt] = useState(toDateInputValue(task.dueAt));
  const [statusId, setStatusId] = useState(task.statusId || "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const projectHref =
    tenantSlug && workspaceSlug && task.projectSlug
      ? `/${tenantSlug}/${workspaceSlug}/projects/${task.projectSlug}`
      : null;

  function onSave() {
    setError(null);

    if (!title.trim()) {
      setError("Enter a task title.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          dueAt: dueAt || null,
          statusId: statusId || null,
        }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Task update failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Saved task "${title.trim()}".`);
      onClose();
      router.refresh();
    });
  }

  function onDelete() {
    if (!window.confirm(`Delete task "${task.title}"?`)) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Task delete failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Deleted task "${task.title}".`);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="form-grid">
      <div className="sheet-context-block">
        <div className="meta-row">
          <span className={getBadgeClass(task.priority)}>{task.priority}</span>
          <span className={getBadgeClass(task.statusKind || "neutral")}>{task.statusName || "Unassigned"}</span>
        </div>
        <div className="entity-summary-meta">
          <span>{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : "No due date"}</span>
          {task.projectName ? <span>{task.projectName}</span> : null}
        </div>
        {projectHref ? (
          <Link className="button-secondary sheet-inline-link" href={projectHref} onClick={onClose}>
            Open project room
          </Link>
        ) : null}
      </div>

      <label className="field">
        <span className="field-label">Task title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="State the concrete action and expected outcome."
        />
      </label>
      <div className="form-split">
        <label className="field">
          <span className="field-label">Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Due date</span>
          <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Status</span>
        <select value={statusId} onChange={(event) => setStatusId(event.target.value)}>
          <option value="">No status</option>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
      <div className="entity-actions">
        <button className="button-primary" type="button" onClick={onSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save task"}
        </button>
        <button className="button-secondary button-danger" type="button" onClick={onDelete} disabled={isPending}>
          Delete
        </button>
      </div>
    </div>
  );
}
