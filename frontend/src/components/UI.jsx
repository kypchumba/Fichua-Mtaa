import { useState } from "react";
import { Link } from "react-router-dom";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function StatusBadge({ status }) {
  return (
    <span className={`status status-${status?.toLowerCase()}`}>
      {status?.replace("_", " ")}
    </span>
  );
}
export function Alert({ children, kind = "error" }) {
  return children ? (
    <div role="alert" className={`alert alert-${kind}`}>
      {children}
    </div>
  ) : null;
}
export function Spinner({ label = "Loading" }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label}…
    </div>
  );
}
export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <div className="empty-mark" aria-hidden="true">
        ○
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action && (
        <Link className="button button-primary" to={action.to}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
export function Field({
  label,
  error,
  hint,
  required = false,
  as,
  showPasswordToggle = false,
  passwordLabel = "password",
  ...props
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const id = props.id || props.name;
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required"> *</span>}
      </label>
      {as === "textarea" ? (
        <textarea
          {...props}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
      ) : as === "select" ? (
        <select
          {...props}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
      ) : showPasswordToggle && props.type === "password" ? (
        <div className="password-input-wrap">
          <input
            {...props}
            id={id}
            type={passwordVisible ? "text" : "password"}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
          />
          <button
            className="password-toggle"
            type="button"
            aria-label={`${passwordVisible ? "Hide" : "Show"} ${passwordLabel}`}
            aria-pressed={passwordVisible}
            aria-controls={id}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                <path d="M9.9 5.2A10.7 10.7 0 0112 5c6.2 0 9.5 7 9.5 7a14 14 0 01-3.2 4.1M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.3 7 9.5 7a9.8 9.8 0 003-.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M2.5 12s3.3-7 9.5-7 9.5 7 9.5 7-3.3 7-9.5 7-9.5-7-9.5-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        <input
          {...props}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small id={`${id}-error`} className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
