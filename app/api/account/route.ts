import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestPrincipal } from "@/server/auth/principal";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/server/supabase/server";
import { isSameOriginMutation } from "@/server/security/request-origin";

const schema=z.object({displayName:z.string().trim().min(2).max(80)});
export async function POST(request:Request){const origin=new URL(request.url).origin;if(!isSameOriginMutation(request))return NextResponse.json({error:"invalid origin"},{status:403});const principal=await getRequestPrincipal();if(!principal)return NextResponse.redirect(new URL("/login",origin),303);if(!isSupabaseConfigured())return NextResponse.redirect(new URL("/account?error=database_not_configured",origin),303);const parsed=schema.safeParse(Object.fromEntries(await request.formData()));if(!parsed.success)return NextResponse.redirect(new URL("/account?error=invalid_input",origin),303);const db=await createServerSupabaseClient();const {error}=await db.from("profiles").update({display_name:parsed.data.displayName}).eq("id",principal.userId);return NextResponse.redirect(new URL(error?"/account?error=save_failed":"/account?saved=1",origin),303)}
