import type { MediaSummary } from "@/types/domain";

const developmentFixtures: MediaSummary[] = [
  { id: "11111111-1111-4111-8111-111111111111", slug: "quick-math-p4", titleTh: "คณิตคิดไว ป.4", descriptionTh: "เกมฝึกคิดเลขเร็วผ่านภารกิจแสนสนุก", subject: "คณิตศาสตร์", grade: "ประถมศึกษาปีที่ 4", mediaType: "เกมการศึกษา", creator: "ครูมะลิ สื่อสร้างสรรค์", accessType: "paid", deliveryType: "external_link", priceSatang: 500, rating: 4.9, salesCount: 328, updatedAt: "2026-08-29", protection: "Verified External", linkHealth: "ok", accent: "linear-gradient(135deg,#0B2F6B,#0F5BD8)", demo: true },
  { id: "22222222-2222-4222-8222-222222222222", slug: "word-mission", titleTh: "ภารกิจคำศัพท์", descriptionTh: "ผจญภัยฝึกคำศัพท์ภาษาอังกฤษพื้นฐาน", subject: "ภาษาอังกฤษ", grade: "ประถมศึกษาปีที่ 3", mediaType: "เกมการศึกษา", creator: "Teacher May", accessType: "free", deliveryType: "external_link", priceSatang: 0, rating: 4.8, salesCount: 891, updatedAt: "2026-09-01", protection: "External Only", linkHealth: "ok", accent: "linear-gradient(135deg,#6554E8,#A58BFA)", demo: true },
  { id: "33333333-3333-4333-8333-333333333333", slug: "solar-system", titleTh: "ระบบสุริยะ", descriptionTh: "ใบงานพร้อมกิจกรรมรู้จักดาวเคราะห์", subject: "วิทยาศาสตร์", grade: "ประถมศึกษาปีที่ 4", mediaType: "ใบงาน", creator: "KruPo Studio", accessType: "free", deliveryType: "file", priceSatang: 0, rating: 4.9, salesCount: 1254, updatedAt: "2026-08-25", protection: "KruPo Protected", linkHealth: "ok", accent: "linear-gradient(135deg,#071B3C,#EA7B1F)", demo: true },
  { id: "44444444-4444-4444-8444-444444444444", slug: "four-operations", titleTh: "เกมบวก ลบ คูณ หาร", descriptionTh: "ทบทวนสี่การคำนวณแบบเล่นได้ทันที", subject: "คณิตศาสตร์", grade: "ประถมศึกษาปีที่ 5", mediaType: "เกมการศึกษา", creator: "ครูน้ำฝน", accessType: "paid", deliveryType: "both", priceSatang: 1000, rating: 4.7, salesCount: 547, updatedAt: "2026-08-30", protection: "KruPo Protected", linkHealth: "warning", accent: "linear-gradient(135deg,#0F5BD8,#2FC58D)", demo: true },
  { id: "55555555-5555-4555-8555-555555555555", slug: "math-worksheet", titleTh: "ใบงานคณิตศาสตร์", descriptionTh: "แบบฝึกหัดพร้อมเฉลยสำหรับห้องเรียน", subject: "คณิตศาสตร์", grade: "ประถมศึกษาปีที่ 2", mediaType: "ใบงาน", creator: "ครูปอ", accessType: "paid", deliveryType: "file", priceSatang: 500, rating: 4.6, salesCount: 276, updatedAt: "2026-08-20", protection: "KruPo Protected", linkHealth: "unknown", accent: "linear-gradient(135deg,#E9B949,#FF8B5A)", demo: true },
  { id: "66666666-6666-4666-8666-666666666666", slug: "english-game", titleTh: "เกมภาษาอังกฤษ", descriptionTh: "จับคู่คำศัพท์กับภาพสำหรับนักเรียน", subject: "ภาษาอังกฤษ", grade: "ประถมศึกษาปีที่ 6", mediaType: "เกมการศึกษา", creator: "ครูใจดี", accessType: "free", deliveryType: "external_link", priceSatang: 0, rating: 4.8, salesCount: 734, updatedAt: "2026-09-02", protection: "Verified External", linkHealth: "ok", accent: "linear-gradient(135deg,#E85D75,#F6B73C)", demo: true },
];

// Fixtures are opt-in for hosted staging previews. Production can never enable
// them because APP_ENV must remain "staging" for this condition to be true.
export const demoMedia: MediaSummary[] =
  process.env.NODE_ENV !== "production" ||
  (process.env.APP_ENV === "staging" && process.env.ALLOW_STAGING_DEMO_DATA === "true")
    ? developmentFixtures
    : [];

export const subjects = ["คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาไทย", "ภาษาอังกฤษ", "สังคมศึกษา", "คอมพิวเตอร์"];
