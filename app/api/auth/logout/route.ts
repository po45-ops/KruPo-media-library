import { NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/server/supabase/server";
import { isSameOriginMutation } from "@/server/security/request-origin";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  if (isSupabaseConfigured()) {
    const client = await createServerSupabaseClient();
    await client.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), 303);
}
