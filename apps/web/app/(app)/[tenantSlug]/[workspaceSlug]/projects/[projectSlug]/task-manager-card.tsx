"use client";

import { useState } from "react";
import { MobileSheet } from "../../mobile-sheet";
import { TaskEditorForm, type EditableTaskRecord } from "../../task-editor-form";
import { getBadgeClass } from "./project-room-utils";

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

export function TaskManagerCard({ tasks, statuses }: TaskManagerCardProps) {
  const [activeTask, setActiveTask] = useState<EditableTaskRecord | null>(null);

  return (
    <section className="card">
      <div className="card-header-row">
        <h2>Task management</h2>
        <span className="muted">{tasks.length} tracked</span>
      </div>
      {tasks.length ? (
        <div className="stack compact-stack">
          {tasks.map((task) => (
            <div key={task.id} className="entity-shell">
              <div className="entity-summary">
                <div className="entity-summary-main">
                  <div className="meta-row">
                    <strong>{task.title}</strong>
                    <span className={getBadgeClass(task.priority)}>{task.priority}</span>
                    <span className={getBadgeClass(task.statusKind || "neutral")}>{task.statusName || "Unassigned"}</span>
                  </div>
                  <p className="entity-preview">{task.description || "No task detail yet."}</p>
                  <div className="entity-summary-meta">
                    {task.dueAt ? <span>Due {new Date(task.dueAt).toLocaleDateString()}</span> : <span>No due date</span>}
                  </div>
                </div>
                <button type="button" className="button-secondary" onClick={() => setActiveTask(task)}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-note">No tasks yet. Add a next action above to start operating the project.</p>
      )}
      <MobileSheet
        open={Boolean(activeTask)}
        title={activeTask ? activeTask.title : "Edit task"}
        description="Adjust the task only when something changed. Review mode stays compact until you need it."
        onClose={() => setActiveTask(null)}
      >
        {activeTask ? (
          <TaskEditorForm
            key={activeTask.id}
            task={activeTask}
            statuses={statuses}
            onClose={() => setActiveTask(null)}
          />
        ) : null}
      </MobileSheet>
    </section>
  );
}
