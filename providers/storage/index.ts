import "server-only";
import { readEnv } from "@/server/env";
import type { StorageProvider, StorageProviderName } from "./storage-provider";
import { LocalTestStorageProvider } from "./local-test-storage";
import { GoogleDriveStorageProvider } from "./google-drive-storage";
import { CloudflareR2StorageProvider } from "./cloudflare-r2-storage";

export function getStorageProvider(requestedProvider?: StorageProviderName): StorageProvider {
  const env = readEnv();
  const provider = requestedProvider ?? env.STORAGE_PROVIDER;
  if (provider === "local_test") {
    return new LocalTestStorageProvider();
  }
  if (provider === "google_drive") {
    if (!env.GOOGLE_DRIVE_CLIENT_ID || !env.GOOGLE_DRIVE_CLIENT_SECRET || !env.GOOGLE_DRIVE_REFRESH_TOKEN || !env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      throw new Error("Google Drive provider credential ไม่ครบ");
    }
    return new GoogleDriveStorageProvider({
      clientId: env.GOOGLE_DRIVE_CLIENT_ID,
      clientSecret: env.GOOGLE_DRIVE_CLIENT_SECRET,
      refreshToken: env.GOOGLE_DRIVE_REFRESH_TOKEN,
      rootFolderId: env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
    });
  }
  return new CloudflareR2StorageProvider();
}
