"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResult } from "../../../lib/read-api-result";
import { useWorkspaceFeedback } from "./workspace-feedback";

type WorkspaceSwitcherProps = {
  value: string;
  options: Array<{
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    workspaceId: string;
    workspaceSlug: string;
    workspaceName: string;
    role: string;
  }>;
};

export function WorkspaceSwitcher({ value, options }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [pendingValue, setPendingValue] = useState(value);

  async function onSwitch(nextValue: string) {
    const nextOption = options.find((option) => `/${option.tenantSlug}/${option.workspaceSlug}` === nextValue);
    if (!nextOption || nextValue === value) {
      return;
    }

    setPendingValue(nextValue);

    const response = await fetch("/api/active-workspace", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: nextOption.tenantId,
        workspaceId: nextOption.workspaceId,
      }),
    });

    const { error } = await readApiResult(response);

    if (!response.ok) {
      pushToast(error || "Could not switch workspace", "error");
      setPendingValue(value);
      return;
    }

    startTransition(() => {
      router.push(nextValue);
      router.refresh();
    });
  }

  return (
    <label className="workspace-switcher">
      <span className="field-label">Workspace</span>
      <select
        aria-label="Switch workspace"
        value={pendingValue}
        onChange={(event) => void onSwitch(event.target.value)}
      >
        {options.map((option) => (
          <option
            key={`${option.tenantSlug}-${option.workspaceSlug}`}
            value={`/${option.tenantSlug}/${option.workspaceSlug}`}
          >
            {option.tenantName} / {option.workspaceName}
          </option>
        ))}
      </select>
    </label>
  );
}
