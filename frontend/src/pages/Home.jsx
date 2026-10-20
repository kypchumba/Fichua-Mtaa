import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HOME_SERVICE_PREVIEW } from "../data/services";
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
              YOU ASK WE DELIVER.
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
            {HOME_SERVICE_PREVIEW.map((service, index) => (
              <Link
                to="/services"
                className="category-tile"
                key={service.category}
              >
                <span className={`category-symbol symbol-${index}`}>
                  {service.icon}
                </span>
                <span>{service.category}</span>
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
