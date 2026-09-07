import "server-only";
import type {Principal} from "@/server/auth/principal";import {hasRole} from "@/server/auth/principal";import {createAdminSupabaseClient} from "@/server/supabase/admin";import {getStorageProvider} from "@/providers/storage";
import type {StorageProvider,StorageProviderName} from "@/providers/storage/storage-provider";
const providerNames=new Set<StorageProviderName>(["local_test","google_drive","cloudflare_r2"]);
function storageProviderName(value:string):StorageProviderName{if(!providerNames.has(value as StorageProviderName))throw new Error("Storage provider ไม่รองรับ");return value as StorageProviderName}
export async function approveMediaSubmission(principal:Principal,mediaId:string,reason:string){
  if(!hasRole(principal,["admin","reviewer"]))throw new Error("ไม่มีสิทธิ์ตรวจสื่อ");
  const db=createAdminSupabaseClient(),{data:submission,error:submissionError}=await db.from("media_submissions").select("id,status").eq("media_id",mediaId).eq("status","human_review").single();
  if(submissionError||!submission)throw new Error("ไม่พบ submission ที่พร้อมตรวจ");
  const [{data:files,error:fileError},{data:unresolved,error:riskError}]=await Promise.all([
    db.from("media_files").select("id,storage_provider,storage_file_id,storage_path,malware_status").eq("media_id",mediaId).eq("area","temporary_review").eq("active",true),
    db.from("media_review_results").select("id").eq("submission_id",submission.id).neq("risk","LOW").neq("admin_decision","accept").limit(1),
  ]);
  if(fileError||riskError)throw new Error("อ่านผลตรวจไม่สำเร็จ");
  if((files??[]).some(file=>file.malware_status!=="clean"))throw new Error("ไฟล์ยังไม่มี clean decision จากผู้ตรวจ");
  if(unresolved?.length)throw new Error("ความเสี่ยงยังไม่มีคำตัดสิน");
  const providers=new Map<StorageProviderName,StorageProvider>(),providerFor=(name:string)=>{const parsed=storageProviderName(name);let provider=providers.get(parsed);if(!provider){provider=getStorageProvider(parsed);providers.set(parsed,provider)}return provider};
  const moved:Array<{id:string;storage_provider:string;storage_file_id:string;storage_path:string;newPath:string}>=[];
  try{
    for(const file of files??[]){const newPath=`permanent/media/${mediaId}/${file.id}`;await providerFor(file.storage_provider).move(file.storage_file_id,newPath);moved.push({...file,newPath})}
    const {error}=await db.rpc("finalize_media_approval",{p_media_id:mediaId,p_moved_files:moved.map(file=>({file_id:file.id,storage_path:file.newPath})),p_actor_id:principal.userId,p_reason:reason});
    if(error)throw error;return {ok:true};
  }catch(error){await Promise.all(moved.map(file=>providerFor(file.storage_provider).move(file.storage_file_id,file.storage_path).catch(()=>undefined)));throw error}
}
