import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

describe("API upload errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
