import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { compressImage, MAX_IMAGE_BYTES } from "../api/image";
import {
  Alert,
  Button,
  EmptyState,
  Field,
  Spinner,
  StatusBadge,
} from "../components/UI";

const categories = [
  "Roads and Drainage",
  "Water Supply",
  "Waste Collection",
  "Street Lighting",
  "Other",
];
const date = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

export function RequestCreate() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    title: "",
    category: "",
    location: "",
    description: "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function choose(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setError("");
    if (selected.size > 12_000_000) {
      setError(
        "The selected image is too large to process. Choose an image under 12 MB.",
      );
      return;
    }
    const before = preview;
    setPreview("");
    if (before) URL.revokeObjectURL(before);
    try {
      const compressed = await compressImage(selected);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
      setMetadata({
        original: selected.size,
        compressed: compressed.size,
        name: selected.name,
      });
    } catch (err) {
      setFile(null);
      setMetadata(null);
      setError(err.message);
    }
    event.target.value = "";
  }
  function removeFile() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setFile(null);
    setMetadata(null);
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      let attachmentUrl = null;
      if (file) {
        setUploading(true);
        const form = new FormData();
        form.append("image", file);
        const uploaded = await api("/uploads/image", {
          method: "POST",
          body: form,
        });
        attachmentUrl = uploaded.url;
        setUploading(false);
      }
      const result = await api("/requests", {
        method: "POST",
        body: JSON.stringify({ ...values, attachmentUrl }),
      });
      navigate(`/requests/${result.id}`, {
        state: { submitted: true, reference: result.referenceNumber },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }
  return (
    <section className="form-page">
      <Link className="back-link" to="/requests">
        ← Back to my requests
      </Link>
      <span className="eyebrow">SERVICE REQUEST</span>
      <h1 className="page-title">Tell us what’s happening</h1>
      <p className="page-intro">
        Give us a few details and we’ll get your report to the right service
        team.
      </p>
      <form className="request-form" onSubmit={submit}>
        <Alert>{error}</Alert>
        <div className="form-grid">
          <Field
            label="Request title"
            name="title"
            required
            maxLength={120}
            hint="A short summary of the issue."
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
          <Field
            label="Service category"
            name="category"
            as="select"
            required
            value={values.category}
            onChange={(e) => setValues({ ...values, category: e.target.value })}
          >
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Field>
        </div>
        <Field
          label="Location or area affected"
          name="location"
          required
          maxLength={180}
          placeholder="e.g. near the market on Main Road"
          value={values.location}
          onChange={(e) => setValues({ ...values, location: e.target.value })}
        />
        <Field
          label="Describe the issue"
          name="description"
          as="textarea"
          required
          minLength={20}
          maxLength={3000}
          rows={6}
          hint={`${values.description.length}/3000 characters. Include when it started and who is affected.`}
          value={values.description}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
        />
        <div className="upload-field">
          <label htmlFor="image">
            Photo evidence <span className="optional">(optional)</span>
          </label>
          <p>
            JPEG, PNG or WebP. Maximum compressed size 500 KB. Images are
            resized to fit within 1600 pixels.
          </p>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choose}
          />
          {metadata && (
            <div className="image-preview">
              <img src={preview} alt="Compressed image preview" />
              <div>
                <b>{metadata.name}</b>
                <span>
                  Original: {(metadata.original / 1024).toFixed(1)} KB
                </span>
                <span>
                  Compressed: {(metadata.compressed / 1024).toFixed(1)} KB (
                  {Math.max(
                    0,
                    Math.round(
                      (1 - metadata.compressed / metadata.original) * 100,
                    ),
                  )}
                  % smaller)
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={removeFile}
                >
                  Remove image
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="form-actions">
          <Button disabled={loading}>
            {uploading
              ? "Uploading photo…"
              : loading
                ? "Submitting…"
                : "Submit request"}{" "}
            <span>→</span>
          </Button>
          <span>Your report is private to you and service administrators.</span>
        </div>
      </form>
    </section>
  );
}

export function MyRequests() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/requests/mine")
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const filtered = items.filter(
    (x) =>
      (status === "ALL" || x.status === status) &&
      (category === "ALL" || x.category === category) &&
      (!query ||
        `${x.title} ${x.referenceNumber} ${x.location}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  return (
    <section className="page-wrap">
      <span className="eyebrow">YOUR REPORTS</span>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">My requests</h1>
          <p className="page-intro">
            See what you’ve reported and follow each update.
          </p>
        </div>
        <Link className="button button-primary" to="/requests/new">
          + New request
        </Link>
      </div>
      <div className="list-toolbar">
        <label htmlFor="statusFilter">Status</label>
        <select
          id="statusFilter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ALL">All requests</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <label htmlFor="categoryFilter">Service</label>
        <select
          id="categoryFilter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="ALL">All services</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className="request-search"
          aria-label="Search my requests"
          placeholder="Search requests"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span>
          {filtered.length} {filtered.length === 1 ? "request" : "requests"}
        </span>
      </div>
      <Alert>{error}</Alert>
      {loading ? (
        <Spinner label="Loading your requests" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={items.length ? "No matching requests" : "Nothing reported yet"}
          action={{ to: "/requests/new", label: "Submit a request" }}
        >
          {items.length
            ? "Try changing your search or filters."
            : "When you report a local service issue, it will appear here."}
        </EmptyState>
      ) : (
        <div className="request-list">
          {filtered.map((item) => (
            <article className="request-row" key={item.id}>
              <div className="request-ref">
                <span>{item.referenceNumber}</span>
                <StatusBadge status={item.status} />
              </div>
              <div className="request-summary">
                <h2>
                  <Link to={`/requests/${item.id}`}>{item.title}</Link>
                </h2>
                <p>
                  {item.category} <span>·</span> {item.location}
                </p>
              </div>
              <time>{date(item.createdAt)}</time>
              <Link
                className="row-link"
                to={`/requests/${item.id}`}
                aria-label={`View ${item.referenceNumber}`}
              >
                →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function RequestDetails({ admin = false }) {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api(`${admin ? "/admin" : ""}/requests/${id}`)
      .then(setItem)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, admin]);
  if (loading) return <Spinner label="Loading request details" />;
  if (error)
    return (
      <section className="page-wrap">
        <Alert>{error}</Alert>
        <Link to={admin ? "/admin" : "/requests"}>Return to requests</Link>
      </section>
    );
  return (
    <section className="page-wrap detail-page">
      <Link className="back-link" to={admin ? "/admin" : "/requests"}>
        ← Back to {admin ? "all requests" : "my requests"}
      </Link>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">REQUEST {item.referenceNumber}</span>
          <h1 className="page-title">{item.title}</h1>
          <p>
            {item.category} <span>·</span> {item.location}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="detail-grid">
        <article className="detail-card">
          <h2>Request details</h2>
          <p className="detail-description">{item.description}</p>
          {item.attachmentUrl && (
            <img
              className="attached-image"
              src={item.attachmentUrl}
              alt="Citizen attached evidence"
            />
          )}
          <dl className="detail-meta">
            <div>
              <dt>Submitted</dt>
              <dd>{date(item.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{date(item.updatedAt)}</dd>
            </div>
            {admin && (
              <div>
                <dt>Reported by</dt>
                <dd>
                  {item.citizen.fullName} · {item.citizen.email}
                </dd>
              </div>
            )}
          </dl>
        </article>
        <article className="detail-card">
          <h2>Progress history</h2>
          <ol className="timeline">
            {item.history.map((h, i) => (
              <li key={`${h.changedAt}-${i}`}>
                <span className="timeline-dot" />
                <div>
                  <b>{h.newStatus.replace("_", " ")}</b>
                  <time>{date(h.changedAt)}</time>
                  {h.changedBy && <small>Updated by {h.changedBy}</small>}
                  {h.note && <p>{h.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </article>
        {admin && (
          <article className="detail-card internal-notes">
            <h2>Internal notes</h2>
            <p>Visible only to administrators.</p>
            {item.internalNotes.map((n) => (
              <div className="note-entry" key={n.id}>
                <p>{n.body}</p>
                <small>
                  {n.admin} · {date(n.createdAt)}
                </small>
              </div>
            ))}
            <AdminControls item={item} onChange={setItem} />
          </article>
        )}
      </div>
    </section>
  );
}

function AdminControls({ item, onChange }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(item.status);
  const [category, setCategory] = useState(item.category);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingResolution, setConfirmingResolution] = useState(false);
  async function updateStatus() {
    setBusy(true);
    setMessage("");
    try {
      onChange(
        await api(`/admin/requests/${item.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status, note: "" }),
        }),
      );
      setConfirmingResolution(false);
      setMessage("Request status updated.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveNote(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api(`/admin/requests/${item.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: note }),
      });
      onChange({
        ...item,
        internalNotes: [
          ...item.internalNotes,
          {
            body: note,
            createdAt: new Date().toISOString(),
            admin: "You",
            id: Date.now(),
          },
        ],
      });
      setNote("");
      setMessage("Internal note saved.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function updateCategory() {
    setBusy(true);
    setMessage("");
    try {
      onChange(
        await api(`/admin/requests/${item.id}/category`, {
          method: "PATCH",
          body: JSON.stringify({ category }),
        }),
      );
      setMessage("Service category updated.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h3>Manage request</h3>
      {item.status !== "RESOLVED" && (
        <div className="status-control">
          <label htmlFor="nextStatus">Change status</label>
          <select
            id="nextStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value={item.status} disabled>
              {item.status.replace("_", " ")}
            </option>
            {item.status === "PENDING" && (
              <option value="IN_PROGRESS">In progress</option>
            )}
            {item.status === "IN_PROGRESS" && (
              <option value="RESOLVED">Resolved</option>
            )}
          </select>
          <Button
            type="button"
            disabled={busy || status === item.status}
            onClick={() =>
              status === "RESOLVED"
                ? setConfirmingResolution(true)
                : updateStatus()
            }
          >
            Update status
          </Button>
        </div>
      )}
      <div className="status-control">
        <label htmlFor="requestCategory">Assign service</label>
        <select
          id="requestCategory"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((service) => (
            <option key={service}>{service}</option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          disabled={busy || category === item.category}
          onClick={updateCategory}
        >
          Update service
        </Button>
      </div>
      {confirmingResolution && (
        <div
          className="confirm-panel"
          role="alertdialog"
          aria-labelledby="confirm-title"
        >
          <h4 id="confirm-title">Mark this request as resolved?</h4>
          <p>
            This records the resolution in the request history for the citizen
            to see.
          </p>
          <div>
            <Button type="button" disabled={busy} onClick={updateStatus}>
              Confirm resolution
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmingResolution(false)}
            >
              Keep in progress
            </Button>
          </div>
        </div>
      )}
      <form onSubmit={saveNote}>
        <label htmlFor="internalNote">Add an internal note</label>
        <textarea
          id="internalNote"
          rows="3"
          maxLength="2000"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
        />
        <Button disabled={busy || !note.trim()}>Save note</Button>
      </form>
      {message && (
        <p className="inline-feedback" role="status">
          {message}
        </p>
      )}
    </>
  );
}
