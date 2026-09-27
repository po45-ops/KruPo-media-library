import "server-only";
import { z } from "zod";
import type { StorageProvider, StorageProviderName } from "./storage-provider";
import { LocalTestStorageProvider } from "./local-test-storage";
import { GoogleDriveStorageProvider } from "./google-drive-storage";
import { CloudflareR2StorageProvider } from "./cloudflare-r2-storage";

const storageEnvironmentSchema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  STORAGE_PROVIDER: z.enum(["local_test", "google_drive", "cloudflare_r2"]).default("local_test"),
  GOOGLE_DRIVE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_DRIVE_CLIENT_SECRET: z.string().trim().min(1).optional(),
  GOOGLE_DRIVE_REFRESH_TOKEN: z.string().trim().min(1).optional(),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().trim().min(1).optional(),
});

export function getStorageProvider(
  requestedProvider?: StorageProviderName,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): StorageProvider {
  const inferredAppEnv = environment.APP_ENV ?? (
    environment.NODE_ENV === "production" ? "production" : environment.NODE_ENV === "test" ? "test" : "development"
  );
  const parsed = storageEnvironmentSchema.safeParse({ ...environment, APP_ENV: inferredAppEnv });
  if (!parsed.success) {
    throw new Error(`การตั้งค่า Storage ไม่ถูกต้อง: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }

  const env = parsed.data;
  const provider = requestedProvider ?? env.STORAGE_PROVIDER;
  if (provider === "local_test") {
    if (env.APP_ENV === "production") throw new Error("Production ห้ามใช้ local_test storage");
    return new LocalTestStorageProvider();
  }
  if (provider === "google_drive") {
    const missing = [
      ["GOOGLE_DRIVE_CLIENT_ID", env.GOOGLE_DRIVE_CLIENT_ID],
      ["GOOGLE_DRIVE_CLIENT_SECRET", env.GOOGLE_DRIVE_CLIENT_SECRET],
      ["GOOGLE_DRIVE_REFRESH_TOKEN", env.GOOGLE_DRIVE_REFRESH_TOKEN],
      ["GOOGLE_DRIVE_ROOT_FOLDER_ID", env.GOOGLE_DRIVE_ROOT_FOLDER_ID],
    ].filter(([, value]) => !value).map(([key]) => key);
    if (missing.length) throw new Error(`Google Drive provider credential ไม่ครบ: ${missing.join(", ")}`);
    return new GoogleDriveStorageProvider({
      clientId: env.GOOGLE_DRIVE_CLIENT_ID!,
      clientSecret: env.GOOGLE_DRIVE_CLIENT_SECRET!,
      refreshToken: env.GOOGLE_DRIVE_REFRESH_TOKEN!,
      rootFolderId: env.GOOGLE_DRIVE_ROOT_FOLDER_ID!,
    });
  }
  return new CloudflareR2StorageProvider();
}
