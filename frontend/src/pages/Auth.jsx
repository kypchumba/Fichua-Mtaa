import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Field } from "../components/UI";
import { postLoginPath } from "../auth/roles";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRequirements = [
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  {
    label: "At least one uppercase letter",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    label: "At least one lowercase letter",
    test: (value) => /[a-z]/.test(value),
  },
  { label: "At least one number", test: (value) => /\d/.test(value) },
  {
    label: "At least one special character",
    test: (value) => /[^A-Za-z0-9\s]/.test(value),
  },
  {
    label: "No spaces or other whitespace",
    test: (value) => !/\s/.test(value),
  },
];

const REGISTRATION_SUCCESS_DELAY = 1600;

function registrationFailureMessage(error) {
  const message = error?.message || "";
  if (/already exists|already registered|email.*(use|exist)/i.test(message)) {
    return "This email address is already registered. Please sign in or use another email.";
  }
  if (/password/i.test(message) || error?.fields?.password) {
    return "Please correct your password. Use at least 8 characters with uppercase and lowercase letters, a number, a special character and no spaces.";
  }
  if (
    Object.keys(error?.fields || {}).length > 0 ||
    /validation|invalid|missing|must not be blank|required/i.test(message)
  ) {
    return "Some details need correcting. Review the highlighted fields and try again.";
  }
  return "Something went wrong. Please try again.";
}

