import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());
const optionalUrl = z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional());
const optionalEmail = z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional());

const schema=z.object({
  NODE_ENV:z.enum(["development","test","production"]).default("development"),
  APP_ENV:z.enum(["development","test","staging","production"]),
  NEXT_PUBLIC_APP_NAME:z.string().default("KruPo คลังสื่อ"),NEXT_PUBLIC_APP_URL:z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL:optionalUrl,NEXT_PUBLIC_SUPABASE_ANON_KEY:optionalText,SUPABASE_SERVICE_ROLE_KEY:optionalText,BOOTSTRAP_ADMIN_EMAIL:optionalEmail,
  GOOGLE_DRIVE_CLIENT_ID:optionalText,GOOGLE_DRIVE_CLIENT_SECRET:optionalText,GOOGLE_DRIVE_REFRESH_TOKEN:optionalText,GOOGLE_DRIVE_ROOT_FOLDER_ID:optionalText,
  STRIPE_SECRET_KEY:optionalText,STRIPE_WEBHOOK_SECRET:optionalText,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:optionalText,
  PAYMENT_PROVIDER:z.enum(["mock","stripe","disabled"]).default("mock"),STORAGE_PROVIDER:z.enum(["local_test","google_drive","cloudflare_r2"]).default("local_test"),RATE_LIMIT_PROVIDER:z.enum(["memory","cloudflare"]).default("memory"),COPYRIGHT_AI_PROVIDER:z.enum(["NONE","BASIC","ADVANCED"]).default("BASIC"),
  COPYRIGHT_AI_MONTHLY_BUDGET_SATANG:z.coerce.number().int().nonnegative().default(150000),MINIMUM_CHECKOUT_SATANG:z.coerce.number().int().nonnegative().default(1000),MEDIA_URL_ENCRYPTION_KEY:z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional()),
  LINK_CHECK_CONCURRENCY:z.coerce.number().int().min(1).max(20).default(5),LINK_FAILURE_THRESHOLD:z.coerce.number().int().min(1).default(3),LINK_SUSPEND_THRESHOLD:z.coerce.number().int().min(2).default(5),LINK_REPAIR_SLA_HOURS:z.coerce.number().int().min(1).default(72),CREATOR_HOLD_DAYS:z.coerce.number().int().min(0).default(14),MINIMUM_PAYOUT_SATANG:z.coerce.number().int().nonnegative().default(50000)
}).superRefine((v,ctx)=>{
 if(v.APP_ENV==="production"){
  if(v.PAYMENT_PROVIDER==="mock")ctx.addIssue({code:"custom",path:["PAYMENT_PROVIDER"],message:"Production ห้ามใช้ mock payment"});
  if(v.STORAGE_PROVIDER==="local_test")ctx.addIssue({code:"custom",path:["STORAGE_PROVIDER"],message:"Production ห้ามใช้ local_test storage"});
  if(v.RATE_LIMIT_PROVIDER!=="cloudflare")ctx.addIssue({code:"custom",path:["RATE_LIMIT_PROVIDER"],message:"Production ต้องใช้ distributed rate limiter"});
  if(!v.NEXT_PUBLIC_APP_URL.startsWith("https://"))ctx.addIssue({code:"custom",path:["NEXT_PUBLIC_APP_URL"],message:"Production URL ต้องเป็น HTTPS"});
 }
 if(v.PAYMENT_PROVIDER==="stripe"&&(!v.STRIPE_SECRET_KEY||!v.STRIPE_WEBHOOK_SECRET))ctx.addIssue({code:"custom",path:["STRIPE_SECRET_KEY"],message:"Stripe provider ต้องมี server keys"});
 if(v.APP_ENV==="staging"&&v.PAYMENT_PROVIDER==="stripe"&&(!v.STRIPE_SECRET_KEY?.startsWith("sk_test_")||!v.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_")||!v.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")))ctx.addIssue({code:"custom",path:["STRIPE_SECRET_KEY"],message:"Staging อนุญาตเฉพาะ Stripe test keys"});
 if(v.STORAGE_PROVIDER==="google_drive"&&(!v.GOOGLE_DRIVE_CLIENT_ID||!v.GOOGLE_DRIVE_CLIENT_SECRET||!v.GOOGLE_DRIVE_REFRESH_TOKEN||!v.GOOGLE_DRIVE_ROOT_FOLDER_ID))ctx.addIssue({code:"custom",path:["GOOGLE_DRIVE_CLIENT_ID"],message:"Google Drive provider credential ไม่ครบ"});
});
export type AppEnv=z.infer<typeof schema>;
export function readEnv(overrides:Record<string,string|undefined>=process.env):AppEnv{
 const inferredAppEnv=overrides.NODE_ENV==="production"?"production":overrides.NODE_ENV==="test"?"test":"development";
 const result=schema.safeParse({...overrides,APP_ENV:overrides.APP_ENV??inferredAppEnv});
 if(!result.success)throw new Error(`การตั้งค่าระบบไม่พร้อม: ${result.error.issues.map(i=>i.path.join(".")).join(", ")}`);
 return result.data;
}
export function validateProductionSafety(env:AppEnv){if(env.APP_ENV!=="production")return;if(env.PAYMENT_PROVIDER==="mock"||env.STORAGE_PROVIDER==="local_test"||env.RATE_LIMIT_PROVIDER!=="cloudflare")throw new Error("Production safety guard ปฏิเสธ provider จำลองหรือ rate limiter ที่ไม่กระจาย")}
