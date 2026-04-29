"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type CreateTenantCardProps = {
  canCreateTenant: boolean;
};

export function CreateTenantCard({ canCreateTenant }: CreateTenantCardProps) {
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
        <p className="empty-note">
          Standard signup creates one organization. Platform admins can create extra tenant boundaries for demos or managed rollouts.
        </p>
      </div>

      {!canCreateTenant ? (
        <p className="form-error">Tenant creation is locked for standard accounts. Add workspaces inside the current tenant as the subscription allows.</p>
      ) : null}

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          <span className="field-label">Organization name</span>
          <input
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
            placeholder="Client Success"
            required
            disabled={!canCreateTenant}
          />
        </label>

        <label>
          <span className="field-label">Initial workspace</span>
          <input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Ops Command"
            required
            disabled={!canCreateTenant}
          />
        </label>

        <button className="inline-quiet-button" type="button" disabled={!canCreateTenant} onClick={() => setShowDetails((current) => !current)}>
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
              disabled={!canCreateTenant}
            />
          </label>
        ) : null}

        <button className="button-primary" type="submit" disabled={isSaving || !canCreateTenant}>
          {isSaving ? "Creating..." : canCreateTenant ? "Create organization" : "Tenant creation locked"}
        </button>
      </form>
    </section>
  );
}
