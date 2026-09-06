import "server-only";
import { createServerSupabaseClient,isSupabaseConfigured } from "@/server/supabase/server";
import { demoMedia } from "@/features/catalog/demo-media";

type Relation<T>=T|T[]|null;
type MediaRow={
  id:string;slug:string;title_th:string;short_description_th:string;
  access_type:"free"|"paid";delivery_type:"external_link"|"file"|"both";
  price_satang:number;status:string;subject:Relation<{name_th:string}>;
  media_type:Relation<{name_th:string}>;media_grade_levels:Array<{grade_level:Relation<{name_th:string}>}>;
};

export interface UserMediaItem{
  id:string;slug:string;titleTh:string;descriptionTh:string;subject:string;grade:string;mediaType:string;
  accessType:"free"|"paid";deliveryType:"external_link"|"file"|"both";priceSatang:number;status:string;
}
export interface UserOrder{ id:string;status:string;totalSatang:number;createdAt:string;paidAt:string|null;titles:string[]; }
export interface UserProfile{displayName:string;email:string|null;createdAt:string|null}

const mediaColumns="id,slug,title_th,short_description_th,access_type,delivery_type,price_satang,status,subject:subjects(name_th),media_type:media_types(name_th),media_grade_levels(grade_level:grade_levels(name_th))";
function one<T>(value:Relation<T>){return Array.isArray(value)?value[0]??null:value}
function mapMedia(row:MediaRow):UserMediaItem{return {id:row.id,slug:row.slug,titleTh:row.title_th,descriptionTh:row.short_description_th,subject:one(row.subject)?.name_th??"ไม่ระบุวิชา",grade:one(row.media_grade_levels?.[0]?.grade_level??null)?.name_th??"ทุกระดับชั้น",mediaType:one(row.media_type)?.name_th??"สื่อการเรียนรู้",accessType:row.access_type,deliveryType:row.delivery_type,priceSatang:row.price_satang,status:row.status}}
function fallbackMedia():UserMediaItem[]{return demoMedia.map(x=>({id:x.id,slug:x.slug,titleTh:x.titleTh,descriptionTh:x.descriptionTh,subject:x.subject,grade:x.grade,mediaType:x.mediaType,accessType:x.accessType,deliveryType:x.deliveryType,priceSatang:x.priceSatang,status:"development_fixture"}))}

export async function getCartItems(userId:string):Promise<UserMediaItem[]>{
  if(!isSupabaseConfigured())return fallbackMedia().filter(x=>x.priceSatang>0).slice(0,1);
  const db=await createServerSupabaseClient();
  const {data:cart}=await db.from("carts").select("id").eq("user_id",userId).maybeSingle();
  if(!cart)return [];
  const {data,error}=await db.from("cart_items").select(`media:${"media_items"}(${mediaColumns})`).eq("cart_id",cart.id).order("created_at",{ascending:true});
  if(error)throw new Error("อ่านตะกร้าไม่สำเร็จ");
  return (data??[]).flatMap(row=>{const media=one((row as unknown as {media:Relation<MediaRow>}).media);return media?[mapMedia(media)]:[]});
}

export async function getFavoriteItems(userId:string):Promise<UserMediaItem[]>{
  if(!isSupabaseConfigured())return fallbackMedia().slice(1,3);
  const db=await createServerSupabaseClient();
  const {data,error}=await db.from("favorites").select(`media:media_items(${mediaColumns})`).eq("user_id",userId).order("created_at",{ascending:false});
  if(error)throw new Error("อ่านรายการโปรดไม่สำเร็จ");
  return (data??[]).flatMap(row=>{const media=one((row as unknown as {media:Relation<MediaRow>}).media);return media?[mapMedia(media)]:[]});
}

export async function getLibraryItems(userId:string):Promise<Array<UserMediaItem&{source:string;grantedAt:string}>>{
  if(!isSupabaseConfigured())return fallbackMedia().slice(0,4).map(x=>({...x,source:"development_fixture",grantedAt:new Date(0).toISOString()}));
  const db=await createServerSupabaseClient();
  const {data,error}=await db.from("entitlements").select(`source,granted_at,media:media_items(${mediaColumns})`).eq("user_id",userId).is("revoked_at",null).order("granted_at",{ascending:false});
  if(error)throw new Error("อ่านคลังสื่อไม่สำเร็จ");
  return (data??[]).flatMap(row=>{const typed=row as unknown as {source:string;granted_at:string;media:Relation<MediaRow>};const media=one(typed.media);return media?[{...mapMedia(media),source:typed.source,grantedAt:typed.granted_at}]:[]});
}

export async function getPurchaseHistory(userId:string):Promise<UserOrder[]>{
  if(!isSupabaseConfigured())return [
    {id:"development-order-1",status:"paid",totalSatang:1000,createdAt:"2026-09-01T03:00:00.000Z",paidAt:"2026-09-01T03:01:00.000Z",titles:["คณิตคิดไว ป.4","ภารกิจคำศัพท์"]},
    {id:"development-order-2",status:"paid",totalSatang:1000,createdAt:"2026-08-25T03:00:00.000Z",paidAt:"2026-08-25T03:01:00.000Z",titles:["ระบบสุริยะ"]},
  ];
  const db=await createServerSupabaseClient();
  const {data,error}=await db.from("orders").select("id,status,total_satang,created_at,paid_at,order_items(media_title_snapshot)").eq("user_id",userId).order("created_at",{ascending:false}).limit(100);
  if(error)throw new Error("อ่านประวัติการซื้อไม่สำเร็จ");
  return (data??[]).map(row=>{const typed=row as unknown as {id:string;status:string;total_satang:number;created_at:string;paid_at:string|null;order_items:Array<{media_title_snapshot:string}>|null};return {id:typed.id,status:typed.status,totalSatang:typed.total_satang,createdAt:typed.created_at,paidAt:typed.paid_at,titles:(typed.order_items??[]).map(x=>x.media_title_snapshot)}});
}

export async function getUserProfile(userId:string,email:string|null):Promise<UserProfile>{
  if(!isSupabaseConfigured())return {displayName:"สมาชิก KruPo (โหมดพัฒนา)",email,createdAt:"2026-09-03T00:00:00.000Z"};
  const db=await createServerSupabaseClient();
  const {data,error}=await db.from("profiles").select("display_name,created_at").eq("id",userId).single();
  if(error)throw new Error("อ่านข้อมูลบัญชีไม่สำเร็จ");
  return {displayName:data.display_name||"สมาชิก KruPo",email,createdAt:data.created_at};
}
