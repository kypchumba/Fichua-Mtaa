const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const NETWORK_ERROR =
  "Unable to connect to the service. Please check your connection and try again.";

function authPath(path) {
  return path.split("?", 1)[0];
}

function fieldMessages(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, message]) => typeof key === "string" && typeof message === "string",
    ),
  );
}

function responseMessage(path, status, payload, fields) {
  const endpoint = authPath(path);
  if (endpoint === "/auth/login" && status === 401) {
    return "Incorrect email or password. Please try again.";
  }
  if (endpoint === "/auth/register" && status === 409) {
    return "An account with this email already exists. Please log in instead.";
  }
  if (endpoint === "/auth/register" && status === 429) {
    return "Too many registration attempts. Please try again later.";
  }
  if (status === 429) {
    return "Too many requests. Please wait a little and try again.";
  }
  if (status === 401) return "Please sign in to continue.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status >= 500) {
    const safeMessages = new Set([
      "Image attachments are not configured. Submit the request without an image.",
      "Image upload returned an invalid image URL.",
      "Image upload failed. You can retry or submit without an image.",
    ]);
    return safeMessages.has(payload?.message)
      ? payload.message
      : "The service is temporarily unavailable. Please try again later.";
  }
  if (status === 400 && Object.keys(fields).length > 0) {
    return payload?.message || "Please correct the highlighted fields.";
  }
  if (status === 404) return "The requested item could not be found.";
  if (typeof payload?.message === "string" && payload.message.length <= 240) {
    return payload.message;
  }
  return "Your request could not be completed. Please try again.";
}

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    // Browser/network exceptions can contain implementation details; keep UI feedback safe.
    throw new Error(NETWORK_ERROR);
  }
}

// Browser-managed cookies keep session identifiers out of JavaScript storage.
function csrfCookie() {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith("XSRF-TOKEN="))
    ?.split("=")
    .slice(1)
    .join("=");
}

export async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isForm =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(options.body && !isForm ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!csrfCookie())
      await request(`${base}/auth/csrf`, { credentials: "include" });
    const token = csrfCookie();
    if (token) headers["X-XSRF-TOKEN"] = decodeURIComponent(token);
  }
  const response = await request(`${base}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      response.status === 401 &&
      !["/auth/login", "/auth/register", "/auth/me"].includes(authPath(path))
    ) {
      // Let the auth provider clear stale user state and send protected pages to sign-in.
      window.dispatchEvent(new CustomEvent("fichua:session-expired"));
    }
    const fields = fieldMessages(data.fields);
    const error = new Error(responseMessage(path, response.status, data, fields));
    error.fields = fields;
    error.status = response.status;
    throw error;
  }
  return data;
}
