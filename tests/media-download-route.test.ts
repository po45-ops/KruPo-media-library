import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  principal: { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "user@example.invalid", roles: ["user"] },
  entitlement: null as { id: string } | null,
  media: { access_type: "free", status: "published" } as { access_type: "free" | "paid"; status: string } | null,
  files: [] as Array<Record<string, unknown>>,
  selectedProvider: "" as string,
  filters: [] as Array<[string, unknown]>,
  logInserted: null as Record<string, unknown> | null,
}));

vi.mock("@/server/auth/principal", () => ({ getRequestPrincipal: vi.fn(async () => state.principal) }));
vi.mock("@/server/security/rate-limit", () => ({ enforceRequestRateLimit: vi.fn(async () => null) }));
vi.mock("@/providers/storage", () => ({
  getStorageProvider: vi.fn((provider: string) => {
    state.selectedProvider = provider;
    return {
      getMetadata: vi.fn(async () => ({ provider, fileId: "drive-file", path: "permanent/file.pdf", fileName: "file.pdf", mimeType: "application/pdf", size: 7, checksum: "sha256" })),
      download: vi.fn(async () => new Response("payload", { headers: { "Content-Type": "application/pdf" } })),
    };
  }),
}));
vi.mock("@/server/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    from(table: string) {
      if (table === "download_logs") return { insert: async (value: Record<string, unknown>) => { state.logInserted = value; return { error: null }; } };
      const result = table === "entitlements" ? { data: state.entitlement, error: null }
        : table === "media_items" ? { data: state.media, error: null }
          : { data: state.files, error: null };
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = (key: string, value: unknown) => { state.filters.push([key, value]); return builder; };
      builder.is = () => builder;
      builder.in = () => builder;
      builder.maybeSingle = async () => result;
      builder.limit = async () => result;
      return builder;
    },
  })),
}));

import { GET } from "@/app/api/media/[mediaId]/download/route";

const mediaId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const request = new Request(`https://staging.example/api/media/${mediaId}/download`);
const context = { params: Promise.resolve({ mediaId }) };
const cleanFile = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  storage_provider: "google_drive",
  storage_file_id: "drive-file",
  purpose: "download",
  file_name: "file.pdf",
  mime_type: "application/pdf",
  file_size: 7,
  checksum: "sha256",
  malware_status: "clean",
};

describe("media download route", () => {
  beforeEach(() => {
    state.principal = { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "user@example.invalid", roles: ["user"] };
    state.entitlement = null;
    state.media = { access_type: "free", status: "published" };
    state.files = [cleanFile];
    state.selectedProvider = "";
    state.filters = [];
    state.logInserted = null;
  });

  it("ไฟล์ฟรีที่ผ่าน clean ดาวน์โหลดผ่าน provider ใน record ได้", async () => {
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    expect(state.selectedProvider).toBe("google_drive");
    expect(state.filters).toContainEqual(["area", "permanent"]);
    expect(state.filters).toContainEqual(["active", true]);
    expect(state.filters).toContainEqual(["malware_status", "clean"]);
    expect(state.logInserted).toMatchObject({ media_file_id: cleanFile.id });
  });

  it("paid media ของ creator อื่นถูกปฏิเสธเมื่อไม่มี entitlement", async () => {
    state.media = { access_type: "paid", status: "published" };
    const response = await GET(request, context);
    expect(response.status).toBe(403);
    expect(state.selectedProvider).toBe("");
    expect(state.logInserted).toBeNull();
  });

  it("paid media ดาวน์โหลดได้เมื่อมี entitlement", async () => {
    state.media = { access_type: "paid", status: "published" };
    state.entitlement = { id: "entitlement" };
    expect((await GET(request, context)).status).toBe(200);
  });

  it("ปฏิเสธ suspended media และไฟล์ที่ยังไม่ clean", async () => {
    state.media = { access_type: "free", status: "suspended" };
    expect((await GET(request, context)).status).toBe(403);
    state.media = { access_type: "free", status: "published" };
    state.files = [];
    expect((await GET(request, context)).status).toBe(503);
  });
});
