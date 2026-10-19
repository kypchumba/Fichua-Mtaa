import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Field } from "../components/UI";
import { postLoginPath } from "../auth/roles";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  } else if (register && fields.password.length < 10) {
    errors.password = "Password must be at least 10 characters.";
  } else if (register && fields.password.length > 72) {
    errors.password = "Password must be 72 characters or fewer.";
  } else if (register && !/(?=.*[A-Za-z])(?=.*\d)/.test(fields.password)) {
    errors.password = "Password must contain a letter and a number.";
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
  const [fields, setFields] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmation: "",
  });
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
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const validationErrors = validateFields(fields, register);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      const account = register
        ? await createAccount({
            fullName: fields.fullName,
            email: fields.email,
            password: fields.password,
            confirmation: fields.confirmation,
          })
        : await login({ email: fields.email, password: fields.password });
      navigate(postLoginPath(account.role, location.state?.returnTo), {
        replace: true,
        state: { from: location.state?.from },
      });
    } catch (err) {
      setError(err.message || "Unable to complete your request. Please try again.");
      setFieldErrors(err.fields || {});
    } finally {
      setLoading(false);
    }
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
      <div className="auth-panel">
        <span className="eyebrow">
          {register ? "CREATE YOUR ACCOUNT" : "CITIZEN PORTAL"}
        </span>
        <h2>{register ? "Join Fichua Mtaa" : "Sign in to continue"}</h2>
        <p>
          {register
            ? "It only takes a minute to get started."
            : "Your community is glad to have you back."}
        </p>
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
                register
                  ? "At least 10 characters, with a letter and a number."
                  : undefined
              }
            />
          }
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
          <Link
            to={register ? "/login" : "/register"}
            state={location.state}
          >
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
