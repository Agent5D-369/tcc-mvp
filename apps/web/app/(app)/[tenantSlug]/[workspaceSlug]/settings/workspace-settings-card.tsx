"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type WorkspaceSettingsCardProps = {
  workspaceId: string;
  workspaceName: string;
  workspaceDescription: string | null;
  canManage: boolean;
};

export function WorkspaceSettingsCard({
  workspaceId,
  workspaceName,
  workspaceDescription,
  canManage,
}: WorkspaceSettingsCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(workspaceName);
  const [description, setDescription] = useState(workspaceDescription ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceName: name,
        workspaceDescription: description || undefined,
      }),
    });

    const { data, error } = await readApiResult(response);
    setIsSaving(false);

    if (!response.ok) {
      pushToast(error || "Could not update the workspace", "error");
      return;
    }

    pushToast("Workspace updated");
    setIsEditing(false);
    router.push(data?.url || "/");
    router.refresh();
  }

  if (!canManage) {
    return (
      <section className="card">
        <div className="section-heading">
          <div>
            <div className="kicker">Workspace details</div>
            <h2 className="section-title">{workspaceName}</h2>
          </div>
          <p className="empty-note">Only owners and admins can rename this workspace.</p>
        </div>
        <p className="empty-note">{workspaceDescription || "No workspace description yet."}</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="kicker">Workspace details</div>
          <h2 className="section-title">{workspaceName}</h2>
        </div>
        <div className="meta-row">
          <button className="button-secondary" type="button" onClick={() => setIsEditing((current) => !current)}>
            {isEditing ? "Close editor" : "Edit workspace"}
          </button>
        </div>
      </div>

      <p className="empty-note">{workspaceDescription || "No workspace description yet."}</p>

      {isEditing ? (
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            <span className="field-label">Workspace name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ops Command"
              required
            />
          </label>

          <label>
            <span className="field-label">Workspace description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What this workspace owns and what the team should run here."
            />
          </label>

          <button className="button-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save workspace"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
