import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const CALLBACK_PATH = "/oauth2/callback";

type InstalledClient = {
  client_id: string;
  client_secret: string;
  auth_uri: string;
  token_uri: string;
};

type ClientDocument = {
  installed?: Partial<InstalledClient>;
};

function requireStagingEnvironment() {
  if (process.env.APP_ENV !== "staging") {
    throw new Error("คำสั่ง OAuth นี้อนุญาตเฉพาะ APP_ENV=staging");
  }
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
}

function isInstalledClient(value: Partial<InstalledClient> | undefined): value is InstalledClient {
  return Boolean(value?.client_id && value.client_secret && value.auth_uri && value.token_uri);
}

async function findOAuthClient() {
  const downloads = join(homedir(), "Downloads");
  const candidates = (await readdir(downloads, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(downloads, entry.name));
  const valid: Array<{ path: string; client: InstalledClient }> = [];

  for (const path of candidates) {
    try {
      const document = JSON.parse(await readFile(path, "utf8")) as ClientDocument;
      if (isInstalledClient(document.installed)) valid.push({ path, client: document.installed });
    } catch {
      // ไฟล์ JSON อื่นใน Downloads ไม่ใช่ OAuth client และไม่ต้องรายงานชื่อไฟล์
    }
  }

  if (valid.length !== 1) {
    throw new Error(`ต้องมี Desktop OAuth Client JSON ที่ถูกต้องเพียง 1 ไฟล์ใน Downloads (พบ ${valid.length})`);
  }
  await chmod(valid[0].path, 0o600);
  return valid[0].client;
}

function base64Url(value: Buffer) {
  return value.toString("base64url");
}

function sameState(received: string | null, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function html(message: string) {
  return `<!doctype html><html lang="th"><meta charset="utf-8"><title>KruPo Staging OAuth</title><body style="font-family:system-ui;padding:3rem;line-height:1.7"><h1>${message}</h1><p>กลับไปที่ Codex เพื่อดูผลการตรวจสอบได้เลย</p></body></html>`;
}

async function exchangeAuthorizationCode(client: InstalledClient, code: string, redirectUri: string, verifier: string) {
  const response = await fetch(client.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const token = await response.json() as { access_token?: string; refresh_token?: string; scope?: string; error?: string };
  if (!response.ok || !token.access_token || !token.refresh_token) {
    throw new Error(`แลก OAuth token ไม่สำเร็จ (${response.status})`);
  }
  const scopes = new Set((token.scope ?? "").split(" ").filter(Boolean));
  if (!scopes.has(DRIVE_FILE_SCOPE) || scopes.size !== 1) {
    throw new Error("OAuth token ไม่ได้จำกัดอยู่ที่ scope drive.file เพียงรายการเดียว");
  }
  return { accessToken: token.access_token, refreshToken: token.refresh_token };
}

async function probeRoot(accessToken: string, rootFolderId: string) {
  const fields = "id,mimeType,trashed,permissions(type,role),capabilities(canAddChildren)";
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootFolderId)}`);
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("fields", fields);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`ตรวจ Google Drive root ไม่สำเร็จ (${response.status})`);
  return true;
}

async function createPrivateRoot(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "KruPo Staging App Storage",
      mimeType: "application/vnd.google-apps.folder",
      appProperties: { krupoManaged: "true", krupoEnvironment: "staging" },
    }),
  });
  const created = await response.json() as { id?: string };
  if (!response.ok || !created.id) throw new Error(`สร้าง private staging root ไม่สำเร็จ (${response.status})`);
  return created.id;
}

async function ensurePrivateRoot(accessToken: string, configuredRootFolderId?: string) {
  if (configuredRootFolderId && await probeRoot(accessToken, configuredRootFolderId)) return configuredRootFolderId;
  return createPrivateRoot(accessToken);
}

async function persistLocalCredentials(client: InstalledClient, refreshToken: string, rootFolderId: string) {
  const directory = join(homedir(), "Library", "Application Support", "KruPo Staging");
  const path = join(directory, "google-drive-staging-credentials.json");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify({
    GOOGLE_DRIVE_CLIENT_ID: client.client_id,
    GOOGLE_DRIVE_CLIENT_SECRET: client.client_secret,
    GOOGLE_DRIVE_REFRESH_TOKEN: refreshToken,
    GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId,
  }), { mode: 0o600 });
  await chmod(directory, 0o700);
  await chmod(path, 0o600);
  return path;
}

async function runVerifier(client: InstalledClient, refreshToken: string, rootFolderId: string) {
  const result = spawnSync("pnpm", ["storage:verify:google-drive:staging"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      APP_ENV: "staging",
      STORAGE_PROVIDER: "google_drive",
      GOOGLE_DRIVE_CLIENT_ID: client.client_id,
      GOOGLE_DRIVE_CLIENT_SECRET: client.client_secret,
      GOOGLE_DRIVE_REFRESH_TOKEN: refreshToken,
      GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId,
    },
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "Google Drive staging verifier ไม่ผ่าน");
  }
}

async function main() {
  const configuredRootFolderId = requireStagingEnvironment();
  const client = await findOAuthClient();
  const state = base64Url(randomBytes(32));
  const verifier = base64Url(randomBytes(64));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());

  let settled = false;
  let resolveFlow!: () => void;
  let rejectFlow!: (error: Error) => void;
  const flow = new Promise<void>((resolve, reject) => {
    resolveFlow = resolve;
    rejectFlow = reject;
  });

  const server = createServer(async (request, response) => {
    if (settled) {
      response.writeHead(409, { "Content-Type": "text/plain; charset=utf-8" }).end("OAuth flow already completed");
      return;
    }
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (requestUrl.pathname === "/start") {
        response.writeHead(302, { Location: createAuthorizationUrl(), "Cache-Control": "no-store" }).end();
        return;
      }
      if (requestUrl.pathname !== CALLBACK_PATH) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
        return;
      }
      if (!sameState(requestUrl.searchParams.get("state"), state)) throw new Error("OAuth state ไม่ถูกต้อง");
      const code = requestUrl.searchParams.get("code");
      if (!code) throw new Error(requestUrl.searchParams.get("error") ?? "ไม่พบ authorization code");
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("อ่าน callback listener ไม่ได้");
      const redirectUri = `http://127.0.0.1:${address.port}${CALLBACK_PATH}`;
      const token = await exchangeAuthorizationCode(client, code, redirectUri, verifier);
      const rootFolderId = await ensurePrivateRoot(token.accessToken, configuredRootFolderId);
      await persistLocalCredentials(client, token.refreshToken, rootFolderId);
      await runVerifier(client, token.refreshToken, rootFolderId);
      settled = true;
      console.log("OAUTH_REFRESH_TOKEN_READY stored_outside_repository=true");
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(html("อนุมัติ KruPo Staging สำเร็จ"));
      resolveFlow();
    } catch (error) {
      settled = true;
      response.writeHead(400, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(html("การตรวจสอบยังไม่สำเร็จ"));
      rejectFlow(error instanceof Error ? error : new Error("OAuth callback failed"));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("เริ่ม OAuth callback listener ไม่สำเร็จ");
  const port = address.port;
  function createAuthorizationUrl() {
    const redirectUri = `http://127.0.0.1:${port}${CALLBACK_PATH}`;
    const authorizationUrl = new URL(client.auth_uri);
    authorizationUrl.search = new URLSearchParams({
      access_type: "offline",
      client_id: client.client_id,
      code_challenge: challenge,
      code_challenge_method: "S256",
      include_granted_scopes: "false",
      prompt: "consent",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: DRIVE_FILE_SCOPE,
      state,
    }).toString();
    return authorizationUrl.toString();
  }

  console.log(`OAUTH_LISTENER_READY port=${port} scope=drive.file`);
  spawn("open", [`http://127.0.0.1:${port}/start`], { detached: true, stdio: "ignore" }).unref();

  try {
    await flow;
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Google Drive Staging OAuth failed");
  process.exitCode = 1;
});
