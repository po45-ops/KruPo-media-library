const missing=[];
const required=["NEXT_PUBLIC_APP_URL","NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","BOOTSTRAP_ADMIN_EMAIL","MEDIA_URL_ENCRYPTION_KEY"];
for(const key of required)if(!process.env[key])missing.push(key);
if(process.env.NODE_ENV!=="production")missing.push("NODE_ENV=production");
if(process.env.APP_ENV!=="production")missing.push("APP_ENV=production");
if(process.env.PAYMENT_PROVIDER==="mock")missing.push("PAYMENT_PROVIDER ต้องเป็น stripe หรือ disabled");
if(process.env.STORAGE_PROVIDER!=="google_drive"&&process.env.STORAGE_PROVIDER!=="cloudflare_r2")missing.push("STORAGE_PROVIDER ต้องเป็น provider จริง");
if(process.env.RATE_LIMIT_PROVIDER!=="cloudflare")missing.push("RATE_LIMIT_PROVIDER=cloudflare");
if(!process.env.JOB_RUNNER_SECRET)missing.push("JOB_RUNNER_SECRET");
if(process.env.PAYMENT_PROVIDER==="stripe")for(const key of ["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"])if(!process.env[key])missing.push(key);
if(process.env.STORAGE_PROVIDER==="google_drive")for(const key of ["GOOGLE_DRIVE_CLIENT_ID","GOOGLE_DRIVE_CLIENT_SECRET","GOOGLE_DRIVE_REFRESH_TOKEN","GOOGLE_DRIVE_ROOT_FOLDER_ID"])if(!process.env[key])missing.push(key);
if(!process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://"))missing.push("NEXT_PUBLIC_APP_URL ต้องเป็น HTTPS");
if(process.env.CONFIRM_PRODUCTION_DEPLOY!=="I_UNDERSTAND")missing.push("CONFIRM_PRODUCTION_DEPLOY=I_UNDERSTAND");
if(missing.length){console.error(`Production deploy ถูกปฏิเสธ: ${[...new Set(missing)].join(", ")}`);process.exit(1)}
console.log("Production safety guard ผ่าน (ไม่แสดงค่า secret)");
