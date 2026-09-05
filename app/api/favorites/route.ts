import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestPrincipal } from "@/server/auth/principal";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/server/supabase/server";
import { enforceRequestRateLimit } from "@/server/security/rate-limit";
import { isSameOriginMutation } from "@/server/security/request-origin";

const schema=z.object({mediaId:z.string().uuid()});
async function input(request:Request){if(!isSameOriginMutation(request))return {response:NextResponse.json({error:"invalid origin"},{status:403})};const limited=await enforceRequestRateLimit(request,"favorite",40,300);if(limited)return {response:limited};const principal=await getRequestPrincipal();if(!principal)return {response:NextResponse.json({error:"กรุณาเข้าสู่ระบบ"},{status:401})};if(!isSupabaseConfigured())return {response:NextResponse.json({error:"ฐานข้อมูล Staging ยังไม่ได้ตั้งค่า"},{status:503})};const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return {response:NextResponse.json({error:"รหัสสื่อไม่ถูกต้อง"},{status:400})};return {principal,mediaId:parsed.data.mediaId,db:await createServerSupabaseClient()}}
export async function POST(request:Request){const value=await input(request);if("response" in value)return value.response;const {data:media}=await value.db.from("media_items").select("id").eq("id",value.mediaId).in("status",["published","degraded"]).maybeSingle();if(!media)return NextResponse.json({error:"ไม่พบสื่อ"},{status:404});const {error}=await value.db.from("favorites").upsert({user_id:value.principal.userId,media_id:value.mediaId},{onConflict:"user_id,media_id"});return error?NextResponse.json({error:"บันทึกรายการโปรดไม่สำเร็จ"},{status:500}):NextResponse.json({ok:true},{status:201})}
export async function DELETE(request:Request){const value=await input(request);if("response" in value)return value.response;await value.db.from("favorites").delete().eq("user_id",value.principal.userId).eq("media_id",value.mediaId);return NextResponse.json({ok:true})}
