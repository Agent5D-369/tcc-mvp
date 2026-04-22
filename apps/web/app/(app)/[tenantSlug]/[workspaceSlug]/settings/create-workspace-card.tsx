"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type CreateWorkspaceCardProps = {
  canManage: boolean;
};

export function CreateWorkspaceCard({ canManage }: CreateWorkspaceCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!canManage) {
    return (
      <section className="card">
        <h2>Create workspace</h2>
        <p className="empty-note">Only owners and admins can create additional workspaces in this tenant.</p>
      </section>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceName,
        workspaceDescription: showDetails ? workspaceDescription : undefined,
      }),
    });

    const { data, error } = await readApiResult(response);
    setIsSaving(false);

    if (!response.ok) {
      pushToast(error || "Could not create the workspace", "error");
      return;
    }

    pushToast("Workspace created");
    router.push(data?.url || "/");
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="kicker">Tenant growth</div>
          <h2 className="section-title">Create another workspace</h2>
        </div>
        <p className="empty-note">Keep the structure light. Create a new workspace only when the work truly needs a separate operating surface.</p>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          <span className="field-label">Workspace name</span>
          <input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Delivery Command"
            required
          />
        </label>

        <button className="inline-quiet-button" type="button" onClick={() => setShowDetails((current) => !current)}>
          {showDetails ? "Hide details" : "Add details"}
        </button>

        {showDetails ? (
          <label>
            <span className="field-label">Workspace description</span>
            <textarea
              value={workspaceDescription}
              onChange={(event) => setWorkspaceDescription(event.target.value)}
              rows={3}
              placeholder="What this workspace owns and what the team should run here."
            />
          </label>
        ) : null}

        <button className="button-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Creating..." : "Create workspace"}
        </button>
      </form>
    </section>
  );
}
