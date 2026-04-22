"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function slugifyProjectName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type CreateProjectCardProps = {
  tenantSlug: string;
  workspaceSlug: string;
  embedded?: boolean;
};

export function CreateProjectCard({ tenantSlug, workspaceSlug, embedded = false }: CreateProjectCardProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const slug = useMemo(() => slugifyProjectName(name), [name]);

  async function onSubmit(formData: FormData) {
    const nextName = formData.get("name")?.toString() ?? "";
    const nextSummary = formData.get("summary")?.toString() ?? "";
    const nextSlug = slugifyProjectName(nextName);

    setError(null);

    if (!nextName.trim() || !nextSlug) {
      setError("Enter a project name to create the room.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nextName.trim(),
          slug: nextSlug,
          summary: nextSummary.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Project creation failed");
        return;
      }

      setName("");
      setSummary("");
      router.push(`/${tenantSlug}/${workspaceSlug}/projects/${result.project.slug}`);
      router.refresh();
    });
  }

  const content = (
    <>
      <h2>Create project room</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Open a new project room for an initiative, rollout, or client engagement.
      </p>
      <form action={onSubmit} className="form-grid">
        <label className="field">
          <span className="field-label">Project name</span>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Q2 Client Onboarding"
          />
        </label>
        <label className="field">
          <span className="field-label">Slug preview</span>
          <input value={slug || "generated-from-name"} readOnly />
        </label>
        <label className="field">
          <span className="field-label">Summary</span>
          <textarea
            name="summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Short execution brief for the team."
            rows={4}
          />
        </label>
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create project"}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return <div className="embedded-form">{content}</div>;
  }

  return <section className="card">{content}</section>;
}
