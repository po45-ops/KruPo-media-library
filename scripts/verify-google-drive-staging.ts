import { GoogleDriveStorageProvider } from "../providers/storage/google-drive-storage";

async function sha256(input: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", input as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`ยังไม่ได้ตั้งค่า ${name}`);
  return value;
}

async function main() {
  if (process.env.APP_ENV !== "staging") throw new Error("คำสั่งนี้อนุญาตเฉพาะ APP_ENV=staging");
  if (process.env.STORAGE_PROVIDER !== "google_drive") throw new Error("ต้องกำหนด STORAGE_PROVIDER=google_drive");
  const storage = new GoogleDriveStorageProvider({
    clientId: required("GOOGLE_DRIVE_CLIENT_ID"),
    clientSecret: required("GOOGLE_DRIVE_CLIENT_SECRET"),
    refreshToken: required("GOOGLE_DRIVE_REFRESH_TOKEN"),
    rootFolderId: required("GOOGLE_DRIVE_ROOT_FOLDER_ID"),
  });
  const health = await storage.health();
  if (health.status !== "healthy") throw new Error("Google Drive private-root health ไม่ผ่าน");

  const bytes = new TextEncoder().encode(`KruPo Staging storage verification ${crypto.randomUUID()}`);
  const checksum = await sha256(bytes);
  const testId = crypto.randomUUID();
  const createdIds: string[] = [];
  try {
    const uploaded = await storage.upload({
      path: `temporary/review/storage-verification/${testId}.txt`,
      fileName: `krupo-storage-verification-${testId}.txt`,
      mimeType: "text/plain",
      data: bytes,
      checksum,
      metadata: { krupoPurpose: "staging-verification" },
    });
    createdIds.push(uploaded.fileId);
    if (!await storage.exists(uploaded.fileId)) throw new Error("exists หลัง upload ไม่ผ่าน");
    const metadata = await storage.getMetadata(uploaded.fileId);
    if (metadata.checksum !== checksum || metadata.size !== bytes.byteLength || metadata.mimeType !== "text/plain") {
      throw new Error("metadata/checksum หลัง upload ไม่ตรง");
    }
    const downloaded = new Uint8Array(await (await storage.download(uploaded.fileId)).arrayBuffer());
    if (await sha256(downloaded) !== checksum) throw new Error("download checksum ไม่ตรง");

    const moved = await storage.move(uploaded.fileId, `permanent/verification/${testId}.txt`);
    if (moved.path !== `permanent/verification/${testId}.txt`) throw new Error("move path ไม่ตรง");
    const copied = await storage.copy(uploaded.fileId, `backup/verification/${testId}.txt`);
    createdIds.push(copied.fileId);
    if (copied.fileId === uploaded.fileId || copied.checksum !== checksum) throw new Error("copy verification ไม่ผ่าน");
  } finally {
    await Promise.all(createdIds.map((fileId) => storage.delete(fileId).catch(() => undefined)));
  }
  const deleted = await Promise.all(createdIds.map((fileId) => storage.exists(fileId)));
  if (deleted.some(Boolean)) throw new Error("safe-delete verification ไม่ผ่าน");
  console.log(JSON.stringify({ provider: "google_drive", private_root: "passed", upload: "passed", metadata: "passed", checksum: "passed", download: "passed", move: "passed", copy: "passed", safe_delete: "passed" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Google Drive Staging verification failed");
  process.exit(1);
});
