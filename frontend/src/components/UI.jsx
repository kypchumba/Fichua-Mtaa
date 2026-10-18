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
export function Field({ label, error, hint, required = false, as, ...props }) {
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
