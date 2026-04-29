"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../../workspace-feedback";

type Agent = {
  id: string;
  workspaceId: string | null;
  name: string;
  role: string;
  description: string | null;
  systemPrompt: string;
  surfaces: string[];
  isActive: boolean;
  isSystem: boolean;
  updatedAt: string;
};

type AgentLibraryCardProps = {
  initialAgents: Agent[];
  canManage: boolean;
};

const surfaceOptions = [
  { value: "capture", label: "Capture" },
  { value: "thread", label: "Threads" },
  { value: "meeting", label: "Meetings" },
  { value: "project", label: "Projects" },
  { value: "task", label: "Tasks" },
  { value: "memory", label: "Memory" },
];

const defaultPrompt = [
  "# Mission",
  "Turn messy operational context into clear, source-backed proposals.",
  "",
  "# Rules",
  "- Preserve uncertainty.",
  "- Do not invent owners, dates, or facts.",
  "- Prefer concise outputs that can become approval inbox proposals.",
  "- Include evidence when making a recommendation.",
].join("\n");

export function AgentLibraryCard({ initialAgents, canManage }: AgentLibraryCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Operations analyst");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(defaultPrompt);
  const [surfaces, setSurfaces] = useState<string[]>(["thread", "capture"]);
  const [scope, setScope] = useState<"workspace" | "tenant">("workspace");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const activeAgent = useMemo(
    () => initialAgents.find((agent) => agent.id === editingId) ?? null,
    [editingId, initialAgents],
  );

  function editAgent(agent: Agent) {
    setEditingId(agent.id);
    setName(agent.name);
    setRole(agent.role);
    setDescription(agent.description ?? "");
    setSystemPrompt(agent.systemPrompt);
    setSurfaces(agent.surfaces.length ? agent.surfaces : ["thread"]);
    setScope(agent.workspaceId ? "workspace" : "tenant");
    setIsActive(agent.isActive);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setRole("Operations analyst");
    setDescription("");
    setSystemPrompt(defaultPrompt);
    setSurfaces(["thread", "capture"]);
    setScope("workspace");
    setIsActive(true);
  }

  function toggleSurface(value: string) {
    setSurfaces((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch(editingId ? `/api/agents/${editingId}` : "/api/agents", {
      method: editingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        role,
        description,
        systemPrompt,
        surfaces,
        scope,
        isActive,
      }),
    });

    const { error } = await readApiResult(response);
    setIsSaving(false);

    if (!response.ok) {
      pushToast(error || "Could not save the agent", "error");
      return;
    }

    pushToast(editingId ? "Agent updated" : "Agent created");
    resetForm();
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="kicker">Agent MD library</div>
          <h2 className="section-title">Create and tune reusable agents</h2>
        </div>
        <span className="badge badge-neutral">{initialAgents.length} agent{initialAgents.length === 1 ? "" : "s"}</span>
      </div>

      <div className="admin-record-list">
        {initialAgents.length ? initialAgents.map((agent) => (
          <article key={agent.id} className="record-card compact-record-card">
            <div className="record-card-copy">
              <div className="meta-row">
                <strong>{agent.name}</strong>
                <span className={agent.isActive ? "badge badge-success" : "badge badge-neutral"}>
                  {agent.isActive ? "active" : "inactive"}
                </span>
                <span className="badge badge-neutral">{agent.workspaceId ? "workspace" : "tenant"}</span>
              </div>
              <p className="entity-preview">{agent.description || agent.role}</p>
              <div className="entity-summary-meta">
                <span>{agent.surfaces.join(", ") || "thread"}</span>
                <span>Updated {new Date(agent.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="record-card-actions">
              <button className="button-secondary" type="button" disabled={!canManage || agent.isSystem} onClick={() => editAgent(agent)}>
                Edit
              </button>
            </div>
          </article>
        )) : (
          <p className="empty-note">No custom agents yet. Create the first focused agent below.</p>
        )}
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <div className="section-heading">
          <div>
            <div className="kicker">{activeAgent ? "Edit agent" : "New agent"}</div>
            <h2 className="section-title">{activeAgent?.name || "Define an agent"}</h2>
          </div>
          {editingId ? (
            <button className="button-secondary" type="button" onClick={resetForm}>
              New agent
            </button>
          ) : null}
        </div>

        <label>
          <span className="field-label">Agent name</span>
          <input value={name} disabled={!canManage} onChange={(event) => setName(event.target.value)} placeholder="Decision Extractor" required />
        </label>

        <label>
          <span className="field-label">Role</span>
          <input value={role} disabled={!canManage} onChange={(event) => setRole(event.target.value)} placeholder="Operations analyst" required />
        </label>

        <label>
          <span className="field-label">Description</span>
          <input value={description} disabled={!canManage} onChange={(event) => setDescription(event.target.value)} placeholder="Best for extracting decisions and next steps from meeting notes." />
        </label>

        <label>
          <span className="field-label">Scope</span>
          <select value={scope} disabled={!canManage || Boolean(editingId)} onChange={(event) => setScope(event.target.value as typeof scope)}>
            <option value="workspace">Current workspace</option>
            <option value="tenant">Entire tenant</option>
          </select>
        </label>

        <fieldset className="form-grid">
          <legend className="field-label">Available surfaces</legend>
          <div className="meta-row">
            {surfaceOptions.map((surface) => (
              <label key={surface.value} className="checkbox-row">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={surfaces.includes(surface.value)}
                  onChange={() => toggleSurface(surface.value)}
                />
                <span>{surface.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="textarea-field">
          <span className="field-label">Agent Markdown</span>
          <textarea value={systemPrompt} disabled={!canManage} rows={12} onChange={(event) => setSystemPrompt(event.target.value)} required />
        </label>

        <label className="checkbox-row">
          <input type="checkbox" disabled={!canManage} checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          <span>Show this agent in eligible pickers</span>
        </label>

        {!canManage ? <p className="form-error">Only owners and admins can manage agents.</p> : null}

        <button className="button-primary" type="submit" disabled={!canManage || !surfaces.length || isSaving}>
          {isSaving ? "Saving..." : editingId ? "Update agent" : "Create agent"}
        </button>
      </form>
    </section>
  );
}
