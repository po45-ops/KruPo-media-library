import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRequestRateLimit } from "@/server/security/rate-limit";
import { isSameOriginMutation } from "@/server/security/request-origin";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/server/supabase/server";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  const limited = await enforceRequestRateLimit(request, "forgot-password", 5, 900);
  if (limited) return limited;

  const email = z.string().email().safeParse(String((await request.formData()).get("email") || ""));
  if (isSupabaseConfigured() && email.success) {
    const client = await createServerSupabaseClient();
    await client.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${origin}/auth/email-callback?next=/reset-password`,
    });
  }

  // Intentionally identical for known and unknown addresses to prevent account enumeration.
  return NextResponse.redirect(new URL("/login?message=reset_if_exists", origin), 303);
}
