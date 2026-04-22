"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";

type TaskOption = {
  id: string;
  name: string;
  kind: string;
};

type TaskRow = {
  id: string;
  title: string;
  dueAt: string | null;
  priority: string;
  statusId: string | null;
  statusName: string | null;
  statusKind: string | null;
};

type TaskStatusListProps = {
  tasks: TaskRow[];
  statuses: TaskOption[];
};

function getBadgeClass(kind: string) {
  switch (kind) {
    case "green":
    case "active":
      return "badge badge-success";
    case "yellow":
    case "paused":
    case "medium":
      return "badge badge-warn";
    case "red":
    case "urgent":
      return "badge badge-danger";
    default:
      return "badge badge-neutral";
  }
}

export function TaskStatusList({ tasks, statuses }: TaskStatusListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onStatusChange(taskId: string, statusId: string) {
    setError(null);
    setPendingTaskId(taskId);

    startTransition(async () => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statusId }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        setError(result.error || "Task update failed");
        setPendingTaskId(null);
        return;
      }

      router.refresh();
      setPendingTaskId(null);
    });
  }

  return (
    <>
      {error ? <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>{error}</p> : null}
      <ul className="list">
        {tasks.map((task) => (
          <li key={task.id}>
            <div className="task-row">
              <div className="task-row-copy">
                <strong>{task.title}</strong>
                <div className="meta-row">
                  <span className={getBadgeClass(task.priority)}>{task.priority}</span>
                  {task.statusName ? <span className="badge badge-neutral">{task.statusName}</span> : null}
                  {task.dueAt ? <span className="badge badge-neutral">Due {new Date(task.dueAt).toLocaleDateString()}</span> : null}
                </div>
              </div>
              <label className="field task-status-field">
                <span className="field-label">Status</span>
                <select
                  value={task.statusId ?? ""}
                  disabled={isPending && pendingTaskId === task.id}
                  onChange={(event) => onStatusChange(task.id, event.target.value)}
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
