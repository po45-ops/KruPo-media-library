import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestPrincipal } from "@/server/auth/principal";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/server/supabase/server";
import { enforceRequestRateLimit } from "@/server/security/rate-limit";
import { isSameOriginMutation } from "@/server/security/request-origin";

const schema=z.object({mediaId:z.string().uuid()});

async function context(request:Request){
  if(!isSameOriginMutation(request))return {response:NextResponse.json({error:"invalid origin"},{status:403})};
  const limited=await enforceRequestRateLimit(request,"cart",40,300);if(limited)return {response:limited};
  const principal=await getRequestPrincipal();if(!principal)return {response:NextResponse.json({error:"กรุณาเข้าสู่ระบบ"},{status:401})};
  if(!isSupabaseConfigured())return {response:NextResponse.json({error:"ฐานข้อมูล Staging ยังไม่ได้ตั้งค่า"},{status:503})};
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return {response:NextResponse.json({error:"รหัสสื่อไม่ถูกต้อง"},{status:400})};
  return {principal,mediaId:parsed.data.mediaId,db:await createServerSupabaseClient()};
}

export async function POST(request:Request){
  const value=await context(request);if("response" in value)return value.response;
  const {data:media}=await value.db.from("media_items").select("id,access_type,status").eq("id",value.mediaId).in("status",["published","degraded"]).maybeSingle();
  if(!media||media.access_type!=="paid")return NextResponse.json({error:"สื่อนี้ไม่สามารถเพิ่มลงตะกร้า"},{status:409});
  const {data:cart,error:cartError}=await value.db.from("carts").upsert({user_id:value.principal.userId},{onConflict:"user_id"}).select("id").single();
  if(cartError||!cart)return NextResponse.json({error:"สร้างตะกร้าไม่สำเร็จ"},{status:500});
  const {error}=await value.db.from("cart_items").upsert({cart_id:cart.id,media_id:value.mediaId},{onConflict:"cart_id,media_id"});
  if(error)return NextResponse.json({error:"เพิ่มสื่อไม่สำเร็จ"},{status:500});
  return NextResponse.json({ok:true},{status:201});
}

export async function DELETE(request:Request){
  const value=await context(request);if("response" in value)return value.response;
  const {data:cart}=await value.db.from("carts").select("id").eq("user_id",value.principal.userId).maybeSingle();
  if(cart)await value.db.from("cart_items").delete().eq("cart_id",cart.id).eq("media_id",value.mediaId);
  return NextResponse.json({ok:true});
}
