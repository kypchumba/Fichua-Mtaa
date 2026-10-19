import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignOutControl({ className = "" }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const loadingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  loadingRef.current = loading;

  useEffect(() => {
    if (!open) return undefined;

    dialogRef.current?.querySelector("button")?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape" && !loadingRef.current) {
        event.preventDefault();
        setOpen(false);
        setError("");
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const controls = Array.from(
        dialogRef.current.querySelectorAll("button:not([disabled])"),
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
    };
  }, [open]);

  async function confirmSignOut() {
    if (loadingRef.current) return;
    setLoading(true);
    setError("");
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Could not sign out. Please try again.");
      setLoading(false);
    }
  }

  function cancelSignOut() {
    if (loadingRef.current) return;
    setOpen(false);
    setError("");
  }

  return (
    <>
      <button
        className={className}
        onClick={(event) => {
          triggerRef.current = event.currentTarget;
          setOpen(true);
          setError("");
        }}
        type="button"
      >
        Sign out
      </button>
      {open && (
        <div className="signout-backdrop">
          <section
            aria-describedby="signout-description"
            aria-labelledby="signout-title"
            aria-modal="true"
            className="signout-dialog"
            ref={dialogRef}
            role="dialog"
          >
            <span className="eyebrow">ACCOUNT</span>
            <h2 id="signout-title">Sign out?</h2>
            <p id="signout-description">
              You will need to sign in again to access your account.
            </p>
            {error && (
              <p className="signout-error" role="alert">
                {error}
              </p>
            )}
            <div className="signout-actions">
              <button
                className="button button-outline"
                disabled={loading}
                onClick={cancelSignOut}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={loading}
                onClick={confirmSignOut}
                type="button"
              >
                {loading ? "Signing out…" : "OK"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
