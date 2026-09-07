import { describe, expect, it, vi } from "vitest";
import { GoogleDriveStorageProvider } from "@/providers/storage/google-drive-storage";

interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  md5Checksum?: string;
  parents?: string[];
  trashed?: boolean;
  appProperties?: Record<string, string>;
  permissions?: Array<{ type: string; role: string }>;
  capabilities?: { canAddChildren: boolean };
  bytes?: Uint8Array;
}

function createHarness(rootPermission: "private" | "public" = "private") {
  let sequence = 0;
  const requests: Array<{ url: string; method: string; body?: BodyInit | null }> = [];
  const files = new Map<string, StoredFile>([["root-folder", {
    id: "root-folder",
    name: "KruPo Staging Private",
    mimeType: "application/vnd.google-apps.folder",
    permissions: rootPermission === "private" ? [{ type: "user", role: "owner" }] : [{ type: "anyone", role: "reader" }],
    capabilities: { canAddChildren: true },
    trashed: false,
  }]]);

  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const parsed = new URL(url);
    const method = init.method ?? "GET";
    requests.push({ url, method, body: init.body });
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "test-access-token", expires_in: 3600 });
    }

    const fileMatch = parsed.pathname.match(/\/drive\/v3\/files\/([^/]+)$/);
    const copyMatch = parsed.pathname.match(/\/drive\/v3\/files\/([^/]+)\/copy$/);
    if (copyMatch && method === "POST") {
      const source = files.get(decodeURIComponent(copyMatch[1]));
      if (!source) return new Response(null, { status: 404 });
      const body = JSON.parse(String(init.body)) as Partial<StoredFile>;
      const copy = { ...source, ...body, id: `file-${++sequence}`, createdTime: new Date().toISOString(), trashed: false } as StoredFile;
      files.set(copy.id, copy);
      return Response.json(copy);
    }
    if (fileMatch) {
      const id = decodeURIComponent(fileMatch[1]);
      const file = files.get(id);
      if (!file) return new Response(null, { status: 404 });
      if (parsed.searchParams.get("alt") === "media") return new Response((file.bytes ?? new TextEncoder().encode("payload")).slice().buffer);
      if (method === "PATCH") {
        const body = JSON.parse(String(init.body)) as Partial<StoredFile>;
        if (parsed.searchParams.has("addParents")) file.parents = [parsed.searchParams.get("addParents")!];
        Object.assign(file, body);
      }
      return Response.json(file);
    }

    if (parsed.pathname === "/drive/v3/files" && method === "GET") {
      const query = parsed.searchParams.get("q") ?? "";
      const name = query.match(/name = '([^']+)'/)?.[1];
      const parentId = query.match(/'([^']+)' in parents/)?.[1];
      return Response.json({ files: [...files.values()].filter((file) => file.name === name && file.parents?.includes(parentId ?? "") && !file.trashed) });
    }
    if (parsed.pathname === "/drive/v3/files" && method === "POST") {
      const body = JSON.parse(String(init.body)) as Partial<StoredFile>;
      const folder = { ...body, id: `folder-${++sequence}`, trashed: false } as StoredFile;
      files.set(folder.id, folder);
      return Response.json(folder);
    }
    if (parsed.pathname === "/upload/drive/v3/files" && method === "POST") {
      const multipart = await (init.body as Blob).text();
      const metadataText = multipart.match(/Content-Type: application\/json; charset=UTF-8\r\n\r\n([^\r]+)\r\n/)?.[1];
      if (!metadataText) return new Response(null, { status: 400 });
      const metadata = JSON.parse(metadataText) as Partial<StoredFile>;
      const file: StoredFile = {
        ...metadata,
        id: `file-${++sequence}`,
        name: metadata.name ?? "unknown",
        mimeType: "text/plain",
        size: "7",
        createdTime: new Date().toISOString(),
        trashed: false,
        bytes: new TextEncoder().encode("payload"),
      };
      files.set(file.id, file);
      return Response.json(file);
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;

  return { fetchImpl, files, requests };
}

