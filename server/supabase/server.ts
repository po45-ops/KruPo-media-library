import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/server/supabase/config";

export function isSupabaseConfigured(){return Boolean(getSupabasePublicConfig())}
export async function createServerSupabaseClient(){
  const config=getSupabasePublicConfig();
  if(!config)throw new Error("Supabase ยังไม่ได้ตั้งค่า");
  const store=await cookies();
  return createServerClient(config.url,config.publishableKey,{cookies:{getAll(){return store.getAll()},setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{/* Server Component cannot set cookies; proxy refreshes them. */}}}});
}
