import { describe, expect, it } from "vitest";
import { getStorageProvider } from "@/providers/storage";

const stagingDriveEnvironment = {
  APP_ENV: "staging",
  STORAGE_PROVIDER: "google_drive",
  GOOGLE_DRIVE_CLIENT_ID: "client-id",
  GOOGLE_DRIVE_CLIENT_SECRET: "client-secret",
  GOOGLE_DRIVE_REFRESH_TOKEN: "refresh-token",
  GOOGLE_DRIVE_ROOT_FOLDER_ID: "private-root",
};

describe("Storage provider configuration isolation", () => {
  it("does not let unrelated payment configuration block Google Drive", () => {
    const storage = getStorageProvider(undefined, {
      ...stagingDriveEnvironment,
      PAYMENT_PROVIDER: "invalid-payment-config",
      STRIPE_SECRET_KEY: "not-a-valid-test-key",
    });

    expect(storage.name).toBe("google_drive");
  });

  it("rejects Google Drive setup when a required credential is absent", () => {
    const incomplete = Object.fromEntries(
      Object.entries(stagingDriveEnvironment).filter(([key]) => key !== "GOOGLE_DRIVE_REFRESH_TOKEN"),
    );

    expect(() => getStorageProvider(undefined, incomplete)).toThrow(/GOOGLE_DRIVE_REFRESH_TOKEN/);
  });

  it("keeps local test storage disabled in production", () => {
    expect(() => getStorageProvider("local_test", {
      APP_ENV: "production",
      STORAGE_PROVIDER: "google_drive",
    })).toThrow(/Production/);
    expect(() => getStorageProvider("local_test", {
      NODE_ENV: "production",
      STORAGE_PROVIDER: "google_drive",
    })).toThrow(/Production/);
  });
});
