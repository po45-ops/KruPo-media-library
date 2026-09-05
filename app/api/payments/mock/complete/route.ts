import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestPrincipal } from "@/server/auth/principal";
import { createAdminSupabaseClient } from "@/server/supabase/admin";
import { getPaymentProvider } from "@/providers/payments";
import { isSameOriginMutation } from "@/server/security/request-origin";

const schema=z.object({orderId:z.string().uuid()});
export async function POST(request:Request){
  if(!isSameOriginMutation(request))return NextResponse.json({error:"invalid origin"},{status:403});
  const appEnv=process.env.APP_ENV??(process.env.NODE_ENV==="test"?"test":"development");
  if(process.env.PAYMENT_PROVIDER!=="mock"||!(["development","test","staging"] as string[]).includes(appEnv))return NextResponse.json({error:"Mock payment ปิดอยู่"},{status:404});
  const principal=await getRequestPrincipal();if(!principal)return NextResponse.json({error:"กรุณาเข้าสู่ระบบ"},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"คำสั่งซื้อไม่ถูกต้อง"},{status:400});
  const db=createAdminSupabaseClient();
  const {data:order}=await db.from("orders").select("id,total_satang,status").eq("id",parsed.data.orderId).eq("user_id",principal.userId).single();
  if(!order||order.status!=="awaiting_payment")return NextResponse.json({error:"คำสั่งซื้อไม่พร้อมชำระ"},{status:409});
  const provider=getPaymentProvider();const payload=JSON.stringify({eventId:`mock_${crypto.randomUUID()}`,orderId:order.id,amountSatang:order.total_satang,status:"paid"});
  const event=await provider.verifyWebhook(payload,null);const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(payload)).then(x=>[...new Uint8Array(x)].map(b=>b.toString(16).padStart(2,"0")).join(""));
  const {data,error}=await db.rpc("process_verified_payment_event",{p_provider:provider.name,p_event_id:event.eventId,p_provider_payment_id:event.providerPaymentId,p_order_id:event.orderId,p_status:event.status,p_amount_satang:event.amountSatang,p_event_type:event.rawType,p_payload_hash:hash});
  if(error)return NextResponse.json({error:"ยืนยันการชำระแบบทดสอบไม่สำเร็จ"},{status:500});return NextResponse.json({ok:true,result:data});
}
