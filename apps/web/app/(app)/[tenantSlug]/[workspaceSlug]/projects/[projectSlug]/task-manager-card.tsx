"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { getBadgeClass, toDateInputValue } from "./project-room-utils";

type TaskManagerCardProps = {
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    priority: string;
    statusId: string | null;
    statusName: string | null;
    statusKind: string | null;
  }>;
  statuses: Array<{
    id: string;
    name: string;
    kind: string;
  }>;
};

type EditableTask = TaskManagerCardProps["tasks"][number];

function TaskEditor({
  task,
  statuses,
}: {
  task: EditableTask;
  statuses: TaskManagerCardProps["statuses"];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [dueAt, setDueAt] = useState(toDateInputValue(task.dueAt));
  const [statusId, setStatusId] = useState(task.statusId || "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        setError(result.error || "Task update failed");
        return;
      }

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
        setError(result.error || "Task delete failed");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="entity-row">
      <div className="entity-copy">
        <div className="meta-row">
          <strong>{task.title}</strong>
          <span className={getBadgeClass(task.priority)}>{task.priority}</span>
          <span className={getBadgeClass(task.statusKind || "neutral")}>{task.statusName || "Unassigned"}</span>
        </div>
        {task.description ? <p className="muted">{task.description}</p> : null}
        {task.dueAt ? <div className="muted">Due {new Date(task.dueAt).toLocaleDateString()}</div> : null}
      </div>

      <div className="entity-editor">
        <label className="field">
          <span className="field-label">Task title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
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
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <div className="entity-actions">
          <button className="button-primary" type="button" onClick={onSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save task"}
          </button>
          <button className="button-secondary button-danger" type="button" onClick={onDelete} disabled={isPending}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskManagerCard({ tasks, statuses }: TaskManagerCardProps) {
  return (
    <section className="card grid-span-2">
      <div className="card-header-row">
        <h2>Task management</h2>
      </div>
      {tasks.length ? (
        <div className="stack">
          {tasks.map((task) => (
            <TaskEditor key={task.id} task={task} statuses={statuses} />
          ))}
        </div>
      ) : (
        <p className="empty-note">No tasks yet. Add a next action above to start operating the project.</p>
      )}
    </section>
  );
}
