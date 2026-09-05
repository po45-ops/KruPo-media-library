import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestPrincipal } from "@/server/auth/principal";
import { createServerSupabaseClient,isSupabaseConfigured } from "@/server/supabase/server";
import { isSameOriginMutation } from "@/server/security/request-origin";
import { enforceRequestRateLimit } from "@/server/security/rate-limit";

const schema=z.object({
  displayName:z.string().trim().min(2).max(100),
  legalName:z.string().trim().min(2).max(150),
  phone:z.string().trim().min(8).max(30),
  creatorType:z.enum(["teacher","student","game_creator","designer","other"]),
  bio:z.string().trim().min(20).max(3000),
  portfolioUrl:z.union([z.literal(""),z.string().url()]).optional(),
  ownershipConfirmed:z.literal("on"),
  agreementAccepted:z.literal("on")
});

export async function POST(request:Request){
  if(!isSameOriginMutation(request))return NextResponse.json({error:"invalid origin"},{status:403});
  const limited=await enforceRequestRateLimit(request,"creator-application",5,3600);
  if(limited)return limited;
  const p=await getRequestPrincipal();
  if(!p)return NextResponse.json({error:"กรุณาเข้าสู่ระบบ"},{status:401});
  if(!isSupabaseConfigured())return NextResponse.json({error:"ฐานข้อมูล Staging ยังไม่ได้ตั้งค่า"},{status:503});
  const parsed=schema.safeParse(Object.fromEntries(await request.formData()));
  if(!parsed.success)return NextResponse.json({error:"ข้อมูลไม่ครบ",fields:parsed.error.flatten().fieldErrors},{status:400});
  const db=await createServerSupabaseClient();
  const {error}=await db.from("creator_applications").insert({
    user_id:p.userId,
    display_name:parsed.data.displayName,
    legal_name:parsed.data.legalName,
    phone:parsed.data.phone,
    creator_type:parsed.data.creatorType,
    bio:parsed.data.bio,
    portfolio_url:parsed.data.portfolioUrl||null,
    ownership_confirmed_at:new Date().toISOString(),
    seller_agreement_version:"v1-template",
    status:"pending"
  });
  if(error)return NextResponse.json({error:"บันทึกใบสมัครไม่สำเร็จ"},{status:409});
  return NextResponse.json({ok:true,status:"pending"},{status:201});
}
