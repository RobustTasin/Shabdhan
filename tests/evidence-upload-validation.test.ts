import { describe, expect, it } from "vitest";
import { hasMatchingFileSignature } from "../server/middleware/upload";

describe("hasMatchingFileSignature", () => {
  it.each([
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xdb])],
    [
      "image/png",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ],
    ["image/webp", Buffer.from("RIFF0000WEBP", "ascii")],
    ["video/mp4", Buffer.from("0000ftypisom", "ascii")],
    ["video/webm", Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00])],
    ["application/pdf", Buffer.from("%PDF-1.7\n", "ascii")],
  ])("accepts a matching signature for %s", (mime, buffer) => {
    expect(hasMatchingFileSignature(buffer, mime)).toBe(true);
  });

  it("rejects a PNG declared as JPEG", () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    expect(hasMatchingFileSignature(png, "image/jpeg")).toBe(false);
  });

  it("rejects text declared as a PDF", () => {
    expect(
      hasMatchingFileSignature(Buffer.from("not a PDF"), "application/pdf")
    ).toBe(false);
  });

  it("rejects unknown MIME types", () => {
    expect(
      hasMatchingFileSignature(Buffer.from("anything"), "application/octet-stream")
    ).toBe(false);
  });

  it("rejects empty or truncated signatures", () => {
    expect(hasMatchingFileSignature(Buffer.alloc(0), "image/png")).toBe(false);
    expect(
      hasMatchingFileSignature(Buffer.from([0xff, 0xd8]), "image/jpeg")
    ).toBe(false);
  });
});
