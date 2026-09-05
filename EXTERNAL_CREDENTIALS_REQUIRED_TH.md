# External credentials ที่เจ้าของต้องเตรียม — KruPo คลังสื่อ

ใช้ค่าของ **Staging/Sandbox เท่านั้น** ในรอบนี้ ห้ามส่ง secret ผ่านแชตหรือ commit ลง Git ให้ใส่ผ่าน `.env.local`, Cloudflare encrypted secrets หรือ secret manager ของ CI

## 1. Supabase Staging

สร้าง Project แยกสำหรับ Staging แล้วดูค่าจาก Project **Connect** หรือ **Settings → API Keys** ตาม [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys)

| ตัวแปร | ได้จากไหน | Secret |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Connect / Project URL | ไม่ใช่ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_...`) หรือ legacy anon key | ไม่ใช่ แต่ต้องพึ่ง RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) หรือ legacy service_role | **ใช่ — bypass RLS, server-only** |
| `SUPABASE_PROJECT_REF` | Project Settings / URL ของ Project | ไม่ใช่ |
| `BOOTSTRAP_ADMIN_EMAIL` | อีเมล Owner ที่เจ้าของเลือก | ไม่ใช่ credential แต่เป็น security-sensitive config |

ตั้ง Supabase Auth เพิ่มเติม:

- เปิด Email + Password และ Require email verification
- สร้าง Site URL/Redirect URLs สำหรับ `https://<staging-worker>.workers.dev/auth/callback`
- เปิด Google provider โดยใส่ Google Login Client ID/Client Secret ใน Supabase Dashboard; ค่า Google secret นี้ไม่ต้องใส่ใน source ของ KruPo

## 2. Google Drive Storage (Staging)

เปิด Google Drive API ใน Google Cloud Console สร้าง OAuth 2.0 Web application และขอ offline access ตาม [Google OAuth Web Server flow](https://developers.google.com/identity/protocols/oauth2/web-server) เลือก scope เท่าที่จำเป็น; Google แนะนำ `drive.file` สำหรับการเข้าถึงไฟล์ที่แอปสร้าง/เลือก และให้เก็บ refresh token อย่างปลอดภัยตาม [Drive scopes guidance](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)

| ตัวแปร | ได้จากไหน | Secret |
|---|---|---|
| `GOOGLE_DRIVE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials | โดยทั่วไปไม่ลับ แต่เก็บ server config |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth Client credentials | **ใช่** |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | OAuth consent + authorization-code exchange ที่ขอ `access_type=offline` | **ใช่ มาก** |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | ID ของ private root folder สำหรับ KruPo Staging | Security-sensitive; ไม่ใช่ auth secret |

ข้อกำหนด: Folder ต้องไม่เปิด public sharing, ใช้บัญชี/Shared Drive สำหรับระบบโดยเฉพาะ และแยก temporary/permanent/rejected-retention ภายใต้ root เดียวกัน

## 3. Google Login

สร้าง OAuth Client แยกจาก Drive ได้เพื่อแยก blast radius:

| ค่า | ใส่ที่ไหน | Secret |
|---|---|---|
| Google Login Client ID | Supabase Auth → Providers → Google | ไม่ใช่ |
| Google Login Client Secret | Supabase Auth → Providers → Google | **ใช่** |
| Authorized redirect URI | Google Cloud Console; ใช้ callback URL ที่ Supabase แสดง | ไม่ใช่ |

## 4. Cloudflare Workers Staging

Account ID ดูจาก Account overview และสร้าง API Token แบบ least privilege สำหรับ Workers จาก Cloudflare Dashboard ตาม [Wrangler authentication variables](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/) และ [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

| ตัวแปร | ได้จากไหน | Secret |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Account overview | ไม่ใช่ |
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens; จำกัดสิทธิ์เฉพาะ Worker Staging | **ใช่** |
| `NEXT_PUBLIC_APP_URL` | URL `https://<worker>.workers.dev` หลังสร้าง Staging Worker | ไม่ใช่ |

ค่าที่ต้องสร้างเองและเก็บเป็น Cloudflare secret:

| ตัวแปร | วิธีได้ค่า | Secret |
|---|---|---|
| `MEDIA_URL_ENCRYPTION_KEY` | สุ่มอย่างน้อย 32 bytes ด้วย secure random generator | **ใช่ — ห้ามเปลี่ยนโดยไม่มี migration/rotation plan** |

หมายเหตุ: Distributed rate limiter binding/config ยังต้องออกแบบและเพิ่มก่อน Hosted Staging sign-off; ห้ามใช้ in-memory limiter ใน Production

## 5. Stripe Sandbox/Test Mode เท่านั้น

ใช้ Sandbox keys จาก Stripe Dashboard ตาม [Stripe API keys](https://docs.stripe.com/keys) และสร้าง Staging webhook endpoint ใน Workbench/Webhooks ตาม [Stripe webhook verification](https://docs.stripe.com/webhooks/signature) PromptPay ต้องเปิดใน Dashboard และใช้ THB ตาม [Stripe PromptPay](https://docs.stripe.com/payments/promptpay)

| ตัวแปร | ได้จากไหน | Secret |
|---|---|---|
| `STRIPE_SECRET_KEY` | Sandbox/Test API keys; ต้องขึ้นต้น `sk_test_` | **ใช่** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sandbox/Test publishable key; `pk_test_` | ไม่ใช่ |
| `STRIPE_WEBHOOK_SECRET` | Staging webhook endpoint signing secret; `whsec_` | **ใช่** |

ตั้ง endpoint เป็น `https://<staging-worker>.workers.dev/api/payments/webhook` และใช้เฉพาะ event ที่จำเป็น ห้ามใช้ `sk_live_`, `pk_live_` หรือ live webhook secret ในรอบนี้

## 6. ค่าไม่ต้องเตรียมในรอบนี้

- Custom domain: ยังใช้ `workers.dev`
- Cloudflare R2: เป็น future adapter ยังไม่ใช่ V1 storage
- Paid AI: ใช้ `COPYRIGHT_AI_PROVIDER=BASIC`; ไม่ต้องมี API key
- Production Stripe/live keys: **ห้ามเตรียมหรือใส่ในระบบรอบนี้**

## วิธีส่งมอบ secret ที่ปลอดภัย

1. เจ้าของสร้างค่าใน dashboard ของแต่ละ provider ด้วยบัญชีองค์กร/ระบบ
2. ใส่ค่า public ใน Staging environment variables
3. ใส่ค่า secret ด้วย Cloudflare encrypted secret/CI secret manager โดยไม่ paste ใน issue, chat หรือ commit
4. ให้ทีมทดสอบ health check ที่ไม่ echo ค่า secret
5. หมุน/เพิกถอนทันทีหากพบว่า secret เคยอยู่ใน log หรือ source control
