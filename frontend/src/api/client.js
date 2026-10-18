const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

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
      await fetch(`${base}/auth/csrf`, { credentials: "include" });
    const token = csrfCookie();
    if (token) headers["X-XSRF-TOKEN"] = decodeURIComponent(token);
  }
  const response = await fetch(`${base}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed (${response.status})`,
    );
    error.fields = data.fields || {};
    error.status = response.status;
    throw error;
  }
  return data;
}
