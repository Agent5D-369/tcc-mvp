"use client";

import { useState } from "react";
import { CreateProjectCard } from "./create-project-card";

type CreateProjectLauncherProps = {
  tenantSlug: string;
  workspaceSlug: string;
};

export function CreateProjectLauncher({ tenantSlug, workspaceSlug }: CreateProjectLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="card">
      <div className="card-header-row">
        <div>
          <h2>Start something new</h2>
          <p className="empty-note">Open a project room only when you are ready to track real work.</p>
        </div>
        <button
          type="button"
          className={isOpen ? "button-secondary" : "button-primary"}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? "Close" : "Create project"}
        </button>
      </div>
      {isOpen ? <CreateProjectCard tenantSlug={tenantSlug} workspaceSlug={workspaceSlug} embedded /> : null}
    </section>
  );
}
