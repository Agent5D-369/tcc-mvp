"use client";

import Link from "next/link";
import { useState } from "react";
import { MobileSheet } from "../mobile-sheet";
import { TaskEditorForm, type EditableTaskRecord } from "../task-editor-form";
import { getBadgeClass } from "../projects/[projectSlug]/project-room-utils";

type TasksReviewListProps = {
  tenantSlug: string;
  workspaceSlug: string;
  tasks: EditableTaskRecord[];
  statuses: Array<{
    id: string;
    name: string;
    kind: string;
  }>;
};

export function TasksReviewList({
  tenantSlug,
  workspaceSlug,
  tasks,
  statuses,
}: TasksReviewListProps) {
  const [activeTask, setActiveTask] = useState<EditableTaskRecord | null>(null);

  if (!tasks.length) {
    return (
      <section className="card">
        <h2>No open tasks</h2>
        <p className="empty-note">Capture the next action from a project room when new work appears.</p>
      </section>
    );
  }

  return (
    <>
      <section className="record-list">
        {tasks.map((task) => (
          <article key={task.id} className="record-card">
            <div className="record-card-copy">
              <div className="meta-row">
                <strong>{task.title}</strong>
                <span className={getBadgeClass(task.priority)}>{task.priority}</span>
                <span className={getBadgeClass(task.statusKind || "neutral")}>{task.statusName || "Unassigned"}</span>
              </div>
              <p className="entity-preview">{task.description || "No task detail yet."}</p>
              <div className="entity-summary-meta">
                <span>{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : "No due date"}</span>
                <span>{task.projectName || "No project"}</span>
              </div>
            </div>
            <div className="record-card-actions">
              <button type="button" className="button-primary" onClick={() => setActiveTask(task)}>
                Review task
              </button>
              {task.projectSlug ? (
                <Link
                  className="button-secondary"
                  href={`/${tenantSlug}/${workspaceSlug}/projects/${task.projectSlug}`}
                >
                  View project
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <MobileSheet
        open={Boolean(activeTask)}
        title={activeTask ? activeTask.title : "Task detail"}
        description="Review the task first, then update status, due date, or description only when something changed."
        onClose={() => setActiveTask(null)}
      >
        {activeTask ? (
          <TaskEditorForm
            key={activeTask.id}
            task={activeTask}
            statuses={statuses}
            tenantSlug={tenantSlug}
            workspaceSlug={workspaceSlug}
            onClose={() => setActiveTask(null)}
          />
        ) : null}
      </MobileSheet>
    </>
  );
}
