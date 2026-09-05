import {z} from "zod";import {createAdminSupabaseClient} from "@/server/supabase/admin";import {getRequestPrincipal} from "@/server/auth/principal";import {getStorageProvider} from "@/providers/storage";import {enforceRequestRateLimit} from "@/server/security/rate-limit";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{mediaId:string}>}){
  const limited=await enforceRequestRateLimit(request,"download",30,60);if(limited)return limited;
  const {mediaId}=await params;if(!z.string().uuid().safeParse(mediaId).success)return new Response("ไม่พบไฟล์",{status:404});
  const principal=await getRequestPrincipal();if(!principal)return new Response("กรุณาเข้าสู่ระบบ",{status:401,headers:{"Cache-Control":"no-store"}});
  const db=createAdminSupabaseClient(),[{data:right},{data:media}]=await Promise.all([db.from("entitlements").select("id").eq("user_id",principal.userId).eq("media_id",mediaId).is("revoked_at",null).maybeSingle(),db.from("media_items").select("access_type,status").eq("id",mediaId).single()]);
  if(!media||!["published","degraded"].includes(media.status)||(!right&&media.access_type!=="free"))return new Response("คุณไม่มีสิทธิ์ดาวน์โหลด",{status:403,headers:{"Cache-Control":"no-store"}});
  const {data:files}=await db.from("media_files").select("id,storage_file_id,purpose").eq("media_id",mediaId).eq("area","permanent").eq("active",true).in("purpose",["download","source"]).limit(10);
  const file=[...(files??[])].sort((a,b)=>a.purpose==="download"?-1:b.purpose==="download"?1:0)[0];if(!file)return new Response("ไฟล์ยังไม่พร้อม",{status:503,headers:{"Cache-Control":"no-store"}});
  const response=await getStorageProvider().download(file.storage_file_id);await db.from("download_logs").insert({user_id:principal.userId,media_id:mediaId,media_file_id:file.storage_file_id});const headers=new Headers(response.headers);headers.set("Cache-Control","private, no-store");headers.set("X-Content-Type-Options","nosniff");return new Response(response.body,{status:response.status,headers});
}
