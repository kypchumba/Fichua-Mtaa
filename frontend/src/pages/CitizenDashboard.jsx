import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, EmptyState, Spinner, StatusBadge } from "../components/UI";

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );

// A citizen dashboard uses only the authenticated citizen's own request feed.
export function CitizenDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/requests/mine")
      .then(setRequests)
      .catch((failure) => setError(failure.message))
      .finally(() => setLoading(false));
  }, []);

  const openRequests = requests.filter((item) => item.status !== "RESOLVED");
  const resolvedRequests = requests.filter(
    (item) => item.status === "RESOLVED",
  );

  return (
    <section className="page-wrap citizen-dashboard">
      <div className="citizen-dashboard-heading">
        <div>
          <span className="eyebrow">CITIZEN SERVICES</span>
          <h1 className="page-title">Your community dashboard</h1>
          <p className="page-intro">
            Welcome, {user.fullName}. Follow your reports and see the latest
            service updates.
          </p>
        </div>
        <Link className="button button-primary" to="/requests/new">
          Submit a request <span aria-hidden="true">→</span>
        </Link>
      </div>

      <Alert>{error}</Alert>

      <div className="citizen-summary-grid">
        <SummaryCard label="Your requests" value={requests.length} />
        <SummaryCard label="Open" value={openRequests.length} />
        <SummaryCard label="Resolved" value={resolvedRequests.length} />
      </div>

      <section className="citizen-recent-section" aria-labelledby="recent-title">
        <div className="citizen-section-heading">
          <div>
            <h2 id="recent-title">Recent requests</h2>
            <p>Only you and service administrators can view these reports.</p>
          </div>
        </div>
        <nav className="citizen-dashboard-actions" aria-label="Request and account links">
          <Link className="button button-primary" to="/requests">
            View all requests
          </Link>
          <Link className="button button-outline" to="/profile">
            View account details
          </Link>
        </nav>

        {loading ? (
          <Spinner label="Loading your service dashboard" />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests submitted yet"
            action={{ to: "/requests/new", label: "Submit your first request" }}
          >
            Once you report an issue, updates and status history will appear
            here.
          </EmptyState>
        ) : (
          <div className="citizen-request-list">
            {requests.slice(0, 5).map((request) => (
              <article className="citizen-request-row" key={request.id}>
                <div>
                  <span className="citizen-request-reference">
                    {request.referenceNumber}
                  </span>
                  <h3>
                    <Link to={`/requests/${request.id}`}>{request.title}</Link>
                  </h3>
                  <p>
                    {request.category} <span aria-hidden="true">·</span>{" "}
                    {request.location}
                  </p>
                </div>
                <StatusBadge status={request.status} />
                <time dateTime={request.createdAt}>
                  {formatDate(request.createdAt)}
                </time>
                <Link className="button button-outline row-view" to={`/requests/${request.id}`}>
                  View
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="citizen-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Based on your submitted reports</small>
    </article>
  );
}
