export interface RateLimitResult{allowed:boolean;remaining:number;retryAfterSeconds?:number}
export interface RateLimiter{check(key:string,limit:number,windowSeconds:number):Promise<RateLimitResult>}

type CloudflareRateLimitBinding={limit(input:{key:string}):Promise<{success:boolean}>};
type CloudflareRateLimitEnv={RATE_LIMIT_AUTH?:CloudflareRateLimitBinding;RATE_LIMIT_MUTATION?:CloudflareRateLimitBinding;RATE_LIMIT_ACCESS?:CloudflareRateLimitBinding};

export class DevelopmentRateLimiter implements RateLimiter{
  private hits=new Map<string,{count:number;reset:number}>();
  async check(key:string,limit:number,windowSeconds:number){
    const production=process.env.APP_ENV==="production"||(!process.env.APP_ENV&&process.env.NODE_ENV==="production");
    if(production)throw new Error("Production ต้องใช้ distributed rate limiter");
    const now=Date.now(),old=this.hits.get(key);
    const value=!old||old.reset<=now?{count:1,reset:now+windowSeconds*1000}:{count:old.count+1,reset:old.reset};
    this.hits.set(key,value);
    return {allowed:value.count<=limit,remaining:Math.max(0,limit-value.count),retryAfterSeconds:value.count>limit?Math.ceil((value.reset-now)/1000):undefined};
  }
}

export class CloudflareRateLimiter implements RateLimiter{
  async check(key:string,limit:number,windowSeconds:number){
    const {getCloudflareContext}=await import("@opennextjs/cloudflare");
    const context=await getCloudflareContext({async:true});
    const env=context.env as CloudflareRateLimitEnv;
    const scope=key.split(":",1)[0]??"";
    const binding=scope==="login"||scope==="register"?env.RATE_LIMIT_AUTH:scope==="download"||scope==="game-launch"?env.RATE_LIMIT_ACCESS:env.RATE_LIMIT_MUTATION;
    if(!binding)throw new Error("Cloudflare rate-limit binding ไม่พร้อม");
    const result=await binding.limit({key});
    return {allowed:result.success,remaining:result.success?Math.max(0,limit-1):0,retryAfterSeconds:result.success?undefined:Math.min(windowSeconds,60)};
  }
}

const developmentLimiter=new DevelopmentRateLimiter();
const cloudflareLimiter=new CloudflareRateLimiter();

export async function enforceRequestRateLimit(request:Request,scope:string,limit:number,windowSeconds:number):Promise<Response|null>{
  const address=request.headers.get("cf-connecting-ip")??request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";
  const limiter=process.env.RATE_LIMIT_PROVIDER==="cloudflare"?cloudflareLimiter:developmentLimiter;
  try{
    const result=await limiter.check(`${scope}:${address}`,limit,windowSeconds);
    if(result.allowed)return null;
    return Response.json({error:"ส่งคำขอถี่เกินไป กรุณาลองใหม่ภายหลัง"},{status:429,headers:{"Retry-After":String(result.retryAfterSeconds??windowSeconds),"Cache-Control":"no-store"}});
  }catch{
    return Response.json({error:"ระบบจำกัดคำขอยังไม่พร้อม"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
