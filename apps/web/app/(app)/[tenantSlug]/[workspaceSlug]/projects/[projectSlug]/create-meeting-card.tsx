"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../../workspace-feedback";

type CreateMeetingCardProps = {
  projectId: string;
  embedded?: boolean;
};

export function CreateMeetingCard({ projectId, embedded = false }: CreateMeetingCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [title, setTitle] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [summary, setSummary] = useState("");
  const [notesMarkdown, setNotesMarkdown] = useState("");
  const [showDetails, setShowDetails] = useState(false);
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
        const message = result.error || "Meeting capture failed";
        setError(message);
        pushToast(message, "error");
        return;
      }

      pushToast(`Saved meeting "${nextTitle.trim()}".`);
      setTitle("");
      setMeetingAt("");
      setSummary("");
      setNotesMarkdown("");
      setShowDetails(false);
      router.refresh();
    });
  }

  const content = (
    <>
      <h2>Capture meeting</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Start with the meeting title and short outcome. Add time or notes only if they are useful right now.
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
          <span className="field-label">Summary</span>
          <textarea
            name="summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            placeholder="Short readout of what changed, what is blocked, and what moves next."
          />
        </label>
        <div className="field-hint-row">
          <span className="muted">Detailed notes are optional.</span>
          <button type="button" className="button-secondary inline-quiet-button" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? "Hide details" : "Add details"}
          </button>
        </div>
        {showDetails ? (
          <>
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
              <span className="field-label">Notes</span>
              <textarea
                name="notesMarkdown"
                value={notesMarkdown}
                onChange={(event) => setNotesMarkdown(event.target.value)}
                rows={5}
                placeholder="Optional detailed notes or transcript excerpt."
              />
            </label>
          </>
        ) : null}
        {error ? <p className="feedback-banner feedback-error">{error}</p> : null}
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save meeting"}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return <div className="embedded-form">{content}</div>;
  }

  return <section className="card">{content}</section>;
}