function validateFields(fields, register) {
  const errors = {};

  if (register && !fields.fullName.trim()) {
    errors.fullName = "Please enter your full name.";
  }

  if (!fields.email.trim()) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL_PATTERN.test(fields.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!fields.password) {
    errors.password = "Please enter your password.";
  } else if (register && fields.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (register && fields.password.length > 72) {
    errors.password = "Password must be 72 characters or fewer.";
  } else if (
    register &&
    passwordRequirements.some(({ test }) => !test(fields.password))
  ) {
    errors.password = "Password must meet all the requirements shown below.";
  }

  if (register && !fields.confirmation) {
    errors.confirmation = "Please confirm your password.";
  } else if (register && fields.password !== fields.confirmation) {
    errors.confirmation = "Your passwords do not match.";
  }

  return errors;
}

export function AuthPage({ register = false }) {
  const { user, login, register: createAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const registrationDialogRef = useRef(null);
  const [fields, setFields] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmation: "",
  });

  useEffect(() => {
    if (!registrationStatus) return undefined;

    const previousFocus = document.activeElement;
    registrationDialogRef.current?.focus();
    if (registrationStatus !== "success") {
      return () => previousFocus?.focus?.();
    }

    const timer = window.setTimeout(() => {
      navigate("/login", {
        replace: true,
        state: {
          returnTo: location.state?.returnTo,
          from: location.state?.from,
          registrationSuccess: true,
        },
      });
    }, REGISTRATION_SUCCESS_DELAY);
    return () => {
      window.clearTimeout(timer);
      previousFocus?.focus?.();
    };
  }, [registrationStatus, navigate, location.state?.from, location.state?.returnTo]);

  useEffect(() => {
    if (!registrationStatus) return undefined;

    function keepFocusInModal(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        return;
      }
      if (event.key !== "Tab" || !registrationDialogRef.current) return;

      const controls = Array.from(
        registrationDialogRef.current.querySelectorAll("button:not([disabled])"),
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!controls.length) {
        event.preventDefault();
        registrationDialogRef.current.focus();
      } else if (!controls.includes(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keepFocusInModal);
    return () => document.removeEventListener("keydown", keepFocusInModal);
  }, [registrationStatus]);
  if (user) {
    return (
      <Navigate
        to={postLoginPath(user.role, location.state?.returnTo)}
        state={{ from: location.state?.from }}
        replace
      />
    );
  }
  const update = (e) =>
    setFields((current) => ({ ...current, [e.target.name]: e.target.value }));
  async function submit(e) {
    if (loading) return;
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const validationErrors = validateFields(fields, register);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setLoading(true);
    if (register) {
      setRegistrationMessage("");
      setRegistrationStatus("loading");
    }
    try {
      if (register) {
        await createAccount({
            fullName: fields.fullName,
            email: fields.email,
            password: fields.password,
            confirmation: fields.confirmation,
          });
        // The login route can reuse this page instance, so discard registration credentials now.
        setFields({ fullName: "", email: "", password: "", confirmation: "" });
        setRegistrationStatus("success");
        setLoading(false);
        return;
      }
      const account = await login({ email: fields.email, password: fields.password });
      navigate(postLoginPath(account.role, location.state?.returnTo), {
        replace: true,
        state: { from: location.state?.from },
      });
    } catch (err) {
      if (register) {
        const safeMessage = registrationFailureMessage(err);
        setRegistrationMessage(safeMessage);
        setRegistrationStatus("error");
        setError(safeMessage);
        setFieldErrors(err.fields || {});
      } else {
        setError(
          err.message || "Unable to complete your request. Please try again.",
        );
        setFieldErrors(err.fields || {});
      }
    } finally {
      setLoading(false);
    }
  }

  function retryRegistration() {
    setRegistrationStatus(null);
    setRegistrationMessage("");
    setError("");
  }
  return (
    <section className="auth-page">
      <div className="auth-aside">
        <span className="eyebrow">COMMUNITY, CONNECTED</span>
        <h1>
          {register
            ? "A better mtaa starts with you."
            : "Welcome back to your community."}
        </h1>
        <p>
          Keep up with local services, raise an issue and stay in the loop as it
          gets resolved.
        </p>
        <div className="aside-note">
          <span>“</span>
          <p>Good communities are built when people feel heard.</p>
        </div>
      </div>
      {register && registrationStatus && (
        <div className="registration-overlay">
          <section
            aria-describedby="registration-feedback-message"
            aria-labelledby="registration-feedback-title"
            aria-live="assertive"
            aria-modal="true"
            aria-busy={registrationStatus === "loading"}
            className={`registration-feedback registration-feedback-${registrationStatus}`}
            ref={registrationDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            {registrationStatus === "loading" ? (
              <span aria-hidden="true" className="registration-spinner" />
            ) : (
              <span aria-hidden="true" className="registration-result-icon">
                {registrationStatus === "success" ? "✓" : "×"}
              </span>
            )}
            <h2 id="registration-feedback-title">
              {registrationStatus === "loading"
                ? "Creating your account..."
                : registrationStatus === "success"
                  ? "Registration successful!"
                  : "Registration failed"}
            </h2>
            <p id="registration-feedback-message" role="status">
              {registrationStatus === "loading"
                ? "Please wait while we securely create your account."
                : registrationStatus === "success"
                  ? "Your account has been created. Please sign in to continue."
                  : registrationMessage}
            </p>
            {registrationStatus === "error" && (
              <button
                className="button button-primary registration-retry"
                onClick={retryRegistration}
                type="button"
              >
                Try again
              </button>
            )}
          </section>
        </div>
      )}
      <div className="auth-panel">
        <span className="eyebrow">
          {register ? "CREATE YOUR ACCOUNT" : "PORTAL"}
        </span>
        <h2>{register ? "Join Fichua Mtaa" : "Sign in to continue"}</h2>
        <p>
          {register
            ? "It only takes a minute to get started."
            : "Your community is glad to have you back."}
        </p>
        <aside className="cold-start-notice" aria-labelledby="cold-start-title">
          <svg
            aria-hidden="true"
            className="cold-start-icon"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <div>
            <h3 id="cold-start-title">
              FIRST VISIT? THE BACKEND MAY NEED 1-3 MINUTES TO WAKE UP
            </h3>
            <p>
              Fichua-Mtaa uses Render&apos;s free hosting, so the first request might take
              a while to be processed as backend is waking after being idle. 
            </p>
          </div>
        </aside>
        <Alert>
          {error ||
            (location.state?.sessionExpired
              ? "Your session expired. Please sign in again."
              : "")}
        </Alert>
        <form onSubmit={submit} noValidate>
          {register && (
            <Field
              label="Full name"
              name="fullName"
              autoComplete="name"
              required
              maxLength={120}
              value={fields.fullName}
              onChange={update}
              error={fieldErrors.fullName}
            />
          )}
          {
            <Field
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={fields.email}
              onChange={update}
              error={fieldErrors.email}
            />
          }
          {
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              maxLength={72}
              required
              showPasswordToggle
              value={fields.password}
              onChange={update}
              error={fieldErrors.password}
              hint={
                register ? "Choose a password that meets each rule." : undefined
              }
            />
          }
          {register && (
            <ul
              className="password-requirements"
              aria-label="Registration security checklist"
              aria-live="polite"
            >
              {passwordRequirements.map(({ label, test }) => {
                const met = test(fields.password);
                return (
                  <li className={met ? "is-met" : ""} key={label}>
                    <span aria-hidden="true">{met ? "✓" : "○"}</span>
                    {label}
                    <span className="requirement-state">
                      {met ? "Met" : "Needed"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {register && (
            <Field
              label="Confirm password"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              maxLength={72}
              required
              showPasswordToggle
              passwordLabel="confirmation password"
              value={fields.confirmation}
              onChange={update}
              error={fieldErrors.confirmation}
            />
          )}
          <Button disabled={loading}>
            {loading ? "Please wait…" : register ? "Create account" : "Sign in"}{" "}
            <span>→</span>
          </Button>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New to Fichua Mtaa?"}{" "}
          <Link to={register ? "/login" : "/register"} state={location.state}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <small className="privacy-note">
          Your information is used only to manage your service requests.
        </small>
      </div>
    </section>
  );
}
