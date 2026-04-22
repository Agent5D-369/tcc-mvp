"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";

type CreateMeetingCardProps = {
  projectId: string;
};

export function CreateMeetingCard({ projectId }: CreateMeetingCardProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [summary, setSummary] = useState("");
  const [notesMarkdown, setNotesMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    const nextTitle = formData.get("title")?.toString() ?? "";
    const nextMeetingAt = formData.get("meetingAt")?.toString() ?? "";
    const nextSummary = formData.get("summary")?.toString() ?? "";
    const nextNotesMarkdown = formData.get("notesMarkdown")?.toString() ?? "";

    setError(null);

    if (!nextTitle.trim()) {
      setError("Enter a meeting title.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: nextTitle.trim(),
          meetingAt: nextMeetingAt || undefined,
          summary: nextSummary.trim() || undefined,
          notesMarkdown: nextNotesMarkdown.trim() || undefined,
        }),
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        setError(result.error || "Meeting capture failed");
        return;
      }

      setTitle("");
      setMeetingAt("");
      setSummary("");
      setNotesMarkdown("");
      router.refresh();
    });
  }

  return (
    <section className="card">
      <h2>Capture meeting</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Log the meeting outcome so decisions and follow-up stay tied to the project room.
      </p>
      <form action={onSubmit} className="form-grid">
        <label className="field">
          <span className="field-label">Meeting title</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Weekly launch sync"
          />
        </label>
        <label className="field">
          <span className="field-label">Meeting time</span>
          <input
            name="meetingAt"
            type="datetime-local"
            value={meetingAt}
            onChange={(event) => setMeetingAt(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Summary</span>
          <textarea
            name="summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            placeholder="Short readout of what changed, what is blocked, and what moves next."
          />
        </label>
        <label className="field">
          <span className="field-label">Notes</span>
          <textarea
            name="notesMarkdown"
            value={notesMarkdown}
            onChange={(event) => setNotesMarkdown(event.target.value)}
            rows={5}
            placeholder="Optional detailed notes or transcript excerpt."
          />
        </label>
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save meeting"}
        </button>
      </form>
    </section>
  );
}
