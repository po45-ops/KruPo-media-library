const DEFAULT_RETURN_PATH = "/my-library";

export function safeReturnPath(value: string | null | undefined, fallback = DEFAULT_RETURN_PATH) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const parsed = new URL(value, "https://krupo.local");
    if (parsed.origin !== "https://krupo.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
