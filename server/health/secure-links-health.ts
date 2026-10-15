export interface SecureLinksHealth {
  status: "healthy" | "warning" | "critical" | "unknown";
  reason?: "missing_configuration" | "probe_failed";
}

export function assessSecureLinksHealth(storedTargetCount: number, hasEncryptionKey: boolean): SecureLinksHealth {
  if (hasEncryptionKey) return { status: "healthy" };
  return storedTargetCount > 0
    ? { status: "critical", reason: "missing_configuration" }
    : { status: "warning", reason: "missing_configuration" };
}
