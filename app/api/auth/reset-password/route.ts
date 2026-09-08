import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRequestRateLimit } from "@/server/security/rate-limit";
import { isSameOriginMutation } from "@/server/security/request-origin";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/server/supabase/server";

const schema = z
  .object({
    password: z.string().min(10).max(128),
    confirmPassword: z.string().min(10).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"] });

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  const limited = await enforceRequestRateLimit(request, "reset-password", 5, 900);
  if (limited) return limited;
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/reset-password?error=auth_not_configured", origin), 303);
  }

  const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/reset-password?error=invalid_password", origin), 303);
  }

  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=recovery_session_required", origin), 303);

  const { error } = await client.auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.redirect(new URL("/reset-password?error=update_failed", origin), 303);

  // End the recovery session after success so the owner signs in again with the new password.
  await client.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login?message=password_updated", origin), 303);
}
