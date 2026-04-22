"use client";

import { useRouter } from "next/navigation";

type WorkspaceSwitcherProps = {
  value: string;
  options: Array<{
    tenantSlug: string;
    tenantName: string;
    workspaceSlug: string;
    workspaceName: string;
    role: string;
  }>;
};

export function WorkspaceSwitcher({ value, options }: WorkspaceSwitcherProps) {
  const router = useRouter();

  return (
    <label className="workspace-switcher">
      <span className="field-label">Workspace</span>
      <select
        aria-label="Switch workspace"
        value={value}
        onChange={(event) => router.push(event.target.value)}
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
