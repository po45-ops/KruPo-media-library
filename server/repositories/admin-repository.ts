import "server-only";
import { createAdminSupabaseClient } from "@/server/supabase/admin";

export interface AdminDashboardData{
  salesTodaySatang:number;users:number;creators:number;media:number;games:number;pendingReviews:number;brokenLinks:number;copyrightClaims:number;payoutPending:number;aiUsedSatang:number;
}
export interface FeatureFlagSummary{key:string;enabled:boolean;description:string}

const empty:AdminDashboardData={salesTodaySatang:0,users:0,creators:0,media:0,games:0,pendingReviews:0,brokenLinks:0,copyrightClaims:0,payoutPending:0,aiUsedSatang:0};
const configured=()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
const startOfBangkokDay=()=>{const now=new Date();const bangkokDate=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);return new Date(`${bangkokDate}T00:00:00+07:00`).toISOString()};
const startOfMonth=()=>{const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit"}).format(new Date());return new Date(`${parts}-01T00:00:00+07:00`).toISOString()};

export async function getAdminDashboard():Promise<AdminDashboardData>{
  if(!configured())return empty;
  const db=createAdminSupabaseClient();
  const [sales,users,creators,media,games,reviews,links,claims,payouts,ai]=await Promise.all([
    db.from("orders").select("total_satang").eq("status","paid").gte("paid_at",startOfBangkokDay()),
    db.from("profiles").select("id",{count:"exact",head:true}),
    db.from("creator_profiles").select("user_id",{count:"exact",head:true}).in("status",["approved","verified","trusted"]),
    db.from("media_items").select("id",{count:"exact",head:true}).in("status",["published","degraded"]),
    db.from("media_items").select("id,media_type:media_types!inner(slug)").in("status",["published","degraded"]).eq("media_type.slug","game"),
    db.from("media_submissions").select("id",{count:"exact",head:true}).in("status",["submitted","validating","safety_check","copyright_check","human_review"]),
    db.from("link_health_checks").select("target_id,status,checked_at").order("checked_at",{ascending:false}).limit(2000),
    db.from("copyright_claims").select("id",{count:"exact",head:true}).in("status",["under_review","media_hold","awaiting_creator","decision"]),
    db.from("payouts").select("id",{count:"exact",head:true}).in("status",["draft","approved","processing"]),
    db.from("ai_usage_events").select("cost_satang").gte("created_at",startOfMonth())
  ]);
  const errors=[sales.error,users.error,creators.error,media.error,games.error,reviews.error,links.error,claims.error,payouts.error,ai.error].filter(Boolean);
  if(errors.length)throw new Error("อ่าน KPI ผู้ดูแลไม่สำเร็จ");
  const latest=new Map<string,string>();
  for(const row of links.data??[])if(!latest.has(row.target_id))latest.set(row.target_id,row.status);
  return {salesTodaySatang:(sales.data??[]).reduce((sum,x)=>sum+x.total_satang,0),users:users.count??0,creators:creators.count??0,media:media.count??0,games:games.data?.length??0,pendingReviews:reviews.count??0,brokenLinks:[...latest.values()].filter(x=>x==="broken").length,copyrightClaims:claims.count??0,payoutPending:payouts.count??0,aiUsedSatang:(ai.data??[]).reduce((sum,x)=>sum+x.cost_satang,0)};
}

export async function getFeatureFlags():Promise<FeatureFlagSummary[]>{
  if(!configured())return [];
  const {data,error}=await createAdminSupabaseClient().from("feature_flags").select("key,enabled,description_th").order("key");
  if(error)throw new Error("อ่าน feature flags ไม่สำเร็จ");
  return (data??[]).map(row=>({key:row.key,enabled:row.enabled,description:row.description_th}));
}

const date=(value:string|null|undefined)=>value?new Intl.DateTimeFormat("th-TH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Bangkok"}).format(new Date(value)):"—";
const baht=(value:number|null|undefined)=>`${((value??0)/100).toLocaleString("th-TH")} บาท`;

