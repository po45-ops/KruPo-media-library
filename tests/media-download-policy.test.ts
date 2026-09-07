import { describe, expect, it } from "vitest";
import { canDownloadMedia, storedFileMatches } from "@/server/services/media-download-policy";

describe("secure media download policy", () => {
  it("อนุญาตไฟล์ฟรีที่ published โดยยังต้องผ่าน route session", () => {
    expect(canDownloadMedia({ access_type: "free", status: "published" }, false)).toBe(true);
  });

  it("ปฏิเสธ paid media ก่อนมี entitlement", () => {
    expect(canDownloadMedia({ access_type: "paid", status: "published" }, false)).toBe(false);
    expect(canDownloadMedia({ access_type: "paid", status: "published" }, true)).toBe(true);
  });

  it("ปฏิเสธ media ที่ suspended แม้เคยมี entitlement", () => {
    expect(canDownloadMedia({ access_type: "paid", status: "suspended" }, true)).toBe(false);
  });

  it("ตรวจ metadata และ SHA-256 จาก provider เทียบฐานข้อมูล", () => {
    const file = { file_name: "lesson.pdf", mime_type: "application/pdf", file_size: "7", checksum: "sha256" };
    const metadata = { provider: "google_drive" as const, fileId: "file-id", path: "permanent/lesson.pdf", fileName: "lesson.pdf", mimeType: "application/pdf", size: 7, checksum: "sha256" };
    expect(storedFileMatches(file, metadata)).toBe(true);
    expect(storedFileMatches(file, { ...metadata, checksum: "tampered" })).toBe(false);
  });
});