function provider(fetchImpl: typeof fetch) {
  return new GoogleDriveStorageProvider({
    clientId: "client-id",
    clientSecret: "client-secret",
    refreshToken: "refresh-token",
    rootFolderId: "root-folder",
    fetchImpl,
  });
}

describe("GoogleDriveStorageProvider", () => {
  it("ทำ lifecycle ครบและ move เปลี่ยน parent จริงโดยไม่สร้าง public link", async () => {
    const harness = createHarness();
    const storage = provider(harness.fetchImpl);
    const uploaded = await storage.upload({
      path: "temporary/review/creator-a/source.txt",
      fileName: "source.txt",
      mimeType: "text/plain",
      data: new TextEncoder().encode("payload"),
      checksum: "sha256-payload",
    });
    expect(uploaded.provider).toBe("google_drive");
    expect(uploaded.path).toBe("temporary/review/creator-a/source.txt");
    expect(await storage.exists(uploaded.fileId)).toBe(true);
    expect((await storage.getMetadata(uploaded.fileId)).checksum).toBe("sha256-payload");

    const moved = await storage.move(uploaded.fileId, "permanent/media/media-a/source.txt");
    expect(moved.path).toBe("permanent/media/media-a/source.txt");
    const moveRequest = harness.requests.find((request) => request.method === "PATCH" && request.url.includes(`/files/${uploaded.fileId}?`));
    expect(moveRequest?.url).toContain("addParents=");
    expect(moveRequest?.url).toContain("removeParents=");

    const copied = await storage.copy(uploaded.fileId, "backup/media-a/source.txt");
    expect(copied.fileId).not.toBe(uploaded.fileId);
    const response = await storage.download(uploaded.fileId);
    expect(await response.text()).toBe("payload");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain("source.txt");

    await storage.delete(uploaded.fileId);
    expect(await storage.exists(uploaded.fileId)).toBe(false);
    expect(harness.requests.some((request) => request.url.includes("permissions") && request.method !== "GET")).toBe(false);
  });

  it("health ปฏิเสธ root ที่เปิด anyone/domain", async () => {
    const storage = provider(createHarness("public").fetchImpl);
    await expect(storage.health()).resolves.toEqual({ status: "critical", message: "Google Drive private root ไม่พร้อมใช้งาน" });
  });

  it("exists คืน false เฉพาะ 404 และไม่กลบ permission failure", async () => {
    const missing = createHarness();
    await expect(provider(missing.fetchImpl).exists("missing-file")).resolves.toBe(false);

    const deniedFetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "token", expires_in: 3600 });
      return new Response(null, { status: 403 });
    }) as typeof fetch;
    await expect(provider(deniedFetch).exists("denied-file")).rejects.toMatchObject({ status: 403 });
  });

  it("ปฏิเสธไฟล์ที่ไม่ได้ถูกสร้างภายใต้ KruPo root", async () => {
    const harness = createHarness();
    harness.files.set("foreign-file", {
      id: "foreign-file",
      name: "foreign.txt",
      mimeType: "text/plain",
      size: "7",
      parents: ["other-folder"],
      appProperties: { krupoRoot: "other-root", krupoPath: "foreign.txt" },
      trashed: false,
    });
    await expect(provider(harness.fetchImpl).download("foreign-file")).rejects.toMatchObject({ status: 403 });
  });

  it("ปฏิเสธ path traversal ก่อนเรียก Google API", async () => {
    const harness = createHarness();
    await expect(provider(harness.fetchImpl).upload({
      path: "temporary/../foreign.txt",
      fileName: "foreign.txt",
      mimeType: "text/plain",
      data: new Uint8Array(),
    })).rejects.toThrow(/path/);
    expect(harness.fetchImpl).not.toHaveBeenCalled();
  });
});
