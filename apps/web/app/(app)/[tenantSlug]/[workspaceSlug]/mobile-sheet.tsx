"use client";

import { type ReactNode, useEffect, useId } from "react";

type MobileSheetProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function MobileSheet({ open, title, description, onClose, children }: MobileSheetProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div className="sheet-header-copy">
            <h2 id={titleId}>{title}</h2>
            {description ? (
              <p id={descriptionId} className="empty-note">
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" className="button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
