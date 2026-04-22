"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../lib/read-api-result";

export function OnboardingSetupCard() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Ops Command");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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

    const { data, error: requestError } = await readApiResult(response);
    setIsSaving(false);

    if (!response.ok) {
      setError(requestError || "Could not create your workspace");
      return;
    }

    router.push(data?.url || "/");
    router.refresh();
  }

  return (
    <section className="card onboarding-card">
      <div className="section-heading">
        <div>
          <div className="kicker">First workspace</div>
          <h2 className="section-title">Create the first organization space</h2>
        </div>
        <p className="empty-note">Start with the smallest useful setup: one organization and one workspace.</p>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          <span className="field-label">Organization name</span>
          <input
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
            placeholder="QuickLaunch Consulting"
            required
          />
        </label>

        <label>
          <span className="field-label">First workspace</span>
          <input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Ops Command"
            required
          />
        </label>

        <button
          className="inline-quiet-button"
          type="button"
          onClick={() => setShowDetails((current) => !current)}
        >
          {showDetails ? "Hide details" : "Add details"}
        </button>

        {showDetails ? (
          <label>
            <span className="field-label">Workspace description</span>
            <textarea
              value={workspaceDescription}
              onChange={(event) => setWorkspaceDescription(event.target.value)}
              placeholder="What this workspace is for and how the team will use it."
              rows={4}
            />
          </label>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <button className="button-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Creating workspace..." : "Create workspace"}
        </button>
      </form>
    </section>
  );
}
