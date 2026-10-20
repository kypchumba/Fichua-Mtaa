import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubMutationResponses(...responses) {
  const queued = responses.flatMap((response) => [
    jsonResponse({ token: "csrf-from-api" }),
    response,
  ]);
  const fetchMock = vi.fn(async () => queued.shift());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("API upload errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.cookie = "XSRF-TOKEN=; Max-Age=0";
  });

  it("reports provider upload failures without losing the useful server message", async () => {
    const fetchMock = stubMutationResponses(
      jsonResponse(
        {
          message:
            "Image upload failed. You can retry or submit without an image.",
        },
        502,
      ),
    );
    const form = new FormData();
    form.append(
      "image",
      new Blob(["compressed"], { type: "image/webp" }),
      "compressed.webp",
    );
    await expect(
      api("/uploads/image", { method: "POST", body: form }),
    ).rejects.toThrow(
      "Image upload failed. You can retry or submit without an image.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/csrf$/);
    expect(fetchMock.mock.calls[1][1].headers["X-XSRF-TOKEN"]).toBe(
      "csrf-from-api",
    );
  });

  it("uses the same generic message for every login credential failure", async () => {
    const fetchMock = stubMutationResponses(
      jsonResponse({ message: "Account not found", fields: {} }, 401),
    );

    await expect(
      api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@example.com", password: "bad" }),
      }),
    ).rejects.toThrow("Incorrect email or password. Please try again.");
    expect(fetchMock.mock.calls[1][1].headers["X-XSRF-TOKEN"]).toBe(
      "csrf-from-api",
    );
    expect(fetchMock.mock.calls[1][1].credentials).toBe("include");
  });

  it("shows a clear duplicate-email message during registration", async () => {
    stubMutationResponses(
      jsonResponse({ message: "Email is already taken" }, 409),
    );

    await expect(
      api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "citizen@example.com" }),
      }),
    ).rejects.toThrow(
      "An account with this email already exists. Please log in instead.",
    );
  });

  it("preserves field-level validation messages and handles registration throttling", async () => {
    stubMutationResponses(
      jsonResponse({
          message: "Please check the highlighted fields.",
          fields: { email: "Please enter your email address." },
        }, 400),
      jsonResponse({ message: "Limited" }, 429),
    );

    await expect(
      api("/auth/register", { method: "POST", body: "{}" }),
    ).rejects.toMatchObject({
      message: "Please check the highlighted fields.",
      fields: { email: "Please enter your email address." },
    });
    await expect(
      api("/auth/register", { method: "POST", body: "{}" }),
    ).rejects.toThrow("Too many registration attempts. Please try again later.");
  });

  it("does not expose browser network exception text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("private network implementation detail");
    }));

    await expect(api("/auth/me")).rejects.toThrow(
      "Unable to connect to the service. Please check your connection and try again.",
    );
  });

  it("does not submit a write when CSRF bootstrap fails", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ message: "Please sign in to continue." }, 401),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "citizen@example.com", password: "secret" }),
      }),
    ).rejects.toThrow(
      "Unable to establish a secure connection. Refresh the page and try again.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("signals an expired authenticated session on protected API responses", async () => {
    const expired = vi.fn();
    window.addEventListener("fichua:session-expired", expired);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "Unauthenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(api("/admin/analytics")).rejects.toThrow(
      "Please sign in to continue.",
    );
    expect(expired).toHaveBeenCalledTimes(1);
    window.removeEventListener("fichua:session-expired", expired);
  });
});
