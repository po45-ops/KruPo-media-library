import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthEmailCallback } from "@/components/auth-email-callback";
import { safeReturnPath } from "@/server/security/return-path";
import { getSupabasePublicConfig } from "@/server/supabase/config";

export const metadata: Metadata = { title: "กำลังยืนยันอีเมล", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const config = getSupabasePublicConfig();
  if (!config) redirect("/login?error=auth_not_configured");
  const params = await searchParams;
  return <AuthEmailCallback url={config.url} publishableKey={config.publishableKey} next={safeReturnPath(params.next)} />;
}
