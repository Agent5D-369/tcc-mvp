"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../../workspace-feedback";

type AiSettingsData = {
  settings: {
    mode: "managed" | "byo_key" | "disabled";
    provider: "openrouter";
    defaultModel: string;
    monthlyBudgetCents: number;
    maxOutputTokens: number;
  };
  providerKey: {
    provider: string;
    keyHint: string | null;
    status: string;
    updatedAt: string;
  } | null;
  usage: {
    monthlyBudgetCents: number;
    costCents: number;
    inputTokens: number;
    outputTokens: number;
  };
};

type AiSettingsCardProps = {
  initialData: AiSettingsData;
  canManage: boolean;
};

const suggestedModels = [
  { value: "openai/gpt-4.1-mini", label: "OpenAI GPT-4.1 Mini" },
  { value: "google/gemini-2.0-flash-lite-001", label: "Gemini Flash Lite" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude Haiku" },
];

export function AiSettingsCard({ initialData, canManage }: AiSettingsCardProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [mode, setMode] = useState(initialData.settings.mode);
  const [defaultModel, setDefaultModel] = useState(initialData.settings.defaultModel);
  const [monthlyBudgetDollars, setMonthlyBudgetDollars] = useState((initialData.settings.monthlyBudgetCents / 100).toFixed(2));
  const [maxOutputTokens, setMaxOutputTokens] = useState(String(initialData.settings.maxOutputTokens));
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch("/api/ai-settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        defaultModel,
        monthlyBudgetCents: Math.round(Number(monthlyBudgetDollars || "0") * 100),
        maxOutputTokens: Number(maxOutputTokens || "0"),
        openRouterApiKey: openRouterApiKey.trim() || undefined,
      }),
    });

    const { error } = await readApiResult(response);
    setIsSaving(false);

    if (!response.ok) {
      pushToast(error || "Could not save AI settings", "error");
      return;
    }

    pushToast("AI settings saved");
    setOpenRouterApiKey("");
    router.refresh();
  }

  const budgetUsed = initialData.usage.monthlyBudgetCents > 0
    ? Math.min(100, Math.round((initialData.usage.costCents / initialData.usage.monthlyBudgetCents) * 100))
    : 0;

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <div className="kicker">Tenant AI control</div>
          <h2 className="section-title">Choose how this tenant pays for AI</h2>
        </div>
        <span className={mode === "disabled" ? "badge badge-danger" : "badge badge-success"}>
          {mode === "managed" ? "Managed" : mode === "byo_key" ? "BYO key" : "Disabled"}
        </span>
      </div>

      <div className="list">
        <div className="list-row">
          <strong>Estimated usage this month</strong>
          <div className="muted">
            ${(initialData.usage.costCents / 100).toFixed(2)} of ${(initialData.usage.monthlyBudgetCents / 100).toFixed(2)} tracked ({budgetUsed}%)
          </div>
        </div>
        <div className="list-row">
          <strong>Token activity</strong>
          <div className="muted">{initialData.usage.inputTokens} input / {initialData.usage.outputTokens} output tokens logged</div>
        </div>
        <div className="list-row">
          <strong>OpenRouter key</strong>
          <div className="muted">
            {initialData.providerKey ? `${initialData.providerKey.status}: ${initialData.providerKey.keyHint}` : "No tenant-owned key saved"}
          </div>
        </div>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          <span className="field-label">AI mode</span>
          <select value={mode} disabled={!canManage} onChange={(event) => setMode(event.target.value as typeof mode)}>
            <option value="managed">QuickLaunch-managed AI</option>
            <option value="byo_key">Bring your own OpenRouter key</option>
            <option value="disabled">Disable tenant AI</option>
          </select>
        </label>

        <label>
          <span className="field-label">Default model</span>
          <input
            list="suggested-ai-models"
            value={defaultModel}
            disabled={!canManage}
            onChange={(event) => setDefaultModel(event.target.value)}
            placeholder="openai/gpt-4.1-mini"
            required
          />
          <datalist id="suggested-ai-models">
            {suggestedModels.map((model) => (
              <option key={model.value} value={model.value}>{model.label}</option>
            ))}
          </datalist>
        </label>

        <label>
          <span className="field-label">Monthly AI budget stop</span>
          <input
            value={monthlyBudgetDollars}
            disabled={!canManage}
            onChange={(event) => setMonthlyBudgetDollars(event.target.value)}
            inputMode="decimal"
            placeholder="5.00"
          />
        </label>

        <label>
          <span className="field-label">Max output tokens per run</span>
          <input
            value={maxOutputTokens}
            disabled={!canManage}
            onChange={(event) => setMaxOutputTokens(event.target.value)}
            inputMode="numeric"
            placeholder="1200"
          />
        </label>

        <label>
          <span className="field-label">OpenRouter API key</span>
          <input
            value={openRouterApiKey}
            disabled={!canManage}
            onChange={(event) => setOpenRouterApiKey(event.target.value)}
            type="password"
            placeholder={initialData.providerKey ? "Leave blank to keep saved key" : "sk-or-..."}
            autoComplete="off"
          />
        </label>

        {!canManage ? <p className="form-error">Only owners and admins can change AI settings.</p> : null}
        {canManage ? (
          <p className="empty-note">
            TCC enforces this as an app-side stop when provider cost is logged. Max output tokens are the immediate per-run safety rail.
          </p>
        ) : null}

        <button className="button-primary" type="submit" disabled={!canManage || isSaving}>
          {isSaving ? "Saving..." : "Save AI settings"}
        </button>
      </form>
    </section>
  );
}
