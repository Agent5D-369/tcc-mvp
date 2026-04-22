"use client";

import { useState } from "react";
import { CreateDecisionCard } from "./create-decision-card";
import { CreateMeetingCard } from "./create-meeting-card";
import { CreateMilestoneCard } from "./create-milestone-card";
import { CreateTaskCard } from "./create-task-card";

type CaptureMode = "task" | "milestone" | "decision" | "meeting";

type ProjectCapturePanelProps = {
  projectId: string;
};

const captureModes: Array<{ id: CaptureMode; label: string }> = [
  { id: "task", label: "Add task" },
  { id: "milestone", label: "Add milestone" },
  { id: "decision", label: "Log decision" },
  { id: "meeting", label: "Capture meeting" },
];

export function ProjectCapturePanel({ projectId }: ProjectCapturePanelProps) {
  const [activeMode, setActiveMode] = useState<CaptureMode>("task");

  return (
    <section className="card">
      <div className="card-header-row">
        <div>
          <h2>Capture</h2>
          <p className="empty-note">Choose the next thing you need to record. Keep only one capture form open at a time.</p>
        </div>
      </div>
      <div className="action-toggle-row" role="tablist" aria-label="Capture record type">
        {captureModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={activeMode === mode.id ? "button-primary action-toggle" : "button-secondary action-toggle"}
            onClick={() => setActiveMode(mode.id)}
            aria-pressed={activeMode === mode.id}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <div className="capture-panel-body">
        {activeMode === "task" ? <CreateTaskCard projectId={projectId} embedded /> : null}
        {activeMode === "milestone" ? <CreateMilestoneCard projectId={projectId} embedded /> : null}
        {activeMode === "decision" ? <CreateDecisionCard projectId={projectId} embedded /> : null}
        {activeMode === "meeting" ? <CreateMeetingCard projectId={projectId} embedded /> : null}
      </div>
    </section>
  );
}
