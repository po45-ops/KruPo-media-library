import "server-only";
import { createServerSupabaseClient,isSupabaseConfigured } from "@/server/supabase/server";

export interface CreatorDashboardData{
  profileStatus:string;trustLevel:string;mediaCount:number;publishedCount:number;pendingReviewCount:number;
  totalSalesSatang:number;creatorRevenueSatang:number;platformFeeSatang:number;pendingSatang:number;onHoldSatang:number;availableSatang:number;paidSatang:number;
  recentSubmissions:Array<{id:string;status:string;submittedAt:string;title:string}>;
}

const empty:CreatorDashboardData={profileStatus:"not_applied",trustLevel:"new",mediaCount:0,publishedCount:0,pendingReviewCount:0,totalSalesSatang:0,creatorRevenueSatang:0,platformFeeSatang:0,pendingSatang:0,onHoldSatang:0,availableSatang:0,paidSatang:0,recentSubmissions:[]};

export async function getCreatorDashboard(userId:string):Promise<CreatorDashboardData>{
  if(!isSupabaseConfigured())return empty;
  const db=await createServerSupabaseClient();
  const [profileResult,mediaResult,publishedResult,reviewResult,balanceResult,earningResult,submissionsResult]=await Promise.all([
    db.from("creator_profiles").select("status,trust_level").eq("user_id",userId).maybeSingle(),
    db.from("media_items").select("id",{count:"exact",head:true}).eq("creator_id",userId),
    db.from("media_items").select("id",{count:"exact",head:true}).eq("creator_id",userId).in("status",["published","degraded"]),
    db.from("media_submissions").select("id",{count:"exact",head:true}).eq("creator_id",userId).in("status",["submitted","validating","safety_check","copyright_check","human_review"]),
    db.from("creator_balances").select("pending_satang,on_hold_satang,available_satang,paid_satang").eq("creator_id",userId).maybeSingle(),
    db.from("creator_earnings").select("gross_satang,creator_share_satang,platform_share_satang").eq("creator_id",userId).neq("status","reversed"),
    db.from("media_submissions").select("id,status,submitted_at,media:media_items(title_th)").eq("creator_id",userId).order("submitted_at",{ascending:false}).limit(8)
  ]);
  if([profileResult.error,mediaResult.error,publishedResult.error,reviewResult.error,balanceResult.error,earningResult.error,submissionsResult.error].some(Boolean))throw new Error("อ่านแดชบอร์ดผู้สร้างไม่สำเร็จ");
  const profile=profileResult.data,balance=balanceResult.data;
  const earnings=(earningResult.data??[]) as Array<{gross_satang:number;creator_share_satang:number;platform_share_satang:number}>;
  return {
    profileStatus:profile?.status??"not_applied",trustLevel:profile?.trust_level??"new",mediaCount:mediaResult.count??0,publishedCount:publishedResult.count??0,pendingReviewCount:reviewResult.count??0,
    totalSalesSatang:earnings.reduce((sum,x)=>sum+x.gross_satang,0),creatorRevenueSatang:earnings.reduce((sum,x)=>sum+x.creator_share_satang,0),platformFeeSatang:earnings.reduce((sum,x)=>sum+x.platform_share_satang,0),
    pendingSatang:balance?.pending_satang??0,onHoldSatang:balance?.on_hold_satang??0,availableSatang:balance?.available_satang??0,paidSatang:balance?.paid_satang??0,
    recentSubmissions:(submissionsResult.data??[]).map(row=>{const typed=row as unknown as {id:string;status:string;submitted_at:string;media:{title_th:string}|Array<{title_th:string}>|null};const media=Array.isArray(typed.media)?typed.media[0]:typed.media;return {id:typed.id,status:typed.status,submittedAt:typed.submitted_at,title:media?.title_th??"ไม่พบชื่อสื่อ"}})
  };
}
