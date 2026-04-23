"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type ThreadMessagePanelProps = {
  threadId: string;
  messages: Array<{
    id: string;
    role: string;
    authorType: string;
    content: string;
    createdAt: string;
  }>;
};

export function ThreadMessagePanel({ threadId, messages }: ThreadMessagePanelProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState<"update" | "assistant" | null>(null);

  async function submitMessage(generateReply: boolean) {
    if (!content.trim()) {
      return;
    }

    setIsPosting(generateReply ? "assistant" : "update");
    const response = await fetch(`/api/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        generateReply,
      }),
    });

    const { error } = await readApiResult(response);
    setIsPosting(null);

    if (!response.ok) {
      pushToast(error || "Could not post to the thread", "error");
      return;
    }

    setContent("");
    pushToast(generateReply ? "AI response added" : "Update posted");
    router.refresh();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(false);
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="kicker">Thread activity</div>
          <h2 className="section-title">Review updates and add the next message</h2>
        </div>
        <p className="empty-note">Post human updates by default. Ask AI only when a synthesis or draft is actually faster.</p>
      </div>

      <div className="thread-message-list">
        {messages.length ? (
          messages.map((message) => (
            <article
              key={message.id}
              className={message.role === "assistant" ? "thread-message thread-message-assistant" : "thread-message"}
            >
              <div className="meta-row">
                <span className="badge badge-neutral">{message.role}</span>
                <span className="muted">{new Date(message.createdAt).toLocaleString()}</span>
              </div>
              <p className="thread-message-content">{message.content}</p>
            </article>
          ))
        ) : (
          <p className="empty-note">No messages yet. Post the first update to establish the thread context.</p>
        )}
      </div>

      <form className="form-grid thread-compose-form" onSubmit={onSubmit}>
        <label>
          <span className="field-label">Next message</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={5}
            placeholder="Write the blocker, decision, or update clearly enough that someone joining later can act on it."
          />
        </label>

        <div className="hero-actions">
          <button className="button-primary" type="submit" disabled={!content.trim() || isPosting !== null}>
            {isPosting === "update" ? "Posting..." : "Post update"}
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={!content.trim() || isPosting !== null}
            onClick={() => void submitMessage(true)}
          >
            {isPosting === "assistant" ? "Asking AI..." : "Ask AI for synthesis"}
          </button>
        </div>
      </form>
    </section>
  );
}
