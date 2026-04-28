"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type FeedbackTone = "success" | "error";

type FeedbackToast = {
  id: number;
  message: string;
  tone: FeedbackTone;
};

type WorkspaceFeedbackValue = {
  pushToast: (message: string, tone?: FeedbackTone) => void;
};

const WorkspaceFeedbackContext = createContext<WorkspaceFeedbackValue | null>(null);

export function WorkspaceFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<FeedbackToast[]>([]);
  const nextId = useRef(1);

  const pushToast = useCallback((message: string, tone: FeedbackTone = "success") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <WorkspaceFeedbackContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={toast.tone === "error" ? "toast toast-error" : "toast toast-success"}>
            {toast.message}
          </div>
        ))}
      </div>
    </WorkspaceFeedbackContext.Provider>
  );
}

export function useWorkspaceFeedback() {
  const context = useContext(WorkspaceFeedbackContext);

  if (!context) {
    throw new Error("useWorkspaceFeedback must be used inside WorkspaceFeedbackProvider");
  }

  return context;
}
