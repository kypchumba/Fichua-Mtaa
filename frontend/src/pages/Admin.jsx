import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { Alert, EmptyState, Spinner, StatusBadge } from "../components/UI";
import SignOutControl from "../components/SignOutControl";

const colors = {
  PENDING: "#b9822c",
  IN_PROGRESS: "#377c91",
  RESOLVED: "#3c8463",
};
const when = (v) =>
  v
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(v),
      )
    : "—";

export default function Admin() {
  const [analytics, setAnalytics] = useState(null);
  const [requests, setRequests] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    category: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(0);
  const [analyticsError, setAnalyticsError] = useState("");
  const [requestsError, setRequestsError] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshPulse, setRefreshPulse] = useState(false);
  const refreshInFlight = useRef(false);
  const pulseTimer = useRef(null);

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    setAnalyticsError("");
    try {
      setAnalytics(await api("/admin/analytics"));
    } catch (error) {
      setAnalyticsError(error.message);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function loadRequests() {
    setRequestsLoading(true);
    setRequestsError("");
    const params = new URLSearchParams({
      page: String(page),
      size: "20",
      sort: "createdAt,desc",
    });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    try {
      setRequests(await api(`/admin/requests?${params}`));
    } catch (error) {
      setRequestsError(error.message);
    } finally {
      setRequestsLoading(false);
    }
  }

  function load() {
    // Dashboard sections have independent failure states so analytics cannot hide requests.
    return Promise.all([loadAnalytics(), loadRequests()]);
  }

  async function refreshDashboard() {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    setRefreshPulse(true);
    clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setRefreshPulse(false), 700);
    try {
      await load();
    } finally {
      setRefreshing(false);
      refreshInFlight.current = false;
    }
  }
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [filters, page]);
  useEffect(() => () => clearTimeout(pulseTimer.current), []);
  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }
  const statusData = analytics
    ? Object.entries(analytics.byStatus).map(([name, value]) => ({
        name: name.replace("_", " "),
        value,
        fill: colors[name],
      }))
    : [];
  const categoryData = analytics
    ? Object.entries(analytics.byCategory).map(([name, value]) => ({
        name,
        value,
      }))
    : [];
  return (
    <section className="page-wrap admin-page">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">SERVICE DELIVERY</span>
          <h1 className="page-title">Administration</h1>
          <p className="page-intro">
            A live view of community reports and their progress.
          </p>
        </div>
        <div className="admin-actions">
          <button
            aria-label="Refresh dashboard"
            aria-busy={refreshing}
            className={`button button-outline refresh-button${refreshing ? " is-refreshing" : ""}${refreshPulse ? " is-flashing" : ""}`}
            disabled={refreshing}
            onClick={refreshDashboard}
            type="button"
          >
            <span aria-hidden="true" className="refresh-icon">↻</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <SignOutControl className="button button-outline" />
        </div>
      </div>
      <section aria-labelledby="analytics-heading">
        <h2 id="analytics-heading" className="visually-hidden">
          Service delivery analytics
        </h2>
        <Alert>{analyticsError}</Alert>
        {analyticsLoading && !analytics ? (
          <Spinner label="Loading service analytics" />
        ) : analytics ? (
          <>
            <div className="metrics-grid">
              <Metric
                label="Total requests"
                value={analytics.total}
                tone="green"
              />
              <Metric label="Pending" value={analytics.pending} tone="amber" />
              <Metric
                label="In progress"
                value={analytics.inProgress}
                tone="blue"
              />
              <Metric label="Resolved" value={analytics.resolved} tone="mint" />
            </div>
            <div className="analytics-grid">
              <article className="chart-card">
                <div className="chart-heading">
                  <div>
                    <h2>Requests by status</h2>
                    <p>
                      {analytics.open} open · {analytics.resolved} resolved
                    </p>
                  </div>
                </div>
                {analytics.total === 0 ? (
                  <div className="chart-empty">No request data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={88}
                        paddingAngle={3}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="chart-total"
                      >
                        {analytics.total}
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="chart-legend">
                  {statusData.map((s) => (
                    <span key={s.name}>
                      <i style={{ background: s.fill }} />
                      {s.name}
                      <b>{s.value}</b>
                    </span>
                  ))}
                </div>
              </article>
              <article className="chart-card">
                <div className="chart-heading">
                  <div>
                    <h2>Requests by service</h2>
                    <p>Reports grouped by category</p>
                  </div>
                </div>
                {!categoryData.length ? (
                  <div className="chart-empty">No request data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={categoryData}
                      layout="vertical"
                      margin={{ left: 20, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill="#327960"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </article>
            </div>
          </>
        ) : null}
      </section>

      <section
        className="admin-table-section"
        aria-labelledby="requests-heading"
      >
        <div className="table-heading">
          <div>
            <h2 id="requests-heading">Service requests</h2>
            <p>Search and review recent citizen reports.</p>
          </div>
          <span>{requests?.totalElements ?? 0} total</span>
        </div>
        <Alert>{requestsError}</Alert>
        {requestsLoading && !requests ? (
          <Spinner label="Loading service requests" />
        ) : null}
        <div className="table-filters">
          <input
            aria-label="Search requests"
            placeholder="Search title, reference or location"
            value={filters.q}
            onChange={(e) => updateFilter("q", e.target.value)}
          />
          <select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <input
            aria-label="Requests from date"
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
          />
          <input
            aria-label="Requests through date"
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
          />
          <select
            aria-label="Filter by category"
            value={filters.category}
            onChange={(e) => updateFilter("category", e.target.value)}
          >
            <option value="">All services</option>
            {[
              "Roads and Drainage",
              "Water Supply",
              "Waste Collection",
              "Street Lighting",
              "Other",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {requests && !requests.content.length ? (
          <EmptyState title="No requests found">
            Try changing the search or filters.
          </EmptyState>
        ) : requests?.content?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Request</th>
                  <th>Category</th>
                  <th>Citizen</th>
                  <th>Date received</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requests.content.map((r) => (
                  <tr key={r.id}>
                    <td className="table-ref">{r.referenceNumber}</td>
                    <td>
                      <Link to={`/admin/requests/${r.id}`}>{r.title}</Link>
                      <small>{r.location}</small>
                    </td>
                    <td>{r.category}</td>
                    <td>
                      {r.citizen.fullName}
                      <small>{r.citizen.email}</small>
                    </td>
                    <td>{when(r.createdAt)}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <Link
                        className="table-view"
                        to={`/admin/requests/${r.id}`}
                        aria-label={`View ${r.referenceNumber}`}
                      >
                        →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {requests?.totalPages > 1 && (
          <div className="pagination" aria-label="Request pages">
            <button
              type="button"
              disabled={page === 0 || requestsLoading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span>
              Page {page + 1} of {requests.totalPages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= requests.totalPages || requestsLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
function Metric({ label, value, tone }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <b>{value}</b>
      <small>All time</small>
    </article>
  );
}
