import type { StorageMetadata, StorageProvider, UploadInput } from "./storage-provider";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const FILE_FIELDS = "id,name,mimeType,size,createdTime,md5Checksum,parents,trashed,appProperties";

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId: string;
  fetchImpl?: typeof fetch;
}

interface DrivePermission { type?: string; role?: string }
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  md5Checksum?: string;
  parents?: string[];
  trashed?: boolean;
  appProperties?: Record<string, string>;
  permissions?: DrivePermission[];
  capabilities?: { canAddChildren?: boolean };
}

export class GoogleDriveStorageError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GoogleDriveStorageError";
  }
}

function normalizePath(path: string) {
  if (!path || path.startsWith("/") || path.endsWith("/") || /[\0\r\n]/.test(path)) {
    throw new GoogleDriveStorageError("Google Drive storage path ไม่ถูกต้อง");
  }
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.length > 120)) {
    throw new GoogleDriveStorageError("Google Drive storage path ไม่ถูกต้อง");
  }
  return segments;
}

function escapeDriveQuery(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

export class GoogleDriveStorageProvider implements StorageProvider {
  readonly name = "google_drive" as const;
  private accessToken?: { value: string; expiresAt: number };
  private rootValidation?: Promise<void>;
  private readonly fetchImpl: typeof fetch;
  private readonly folderCache = new Map<string, string>();

  constructor(private readonly config: GoogleDriveConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async token(forceRefresh = false) {
    if (!forceRefresh && this.accessToken && this.accessToken.expiresAt > Date.now() + 30_000) return this.accessToken.value;
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
      grant_type: "refresh_token",
    });
    const response = await this.fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new GoogleDriveStorageError("Google Drive authentication failed", response.status);
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new GoogleDriveStorageError("Google Drive authentication response ไม่สมบูรณ์");
    this.accessToken = { value: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000 };
    return data.access_token;
  }

  private async request(url: string, init: RequestInit = {}, retryAuth = true): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${await this.token()}`);
    const response = await this.fetchImpl(url, { ...init, headers });
    if (response.status === 401 && retryAuth) {
      this.accessToken = undefined;
      return this.request(url, init, false);
    }
    if (!response.ok) throw new GoogleDriveStorageError(`Google Drive request failed (${response.status})`, response.status);
    return response;
  }

  private metadata(file: DriveFile, path = file.appProperties?.krupoPath ?? file.appProperties?.path ?? ""): StorageMetadata {
    return {
      provider: this.name,
      fileId: file.id,
      path,
      fileName: file.name,
      mimeType: file.mimeType,
      size: Number(file.size ?? 0),
      checksum: file.appProperties?.sha256 || file.md5Checksum,
      createdAt: file.createdTime,
    };
  }

  private async getRawFile(fileId: string) {
    const response = await this.request(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`);
    return response.json() as Promise<DriveFile>;
  }

  private assertManagedFile(file: DriveFile) {
    if (file.trashed) throw new GoogleDriveStorageError("ไม่พบไฟล์ Google Drive", 404);
    if (file.appProperties?.krupoRoot !== this.config.rootFolderId) {
      throw new GoogleDriveStorageError("ไฟล์อยู่นอก KruPo Staging root", 403);
    }
  }

  private async validateRoot(force = false) {
    if (!force && this.rootValidation) return this.rootValidation;
    const validation = (async () => {
      const fields = "id,name,mimeType,trashed,permissions(type,role),capabilities(canAddChildren)";
      const response = await this.request(`${DRIVE_API}/files/${encodeURIComponent(this.config.rootFolderId)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`);
      const root = await response.json() as DriveFile;
      if (root.trashed || root.mimeType !== FOLDER_MIME_TYPE || root.capabilities?.canAddChildren === false) {
        throw new GoogleDriveStorageError("Google Drive root ไม่พร้อมรับไฟล์", 403);
      }
      if ((root.permissions ?? []).some((permission) => permission.type === "anyone" || permission.type === "domain")) {
        throw new GoogleDriveStorageError("Google Drive root ต้องเป็น private folder", 403);
      }
    })();
    if (!force) this.rootValidation = validation.catch((error) => {
      this.rootValidation = undefined;
      throw error;
    });
    return validation;
  }

  private async findChildFolder(parentId: string, name: string) {
    const query = `'${escapeDriveQuery(parentId)}' in parents and name = '${escapeDriveQuery(name)}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`;
    const url = new URL(`${DRIVE_API}/files`);
    url.searchParams.set("q", query);
    url.searchParams.set("spaces", "drive");
    url.searchParams.set("pageSize", "2");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    url.searchParams.set("fields", "files(id,name,mimeType,parents,trashed,appProperties)");
    const response = await this.request(url.toString());
    const result = await response.json() as { files?: DriveFile[] };
    return result.files?.[0]?.id;
  }

  private async createChildFolder(parentId: string, name: string, logicalPath: string) {
    const response = await this.request(`${DRIVE_API}/files?supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: FOLDER_MIME_TYPE,
        parents: [parentId],
        appProperties: { krupoManaged: "true", krupoRoot: this.config.rootFolderId, krupoPath: logicalPath },
      }),
    });
    const folder = await response.json() as DriveFile;
    return folder.id;
  }

  private async ensureParentFolder(path: string) {
    const directorySegments = normalizePath(path).slice(0, -1);
    let parentId = this.config.rootFolderId;
    let logicalPath = "";
    for (const segment of directorySegments) {
      logicalPath = logicalPath ? `${logicalPath}/${segment}` : segment;
      const cacheKey = `${parentId}:${segment}`;
      let folderId = this.folderCache.get(cacheKey);
      if (!folderId) {
        folderId = await this.findChildFolder(parentId, segment) ?? await this.createChildFolder(parentId, segment, logicalPath);
        this.folderCache.set(cacheKey, folderId);
      }
      parentId = folderId;
    }
    return parentId;
  }

  async upload(input: UploadInput) {
    const path = normalizePath(input.path).join("/");
    await this.validateRoot();
    const parentId = await this.ensureParentFolder(path);
    const boundary = `krupo_${crypto.randomUUID()}`;
    const metadata = {
      name: input.fileName,
      parents: [parentId],
      appProperties: {
        ...(input.metadata ?? {}),
        krupoManaged: "true",
        krupoRoot: this.config.rootFolderId,
        krupoPath: path,
        sha256: input.checksum ?? "",
      },
    };
    const blob = input.data instanceof Blob ? input.data : new Blob([input.data as BlobPart], { type: input.mimeType });
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`,
    ]);
    const response = await this.request(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`, {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    const file = await response.json() as DriveFile;
    this.assertManagedFile(file);
    return this.metadata(file, path);
  }

  async download(fileId: string) {
    const file = await this.getRawFile(fileId);
    this.assertManagedFile(file);
    const response = await this.request(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
    const headers = new Headers(response.headers);
    headers.set("Content-Type", file.mimeType || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    headers.set("Cache-Control", "private, no-store");
    return new Response(response.body, { status: response.status, headers });
  }

  async delete(fileId: string) {
    const file = await this.getRawFile(fileId);
    this.assertManagedFile(file);
    await this.request(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    });
  }

  async exists(fileId: string) {
    try {
      const file = await this.getRawFile(fileId);
      this.assertManagedFile(file);
      return true;
    } catch (error) {
      if (error instanceof GoogleDriveStorageError && (error.status === 404 || error.status === 410)) return false;
      throw error;
    }
  }

  async getMetadata(fileId: string) {
    const file = await this.getRawFile(fileId);
    this.assertManagedFile(file);
    return this.metadata(file);
  }

  async move(fileId: string, destinationPath: string) {
    const path = normalizePath(destinationPath).join("/");
    await this.validateRoot();
    const file = await this.getRawFile(fileId);
    this.assertManagedFile(file);
    const parentId = await this.ensureParentFolder(path);
    const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`);
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("fields", FILE_FIELDS);
    url.searchParams.set("addParents", parentId);
    if (file.parents?.length) url.searchParams.set("removeParents", file.parents.join(","));
    const response = await this.request(url.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appProperties: { ...file.appProperties, krupoPath: path } }),
    });
    const moved = await response.json() as DriveFile;
    this.assertManagedFile(moved);
    return this.metadata(moved, path);
  }

  async copy(fileId: string, destinationPath: string) {
    const path = normalizePath(destinationPath).join("/");
    await this.validateRoot();
    const source = await this.getRawFile(fileId);
    this.assertManagedFile(source);
    const parentId = await this.ensureParentFolder(path);
    const response = await this.request(`${DRIVE_API}/files/${encodeURIComponent(fileId)}/copy?supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: source.name,
        parents: [parentId],
        appProperties: { ...source.appProperties, krupoPath: path },
      }),
    });
    const copy = await response.json() as DriveFile;
    this.assertManagedFile(copy);
    return this.metadata(copy, path);
  }

  async health() {
    try {
      await this.validateRoot(true);
      return { status: "healthy" as const, message: "Google Drive private root พร้อมใช้งาน" };
    } catch {
      return { status: "critical" as const, message: "Google Drive private root ไม่พร้อมใช้งาน" };
    }
  }
}
