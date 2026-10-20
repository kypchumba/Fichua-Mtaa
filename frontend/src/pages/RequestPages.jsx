import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
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
import { BackLink } from "../components/BackLink";
import { ImageLightbox } from "../components/ImageLightbox";
import { RequestTitleField } from "../components/RequestTitleField";
import {
  LEGACY_SERVICE_CATEGORIES,
  SERVICE_CATEGORIES,
} from "../data/services";

const serviceCategories = SERVICE_CATEGORIES.map(({ category }) => category);
const requestFilterCategories = [
  ...new Set([...serviceCategories, ...LEGACY_SERVICE_CATEGORIES]),
];

// Keep existing administrator assignment choices while retaining old category labels.
const adminAssignmentCategories = [
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category");
  const [values, setValues] = useState({
    title: "",
    category: serviceCategories.includes(initialCategory) ? initialCategory : "",
    location: "",
    description: "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
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
    setFieldErrors({});
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
      setFieldErrors(err.fields || {});
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }
  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }
  return (
    <section className="form-page">
      <BackLink fallbackTo="/requests">← Back</BackLink>
      <span className="eyebrow">SERVICE REQUEST</span>
      <h1 className="page-title">Tell us what’s happening</h1>
      <p className="page-intro">
        Give us a few details and we’ll get your report to the right service
        team.
      </p>
      <form className="request-form" onSubmit={submit}>
        <Alert>{error}</Alert>
        <div className="form-grid">
          <RequestTitleField
            value={values.title}
            error={fieldErrors.title}
            onChange={(event) => updateField("title", event.target.value)}
          />
          <Field
            label="Service category"
            name="category"
            as="select"
            required
            error={fieldErrors.category}
            value={values.category}
            onChange={(e) => {
              const category = e.target.value;
              updateField("category", category);
              const nextParams = new URLSearchParams(searchParams);
              if (category) nextParams.set("category", category);
              else nextParams.delete("category");
              setSearchParams(nextParams, { replace: true });
            }}
          >
            <option value="">Choose a category</option>
            {serviceCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Field>
        </div>
        <Field
          label="Location or area affected"
          name="location"
          required
          error={fieldErrors.location}
          maxLength={180}
          placeholder="e.g. near the market on Main Road"
          value={values.location}
          onChange={(e) => updateField("location", e.target.value)}
        />
        <Field
          label="Describe the issue"
          name="description"
          as="textarea"
          required
          error={fieldErrors.description}
          minLength={20}
          maxLength={3000}
          rows={6}
          hint={`${values.description.length}/3000 characters. Include when it started and who is affected.`}
          value={values.description}
          onChange={(e) => updateField("description", e.target.value)}
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
          {requestFilterCategories.map((c) => (
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
              <Link className="button button-outline row-view" to={`/requests/${item.id}`}>
                View
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
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const closeImagePreview = useCallback(() => setImagePreviewOpen(false), []);
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
        <BackLink fallbackTo={admin ? "/admin" : "/requests"}>
          Return to requests
        </BackLink>
      </section>
    );
  return (
    <section className="page-wrap detail-page">
      <BackLink fallbackTo={admin ? "/admin" : "/requests"}>
        ← Back to {admin ? "all requests" : "my requests"}
      </BackLink>
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
            <button
              className="attached-image-button"
              type="button"
              aria-label="Enlarge citizen attached evidence"
              onClick={() => setImagePreviewOpen(true)}
            >
              <img
                className="attached-image"
                src={item.attachmentUrl}
                alt="Citizen attached evidence"
                loading="lazy"
              />
            </button>
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
      {imagePreviewOpen && item.attachmentUrl && (
        <ImageLightbox
          src={item.attachmentUrl}
          alt="Enlarged citizen attached evidence"
          onClose={closeImagePreview}
        />
      )}
    </section>
  );
}

function AdminControls({ item, onChange }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(item.status);
  const [category, setCategory] = useState(item.category);
  const [feedback, setFeedback] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const noteSaving = useRef(false);
  const [confirmingResolution, setConfirmingResolution] = useState(false);
  async function updateStatus() {
    setUpdatingStatus(true);
    setFeedback(null);
    try {
      onChange(
        await api(`/admin/requests/${item.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status, note: "" }),
        }),
      );
      setConfirmingResolution(false);
      setFeedback({ message: "Request status updated.", error: false });
    } catch (e) {
      setFeedback({ message: e.message, error: true });
    } finally {
      setUpdatingStatus(false);
    }
  }
  async function saveNote(e) {
    e.preventDefault();
    if (!note.trim()) {
      setFeedback({
        message: "Enter an internal note before choosing Save note.",
        error: true,
      });
      return;
    }
    if (noteSaving.current) return;
    noteSaving.current = true;
    setSavingNote(true);
    setFeedback(null);
    try {
      const saved = await api(`/admin/requests/${item.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: note.trim() }),
      });
      onChange((current) => ({
        ...current,
        internalNotes: [...current.internalNotes, saved],
      }));
      setNote("");
      setFeedback({ message: "Internal note saved.", error: false });
    } catch (e) {
      setFeedback({ message: e.message, error: true });
    } finally {
      noteSaving.current = false;
      setSavingNote(false);
    }
  }
  async function updateCategory() {
    setUpdatingCategory(true);
    setFeedback(null);
    try {
      onChange(
        await api(`/admin/requests/${item.id}/category`, {
          method: "PATCH",
          body: JSON.stringify({ category }),
        }),
      );
      setFeedback({ message: "Service category updated.", error: false });
    } catch (e) {
      setFeedback({ message: e.message, error: true });
    } finally {
      setUpdatingCategory(false);
    }
  }
  return (
    <>
      <h3>Manage request</h3>
      <section
        className="request-management-controls"
        aria-label="Request updates"
      >
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
              disabled={updatingStatus || status === item.status}
              onClick={() =>
                status === "RESOLVED"
                  ? setConfirmingResolution(true)
                  : updateStatus()
              }
            >
              {updatingStatus ? "Updating…" : "Update status"}
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
            {adminAssignmentCategories.map((service) => (
              <option key={service}>{service}</option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={updatingCategory || category === item.category}
            onClick={updateCategory}
          >
            {updatingCategory ? "Updating…" : "Update service"}
          </Button>
        </div>
      </section>
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
            <Button
              type="button"
              disabled={updatingStatus}
              onClick={updateStatus}
            >
              Confirm resolution
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={updatingStatus}
              onClick={() => setConfirmingResolution(false)}
            >
              Keep in progress
            </Button>
          </div>
        </div>
      )}
      <form className="internal-note-form" onSubmit={saveNote}>
        <label htmlFor="internalNote">
          Add an internal note <span className="optional">(optional)</span>
        </label>
        <textarea
          id="internalNote"
          rows="3"
          maxLength="2000"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-describedby="internal-note-help"
        />
        <small id="internal-note-help">
          Notes are private to administrators and separate from request updates.
        </small>
        <Button disabled={savingNote}>
          {savingNote ? "Saving note…" : "Save note"}
        </Button>
      </form>
      {feedback && (
        <p
          className={`inline-feedback${feedback.error ? " is-error" : ""}`}
          role="status"
        >
          {feedback.message}
        </p>
      )}
    </>
  );
}
