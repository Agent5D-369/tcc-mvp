"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readApiResult } from "../../../../lib/read-api-result";
import { useWorkspaceFeedback } from "../workspace-feedback";

type TemplateApplyButtonProps = {
  templateId: string;
  tenantSlug: string;
  workspaceSlug: string;
};

export function TemplateApplyButton({ templateId, tenantSlug, workspaceSlug }: TemplateApplyButtonProps) {
  const router = useRouter();
  const { pushToast } = useWorkspaceFeedback();
  const [isApplying, setIsApplying] = useState(false);

  async function applyTemplate() {
    setIsApplying(true);
    const response = await fetch("/api/templates/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ templateId }),
    });

    const { data, error } = await readApiResult(response);
    setIsApplying(false);

    if (!response.ok) {
      pushToast(error || "Could not apply template", "error");
      return;
    }

    pushToast("Template project created");
    router.push(`/${tenantSlug}/${workspaceSlug}/projects/${data.project.slug}`);
    router.refresh();
  }

  return (
    <button className="button-primary" type="button" disabled={isApplying} onClick={applyTemplate}>
      {isApplying ? "Creating..." : "Use template"}
    </button>
  );
}
