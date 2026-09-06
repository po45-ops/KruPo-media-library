export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

// Read through an environment object so Next.js does not freeze NEXT_PUBLIC_ values
// during the build. KruPo's Supabase clients currently run only on server surfaces.
export function getSupabasePublicConfig(environment: Readonly<Record<string, string | undefined>> = process.env): SupabasePublicConfig | null {
  const url = environment["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = environment["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  return url && publishableKey ? { url, publishableKey } : null;
}
