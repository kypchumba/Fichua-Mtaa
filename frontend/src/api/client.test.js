import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

describe("API upload errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.cookie = "XSRF-TOKEN=; Max-Age=0";
  });

  it("reports provider upload failures without losing the useful server message", async () => {
    document.cookie = "XSRF-TOKEN=test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              message:
                "Image upload failed. You can retry or submit without an image.",
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          ),
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
  });

  it("uses the same generic message for every login credential failure", async () => {
    document.cookie = "XSRF-TOKEN=test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ message: "Account not found", fields: {} }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@example.com", password: "bad" }),
      }),
    ).rejects.toThrow("Incorrect email or password. Please try again.");
  });

  it("shows a clear duplicate-email message during registration", async () => {
    document.cookie = "XSRF-TOKEN=test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "Email is already taken" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      ),
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
    document.cookie = "XSRF-TOKEN=test-token";
    const responses = [
      new Response(
        JSON.stringify({
          message: "Please check the highlighted fields.",
          fields: { email: "Please enter your email address." },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
      new Response(JSON.stringify({ message: "Limited" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => responses.shift()));

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