export async function getAdminSectionRows(section:string):Promise<string[][]>{
  if(!configured())return [];
  const db=createAdminSupabaseClient();
  switch(section){
    case "media":{const {data,error}=await db.from("media_items").select("title_th,price_satang,status,updated_at,creator:creator_profiles(display_name)").order("updated_at",{ascending:false}).limit(100);if(error)throw error;return (data??[]).map(row=>[row.title_th,relationName(row.creator),baht(row.price_satang),row.status,date(row.updated_at)])}
    case "reviews":{const {data,error}=await db.from("media_submissions").select("status,submitted_at,reviewed_by,media:media_items(title_th),media_review_results(risk,check_type)").order("submitted_at",{ascending:true}).limit(100);if(error)throw error;return (data??[]).map(row=>{const typed=row as unknown as {status:string;submitted_at:string;reviewed_by:string|null;media:unknown;media_review_results:Array<{risk:string;check_type:string}>};return [relationName(typed.media,"title_th"),typed.media_review_results.map(x=>`${x.check_type}: ${x.risk}`).join(", ")||"รอตรวจ","ต้องบันทึก clean/manual-review",typed.reviewed_by??"ยังไม่รับงาน",typed.status]})}
    case "creators":{const {data,error}=await db.from("creator_profiles").select("display_name,trust_level,status,user_id").order("created_at",{ascending:false}).limit(100);if(error)throw error;return (data??[]).map(row=>[row.display_name,row.trust_level,"ดูในหน้าสื่อ","ดูจาก Ledger",row.status])}
    case "applications":{const {data,error}=await db.from("creator_applications").select("display_name,creator_type,created_at,reviewed_by,status").order("created_at",{ascending:true}).limit(100);if(error)throw error;return (data??[]).map(row=>[row.display_name,row.creator_type,date(row.created_at),row.reviewed_by??"ยังไม่รับงาน",row.status])}
    case "orders":{const {data,error}=await db.from("orders").select("id,user_id,total_satang,status,payment_provider,created_at").order("created_at",{ascending:false}).limit(100);if(error)throw error;return (data??[]).map(row=>[row.id.slice(0,8),row.user_id.slice(0,8),baht(row.total_satang),row.payment_provider??"—",row.status])}
    case "users":{const {data,error}=await db.from("profiles").select("id,display_name,created_at,updated_at,status").order("created_at",{ascending:false}).limit(100);if(error)throw error;return (data??[]).map(row=>[row.display_name||row.id.slice(0,8),date(row.created_at),"ดูในคำสั่งซื้อ",date(row.updated_at),row.status])}
    case "finance":{const {data,error}=await db.from("creator_balances").select("creator_id,on_hold_satang,available_satang,paid_satang,calculated_at").order("calculated_at",{ascending:false}).limit(100);if(error)throw error;return (data??[]).map(row=>[row.creator_id.slice(0,8),baht(row.on_hold_satang),baht(row.available_satang),baht(row.paid_satang),date(row.calculated_at)])}
    case "payouts":{const {data,error}=await db.from("payouts").select("id,creator_id,amount_satang,external_reference,status,created_at").order("created_at",{ascending:false}).limit(100);if(error)throw error;return (data??[]).map(row=>[row.id.slice(0,8),row.creator_id.slice(0,8),baht(row.amount_satang),row.external_reference??"—",row.status])}
    case "links":{const {data,error}=await db.from("link_health_checks").select("media_id,http_status,status,next_check_at,target:media_secure_targets(source_platform)").order("checked_at",{ascending:false}).limit(100);if(error)throw error;return (data??[]).map(row=>[row.media_id.slice(0,8),relationName(row.target,"source_platform"),String(row.http_status??"—"),row.status,date(row.next_check_at)])}
    case "copyright":{const {data,error}=await db.from("copyright_claims").select("id,reported_media_reference,claimant_name,status,created_at").order("created_at",{ascending:true}).limit(100);if(error)throw error;return (data??[]).map(row=>[row.id.slice(0,8),row.reported_media_reference,row.claimant_name,"Human review",row.status])}
    case "ai":{const {data,error}=await db.from("ai_usage_events").select("provider,cost_satang,created_at,model").order("created_at",{ascending:false}).limit(100);if(error)throw error;return (data??[]).map(row=>[date(row.created_at),`${row.provider}${row.model?`/${row.model}`:""}`,baht(row.cost_satang),"อ่านจากงบระบบ","บันทึกแล้ว"])}
    case "audit":{const {data,error}=await db.from("admin_audit_logs").select("created_at,actor_id,action,entity,reason").order("created_at",{ascending:false}).limit(100);if(error)throw error;return (data??[]).map(row=>[date(row.created_at),row.actor_id?.slice(0,8)??"ระบบ",row.action,row.entity,row.reason??"—"])}
    case "settings":{const {data,error}=await db.from("system_settings").select("key,value,updated_at,updated_by,description_th").order("key");if(error)throw error;return (data??[]).map(row=>[row.description_th,JSON.stringify(row.value),date(row.updated_at),row.updated_by?.slice(0,8)??"ระบบ",row.key])}
    default:return [];
  }
}

function relationName(value:unknown,key="display_name"){
  const one=Array.isArray(value)?value[0]:value;
  if(!one||typeof one!=="object")return "—";
  const record=one as Record<string,unknown>;
  return typeof record[key]==="string"?record[key] as string:"—";
}
