"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type WorkspaceDeleteButtonProps = {
  workspaceId: string;
  workspaceName: string;
  disabled: boolean;
};

export function WorkspaceDeleteButton({ workspaceId, workspaceName, disabled }: WorkspaceDeleteButtonProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteWorkspace() {
    setIsDeleting(true);
    const response = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "DELETE",
    });
    const { error } = await readApiResult(response);
    setIsDeleting(false);

    if (!response.ok) {
      pushToast(error || "Could not delete workspace", "error");
      return;
    }

    pushToast("Workspace deleted");
    setIsOpen(false);
    router.refresh();
  }

  if (disabled) {
    return (
      <button className="button-secondary inline-quiet-button" type="button" disabled>
        Current workspace
      </button>
    );
  }

  if (!isOpen) {
    return (
      <button className="button-danger inline-quiet-button" type="button" onClick={() => setIsOpen(true)}>
        Delete
      </button>
    );
  }

  return (
    <div className="danger-confirmation">
      <p className="empty-note">This permanently removes this workspace and its scoped projects, tasks, meetings, decisions, approvals, and memory.</p>
      <label className="field">
        <span className="field-label">Type the workspace name to confirm</span>
        <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      </label>
      <div className="meta-row">
        <button
          className="button-danger"
          type="button"
          disabled={confirmation !== workspaceName || isDeleting}
          onClick={deleteWorkspace}
        >
          {isDeleting ? "Deleting..." : "Delete workspace"}
        </button>
        <button className="button-secondary inline-quiet-button" type="button" onClick={() => setIsOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
