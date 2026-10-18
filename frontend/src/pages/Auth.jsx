import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Field } from "../components/UI";

export function AuthPage({ register = false }) {
  const { user, login, register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmation: "",
  });
  if (user)
    return (
      <Navigate to={user.role === "ADMIN" ? "/admin" : "/requests"} replace />
    );
  const update = (e) =>
    setFields({ ...fields, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (register && fields.password !== fields.confirmation) {
      setFieldErrors({ confirmation: "Your passwords do not match." });
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
      navigate(account.role === "ADMIN" ? "/admin" : "/requests");
    } catch (err) {
      setError(err.message);
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
        <Alert>{error}</Alert>
        <form onSubmit={submit}>
          {register && (
            <Field
              label="Full name"
              name="fullName"
              autoComplete="name"
              required
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
              required
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
              required
              value={fields.confirmation}
              onChange={update}
              error={fieldErrors.passwordMatching}
            />
          )}
          <Button disabled={loading}>
            {loading ? "Please wait…" : register ? "Create account" : "Sign in"}{" "}
            <span>→</span>
          </Button>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New to Fichua Mtaa?"}{" "}
          <Link to={register ? "/login" : "/register"}>
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
