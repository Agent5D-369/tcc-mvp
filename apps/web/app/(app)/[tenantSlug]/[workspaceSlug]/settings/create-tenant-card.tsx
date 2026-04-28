"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

export function CreateTenantCard() {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [tenantName, setTenantName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Ops Command");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch("/api/tenants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantName,
        workspaceName,
        workspaceDescription: showDetails ? workspaceDescription : undefined,
      }),
    });

    const { data, error } = await readApiResult(response);
    setIsSaving(false);

    if (!response.ok) {
      pushToast(error || "Could not create the organization", "error");
      return;
    }

    pushToast("Organization created");
    router.push(data?.url || "/");
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="kicker">New organization</div>
          <h2 className="section-title">Start another tenant</h2>
        </div>
        <p className="empty-note">Use this when you need a separate organization boundary, not just another workspace.</p>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          <span className="field-label">Organization name</span>
          <input
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
            placeholder="Client Success"
            required
          />
        </label>

        <label>
          <span className="field-label">Initial workspace</span>
          <input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Ops Command"
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
              placeholder="What this workspace is responsible for."
            />
          </label>
        ) : null}

        <button className="button-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Creating..." : "Create organization"}
        </button>
      </form>
    </section>
  );
}
