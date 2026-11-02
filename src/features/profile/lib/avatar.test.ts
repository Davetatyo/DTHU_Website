import { afterEach, describe, expect, it, vi } from "vitest";
import { canUploadOwnAvatar } from "./access";
import {
  avatarObjectPath,
  avatarPublicUrl,
  checkAvatarFile,
  MAX_UPLOAD_BYTES,
  sniffImageType,
} from "./avatar";

const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const text = new TextEncoder().encode("<svg onload=alert(1)>");

describe("sniffImageType", () => {
  it("recognises WebP, JPEG and PNG by their first bytes", () => {
    expect(sniffImageType(webp)).toBe("image/webp");
    expect(sniffImageType(jpeg)).toBe("image/jpeg");
    expect(sniffImageType(png)).toBe("image/png");
  });

  it("rejects anything else, including SVG and too-short files", () => {
    expect(sniffImageType(text)).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20]))).toBeNull();
  });
});

describe("checkAvatarFile", () => {
  it("accepts a small image", () => {
    expect(checkAvatarFile(webp)).toEqual({ ok: true, type: "image/webp" });
  });

  it("rejects empty, oversized and non-image files", () => {
    expect(checkAvatarFile(new Uint8Array()).ok).toBe(false);
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(jpeg);
    expect(checkAvatarFile(big).ok).toBe(false);
    expect(checkAvatarFile(text).ok).toBe(false);
  });
});

describe("avatar paths and URLs", () => {
  it("stores each upload under the user's folder with a new file name", () => {
    expect(avatarObjectPath("u-1", "image/webp", new Date(1000))).toBe("u-1/1000.webp");
    expect(avatarObjectPath("u-1", "image/jpeg", new Date(2000))).toBe("u-1/2000.jpg");
  });

  it("builds the public URL, or null without a picture", () => {
    expect(avatarPublicUrl("u-1/1.webp", "https://x.supabase.co/")).toBe(
      "https://x.supabase.co/storage/v1/object/public/avatars/u-1/1.webp",
    );
    expect(avatarPublicUrl(null, "https://x.supabase.co")).toBeNull();
  });
});

describe("canUploadOwnAvatar (test phase)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lets only the bootstrap admin upload", () => {
    vi.stubEnv("BOOTSTRAP_ADMIN_DISCORD", "davetatyo");
    expect(canUploadOwnAvatar({ discord_username: "DaveTatyo" })).toBe(true);
    expect(canUploadOwnAvatar({ discord_username: "someone" })).toBe(false);
    expect(canUploadOwnAvatar({ discord_username: null })).toBe(false);
  });
});
