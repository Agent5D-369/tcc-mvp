"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
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
}: {
  meeting: MeetingManagerCardProps["meetings"][number];
}) {
  const router = useRouter();
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
        setError(result.error || "Meeting update failed");
        return;
      }

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
        setError(result.error || "Meeting delete failed");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="entity-row">
      <div className="entity-copy">
        <strong>{meeting.title}</strong>
        {meeting.summary ? <p className="muted">{meeting.summary}</p> : null}
        {meeting.meetingAt ? <div className="muted">{new Date(meeting.meetingAt).toLocaleString()}</div> : null}
      </div>
      <div className="entity-editor">
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
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <div className="entity-actions">
          <button className="button-primary" type="button" onClick={onSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save meeting"}
          </button>
          <button className="button-secondary button-danger" type="button" onClick={onDelete} disabled={isPending}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function MeetingManagerCard({ meetings }: MeetingManagerCardProps) {
  return (
    <section className="card">
      <div className="card-header-row">
        <h2>Meeting management</h2>
      </div>
      {meetings.length ? (
        <div className="stack">
          {meetings.map((meeting) => (
            <MeetingEditor key={meeting.id} meeting={meeting} />
          ))}
        </div>
      ) : (
        <p className="empty-note">No meetings captured yet.</p>
      )}
    </section>
  );
}
