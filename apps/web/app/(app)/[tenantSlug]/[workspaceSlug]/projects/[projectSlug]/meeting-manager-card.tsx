"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { MobileSheet } from "../../mobile-sheet";
import { useWorkspaceFeedback } from "../../workspace-feedback";
import { toDateTimeInputValue } from "./project-room-utils";

type MeetingManagerCardProps = {
  meetings: Array<{
    id: string;
    title: string;
    summary: string | null;
    notesMarkdown: string | null;
    meetingAt: string | null;
  }>;
};

function MeetingEditor({
  meeting,
  onClose,
}: {
  meeting: MeetingManagerCardProps["meetings"][number];
  onClose: () => void;
}) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [title, setTitle] = useState(meeting.title);
  const [summary, setSummary] = useState(meeting.summary || "");
  const [notesMarkdown, setNotesMarkdown] = useState(meeting.notesMarkdown || "");
  const [meetingAt, setMeetingAt] = useState(toDateTimeInputValue(meeting.meetingAt));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSave() {
    setError(null);

    if (!title.trim()) {
      setError("Enter a meeting title.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim() || null,
          notesMarkdown: notesMarkdown.trim() || null,
          meetingAt: meetingAt || null,
        }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Meeting update failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Saved meeting "${title.trim()}".`);
      onClose();
      router.refresh();
    });
  }

  function onDelete() {
    if (!window.confirm(`Delete meeting "${meeting.title}"?`)) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "DELETE",
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        const message = result.error || "Meeting delete failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Deleted meeting "${meeting.title}".`);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="form-grid">
      <label className="field">
        <span className="field-label">Meeting title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Meeting time</span>
        <input type="datetime-local" value={meetingAt} onChange={(event) => setMeetingAt(event.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Summary</span>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={3}
          placeholder="Capture the headline outcome and follow-up posture."
        />
      </label>
      <label className="field">
        <span className="field-label">Notes</span>
        <textarea
          value={notesMarkdown}
          onChange={(event) => setNotesMarkdown(event.target.value)}
          rows={6}
          placeholder="Capture decisions, blockers, and action items."
        />
      </label>
      {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
      <div className="entity-actions">
        <button className="button-primary" type="button" onClick={onSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save meeting"}
        </button>
        <button className="button-secondary button-danger" type="button" onClick={onDelete} disabled={isPending}>
          Delete
        </button>
      </div>
    </div>
  );
}

export function MeetingManagerCard({ meetings }: MeetingManagerCardProps) {
  const [activeMeeting, setActiveMeeting] = useState<MeetingManagerCardProps["meetings"][number] | null>(null);

  return (
    <section className="card">
      <div className="card-header-row">
        <h2>Meetings</h2>
        <span className="muted">{meetings.length} tracked</span>
      </div>
      {meetings.length ? (
        <div className="stack compact-stack">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="entity-shell">
              <div className="entity-summary">
                <div className="entity-summary-main">
                  <strong>{meeting.title}</strong>
                  <p className="entity-preview">{meeting.summary || "No meeting summary yet."}</p>
                  <div className="entity-summary-meta">
                    {meeting.meetingAt ? <span>{new Date(meeting.meetingAt).toLocaleString()}</span> : <span>No meeting time</span>}
                  </div>
                </div>
                <button type="button" className="button-secondary" onClick={() => setActiveMeeting(meeting)}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-note">No meetings captured yet.</p>
      )}
      <MobileSheet
        open={Boolean(activeMeeting)}
        title={activeMeeting ? `Edit ${activeMeeting.title}` : "Edit meeting"}
        description="Meeting edits live in one focused sheet so the record list stays easy to scan."
        onClose={() => setActiveMeeting(null)}
      >
        {activeMeeting ? (
          <MeetingEditor key={activeMeeting.id} meeting={activeMeeting} onClose={() => setActiveMeeting(null)} />
        ) : null}
      </MobileSheet>
    </section>
  );
}
