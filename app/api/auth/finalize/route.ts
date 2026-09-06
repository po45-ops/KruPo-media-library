import { NextResponse } from "next/server";
import { bootstrapOwnerIfEligible } from "@/server/auth/bootstrap-owner";
import { enforceRequestRateLimit } from "@/server/security/rate-limit";
import { isSameOriginMutation } from "@/server/security/request-origin";
import { createServerSupabaseClient } from "@/server/supabase/server";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  const limited = await enforceRequestRateLimit(request, "auth-finalize", 10, 300);
  if (limited) return limited;
  const client = await createServerSupabaseClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await bootstrapOwnerIfEligible(user);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
