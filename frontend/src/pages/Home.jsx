import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const categories = [
  "Roads & drainage",
  "Water supply",
  "Waste collection",
  "Street lighting",
];
export default function Home() {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <>
      {location.state?.accountDeleted && (
        <div className="account-delete-success" role="status">
          Your account and associated reports have been permanently deleted.
        </div>
      )}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="live-dot" /> YOU ASK WE DELIVER.
            </span>
            <h1>
              Sauti yako,
              <br />
              <em>Jukumu letu.</em>
            </h1>
            <p>
              Report a local service issue, follow its progress, and help build
              a community that works for everyone.
            </p>
            <div className="hero-actions">
              <Link
                className="button button-light"
                to={
                  user?.role === "ADMIN"
                    ? "/admin"
                    : user?.role === "CITIZEN"
                      ? "/requests/new"
                      : "/register"
                }
              >
                {user?.role === "ADMIN"
                  ? "Open dashboard"
                  : "Report an issue"} <span aria-hidden="true">→</span>
              </Link>
              <Link className="hero-link" to="/services">
                Explore services
              </Link>
            </div>
            <div className="hero-trust">
              <span className="avatar-stack">
                <i>M</i>
                <i>A</i>
                <i>J</i>
              </span>
              <span>
                Small reports. <b>Real change.</b>
              </span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="sun" />
            <div className="hill hill-back" />
            <div className="hill hill-front" />
            <div className="art-road" />
            <div className="art-pin">
              <span>FM</span>
            </div>
            <div className="art-label">
              <b>Community report</b>
              <small>Progress you can follow</small>
            </div>
            <div className="art-cloud cloud-one" />
            <div className="art-cloud cloud-two" />
            <span className="art-tree tree-one">♧</span>
            <span className="art-tree tree-two">♧</span>
          </div>
        </div>
      </section>
      <section className="process section-wrap">
        <div className="section-heading">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>From report to resolution</h2>
          <p>We make it simple to speak up and easy to stay informed.</p>
        </div>
        <div className="steps">
          <article>
            <span className="step-no">01</span>
            <div className="step-icon">↗</div>
            <h3>Tell us what’s wrong</h3>
            <p>
              Choose a service, describe the issue and where it’s happening.
            </p>
          </article>
          <article>
            <span className="step-no">02</span>
            <div className="step-icon">⌕</div>
            <h3>We route your request</h3>
            <p>
              Your report is recorded and shared with the relevant service team.
            </p>
          </article>
          <article>
            <span className="step-no">03</span>
            <div className="step-icon">✓</div>
            <h3>Follow every update</h3>
            <p>
              Sign in any time to see status changes and the latest progress.
            </p>
          </article>
        </div>
      </section>
      <section className="categories-section">
        <div className="section-wrap category-inner">
          <div>
            <span className="eyebrow">HERE FOR YOUR EVERYDAY</span>
            <h2>
              What needs attention
              <br />
              in your neighbourhood?
            </h2>
            <p>Start with a service category. We’ll take it from there.</p>
            <Link className="text-link" to="/services">
              View all services <span>→</span>
            </Link>
          </div>
          <div className="category-grid">
            {categories.map((item, index) => (
              <Link to="/services" className="category-tile" key={item}>
                <span className={`category-symbol symbol-${index}`}>
                  {["⌁", "≈", "▤", "☼"][index]}
                </span>
                <span>{item}</span>
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="cta section-wrap">
        <div className="cta-icon">✳</div>
        <div>
          <span className="eyebrow">BETTER SERVICES START HERE</span>
          <h2>Noticed something? Say something.</h2>
          <p>Your report can make a difference to the whole community.</p>
        </div>
        <Link
          className="button button-primary"
          to={
            user?.role === "ADMIN"
              ? "/admin"
              : user?.role === "CITIZEN"
                ? "/requests/new"
                : "/register"
          }
        >
          {user?.role === "ADMIN"
            ? "Open administration"
            : "Submit a request"}{" "}
          <span>→</span>
        </Link>
      </section>
      {!user && (
        <section aria-label="Account access" className="mobile-account-actions">
          <Link className="button button-outline" to="/login">
            Sign in
          </Link>
          <Link className="button button-primary" to="/register">
            Register
          </Link>
        </section>
      )}
    </>
  );
}
