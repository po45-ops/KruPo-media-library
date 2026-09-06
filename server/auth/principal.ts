import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/types/domain";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/server/supabase/server";

export interface Principal { userId:string; email:string|null; roles:Role[]; }

export async function getRequestPrincipal():Promise<Principal|null>{
  if(!isSupabaseConfigured()){
    const appEnv=process.env.APP_ENV??(process.env.NODE_ENV==="test"?"test":"development");
    if(appEnv==="development"||appEnv==="test") return {userId:"00000000-0000-4000-8000-000000000001",email:"dev-owner@local.invalid",roles:["owner"]};
    return null;
  }
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;
  const {data}=await supabase.from("user_roles").select("role").eq("user_id",user.id).is("revoked_at",null);
  return {userId:user.id,email:user.email??null,roles:(data??[]).map(x=>x.role as Role)};
}

export async function requirePrincipal(next="/my-library"):Promise<Principal>{const p=await getRequestPrincipal();if(!p)redirect(`/login?next=${encodeURIComponent(next)}`);return p;}
export async function requireAnyRole(allowed:Role[],next="/admin"):Promise<Principal>{const p=await getRequestPrincipal();if(!p)redirect(`/login?next=${encodeURIComponent(next)}`);if(!p.roles.some(r=>r==="owner"||allowed.includes(r)))redirect("/unauthorized");return p;}

export function hasRole(principal:Principal,allowed:Role[]):boolean{return principal.roles.includes("owner")||principal.roles.some(r=>allowed.includes(r));}
