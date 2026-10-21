import { useEffect } from "react";

// A short-lived, accessible notice for completed administrator actions.
export function FlashToast({ notification, onDismiss }) {
  useEffect(() => {
    if (!notification) return undefined;

    const timer = window.setTimeout(onDismiss, 2000);
    return () => window.clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isError = notification.kind === "error";

  return (
    <div className="flash-toast-region" aria-live={isError ? "assertive" : "polite"}>
      <div
        className={`flash-toast flash-toast-${isError ? "error" : "success"}`}
        role={isError ? "alert" : "status"}
        aria-atomic="true"
      >
        <span className="flash-toast-mark" aria-hidden="true">
          {isError ? "!" : "✓"}
        </span>
        <span className="flash-toast-message">{notification.message}</span>
        <button
          className="flash-toast-dismiss"
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
