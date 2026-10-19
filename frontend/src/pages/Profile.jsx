import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();
  const deleteButtonRef = useRef(null);
  const modalRef = useRef(null);
  const loadingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [finalStep, setFinalStep] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  loadingRef.current = loading;

  function closeModal() {
    if (loadingRef.current) return;
    setOpen(false);
    setFinalStep(false);
    setConfirmation("");
    setPassword("");
    setError("");
  }

  useEffect(() => {
    if (!open) return undefined;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFirstControl = () => {
      const selector = finalStep ? "input" : "button";
      modalRef.current?.querySelector(selector)?.focus();
    };
    focusFirstControl();

    function handleKeyDown(event) {
      if (event.key === "Escape" && !loadingRef.current) {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;

      const controls = Array.from(
        modalRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), a[href]',
        ),
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
      document.body.style.overflow = oldOverflow;
      if (deleteButtonRef.current) deleteButtonRef.current.focus();
    };
  }, [open, finalStep]);

  async function submitDeletion(event) {
    event.preventDefault();
    if (confirmation !== "DELETE") {
      setError("Type DELETE exactly as shown to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await deleteAccount({ password, confirmation });
      navigate("/", {
        replace: true,
        state: { accountDeleted: true },
      });
    } catch (requestError) {
      setError(requestError.message || "Account deletion could not be completed.");
      setLoading(false);
    }
  }

  async function signOut() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <section className="page-wrap profile-page">
      <span className="eyebrow">ACCOUNT</span>
      <h1 className="page-title">Your profile</h1>
      <p className="page-intro">
        Account details associated with your Fichua Mtaa citizen profile.
      </p>

      <dl className="profile-details">
        <div>
          <dt>Full name</dt>
          <dd>{user.fullName}</dd>
        </div>
        <div>
          <dt>Email address</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Account type</dt>
          <dd>Citizen</dd>
        </div>
      </dl>

      <Link className="button button-outline" to="/dashboard">
        Return to dashboard
      </Link>

      <div className="profile-danger-zone">
        <h2>Account options</h2>
        <p>Deleting your account permanently removes your profile and reports.</p>
        <div className="profile-account-actions">
          <button className="button button-outline" onClick={signOut} type="button">
            Sign out
          </button>
          <button
            className="button button-danger-outline"
            onClick={() => {
              deleteButtonRef.current = document.activeElement;
              setOpen(true);
            }}
            type="button"
          >
            Delete Account
          </button>
        </div>
      </div>

      {open && (
        <div className="account-delete-backdrop">
          <section
            aria-labelledby="account-delete-title"
            aria-modal="true"
            className="account-delete-dialog"
            ref={modalRef}
            role="dialog"
          >
            {!finalStep ? (
              <>
                <span className="eyebrow">ACCOUNT SECURITY</span>
                <h2 id="account-delete-title">Permanently delete your account?</h2>
                <p>
                  This action is permanent and irreversible. Your account,
                  profile information, submitted reports, and associated
                  user-owned records will be deleted from the database.
                </p>
                <p className="account-delete-alternative">
                  Having an issue with something? Before deleting your account,
                  consider contacting the system administrator for assistance.
                </p>
                <div className="account-delete-actions">
                  <button
                    className="button button-outline"
                    onClick={closeModal}
                    type="button"
                  >
                    Cancel
                  </button>
                  <a
                    aria-label="Contact the system administrator"
                    className="button button-outline account-delete-contact"
                    href="https://kypchumba.github.io/#get-in-touch"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Contact
                  </a>
                  <button
                    className="button button-danger"
                    onClick={() => setFinalStep(true)}
                    type="button"
                  >
                    Continue Delete
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={submitDeletion}>
                <span className="eyebrow">FINAL CONFIRMATION</span>
                <h2 id="account-delete-title">This cannot be undone</h2>
                <p>
                  Re-enter your password and type <strong>DELETE</strong> to
                  permanently remove this account and its reports.
                </p>
                <label className="account-delete-field">
                  Account password
                  <input
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                </label>
                <label className="account-delete-field">
                  Type DELETE to confirm
                  <input
                    autoComplete="off"
                    onChange={(event) => setConfirmation(event.target.value)}
                    required
                    value={confirmation}
                  />
                </label>
                {error && (
                  <p className="account-delete-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="account-delete-actions">
                  <button
                    className="button button-outline"
                    disabled={loading}
                    onClick={() => {
                      setFinalStep(false);
                      setError("");
                    }}
                    type="button"
                  >
                    Back
                  </button>
                  <button
                    className="button button-danger"
                    disabled={
                      loading || confirmation !== "DELETE" || !password
                    }
                    type="submit"
                  >
                    {loading ? "Deleting account…" : "Permanently delete account"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
