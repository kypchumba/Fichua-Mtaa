import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImage, MAX_IMAGE_BYTES } from "./image";

describe("compressImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects formats outside JPEG, PNG and WebP before reading them", async () => {
    await expect(
      compressImage(new File(["x"], "map.svg", { type: "image/svg+xml" })),
    ).rejects.toThrow("Choose a JPEG, PNG or WebP image.");
  });

  it("returns a locally compressed preview file under the strict size limit", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 2200, height: 1100, close: vi.fn() })),
    );
    vi.spyOn(document, "createElement").mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({ clearRect: vi.fn(), drawImage: vi.fn() }),
      toBlob: (done, type) => done(new Blob(["small image"], { type })),
    });
    const result = await compressImage(
      new File(["original"], "street.png", { type: "image/png" }),
    );
    expect(result.size).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("compressed.webp");
  });

  it("fails clearly when every supported quality and dimension is still too large", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 3000, height: 2000, close: vi.fn() })),
    );
    vi.spyOn(document, "createElement").mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({ clearRect: vi.fn(), drawImage: vi.fn() }),
      toBlob: (done, type) =>
        done(new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type })),
    });
    await expect(
      compressImage(
        new File(["original"], "large.jpg", { type: "image/jpeg" }),
      ),
    ).rejects.toThrow("remains over 500 KB");
  });
});
