import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { bootstrapOwnerIfEligible } from "@/server/auth/bootstrap-owner";
import { safeReturnPath } from "@/server/security/return-path";
import { createServerSupabaseClient } from "@/server/supabase/server";

const emailOtpTypes = new Set<EmailOtpType>(["email", "recovery", "invite", "email_change"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const requestedType = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeReturnPath(url.searchParams.get("next"));

  if (tokenHash && requestedType && emailOtpTypes.has(requestedType)) {
    const client = await createServerSupabaseClient();
    const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: requestedType });
    if (!error && data.user) {
      await bootstrapOwnerIfEligible(data.user);
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation_failed", url.origin));
}
