import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Gamepad2,
  Languages,
  Landmark,
  Monitor,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { subjects } from "@/features/catalog/demo-media";
import { listPublishedMedia } from "@/server/repositories/catalog-repository";

const subjectVisuals = [
  { icon: Calculator, tone: "from-[#2F72FF] to-[#6EA7FF]", glow: "bg-[#DCE8FF]" },
  { icon: FlaskConical, tone: "from-[#18A96B] to-[#4ED594]", glow: "bg-[#DDF7EC]" },
  { icon: BookOpen, tone: "from-[#FF8A35] to-[#FFB45D]", glow: "bg-[#FFF0DE]" },
  { icon: Languages, tone: "from-[#8B4FE8] to-[#B27AFF]", glow: "bg-[#F0E7FF]" },
  { icon: Landmark, tone: "from-[#17AAA2] to-[#52D6CF]", glow: "bg-[#DFF8F6]" },
  { icon: Monitor, tone: "from-[#4079E8] to-[#6AA0FF]", glow: "bg-[#E5EEFF]" },
  { icon: Atom, tone: "from-[#E85D8A] to-[#FF8EB0]", glow: "bg-[#FFE7EF]" },
];

export default async function HomePage() {
  const media = await listPublishedMedia({ limit: 6 });

  return <>
    <section className="container-page pt-7">
      <div className="relative hidden aspect-[3/1] overflow-hidden rounded-[34px] border border-[#DCE8F8] bg-[#F3F8FF] shadow-[0_24px_70px_rgba(11,47,107,.10)] md:block">
        <Image
          src="/brand/hero-modern.jpg"
          alt=""
          fill
          sizes="(min-width: 1280px) 1200px, 100vw"
          className="object-cover"
          priority
        />
        <div className="sr-only">
          <h1>คลังสื่อการเรียนรู้ดี ๆ สำหรับครู นักเรียน และผู้ปกครอง</h1>
          <p>เข้าใช้ฟรีบางส่วน และเลือกซื้อสื่อคุณภาพในราคาเริ่มต้นเพียง 5–10 บาท</p>
        </div>
        <Link
          href="/media"
          aria-label="ดูสื่อทั้งหมด"
          title="ดูสื่อทั้งหมด"
          className="absolute left-[6.0%] top-[60.3%] h-[13.5%] w-[14.2%] rounded-[18px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F5BD8]/35"
        />
        <Link
          href="/media?price=free"
          aria-label="ดูสื่อฟรี"
          title="ดูสื่อฟรี"
          className="absolute left-[21.0%] top-[60.3%] h-[13.5%] w-[12.8%] rounded-[18px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2FC58D]/35"
        />
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-[#DCE8F8] bg-gradient-to-br from-[#F7FAFF] via-white to-[#EEF4FF] px-6 py-8 shadow-[0_18px_50px_rgba(11,47,107,.09)] md:hidden">
        <span className="badge bg-white text-[#0F5BD8] shadow-sm"><Sparkles className="h-4 w-4"/>KruPo คลังสื่อ</span>
        <h1 className="mt-4 text-4xl font-black leading-[1.15] tracking-[-.03em] text-[#0B2F6B]">คลังสื่อการเรียนรู้ดี ๆ สำหรับทุกคน</h1>
        <p className="mt-4 text-sm leading-7 text-[#5D6D84]">รวมเกม ใบงาน แบบฝึกหัด และสื่อพร้อมใช้สำหรับครู นักเรียน และผู้ปกครอง</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn btn-primary" href="/media"><BookOpen className="h-5 w-5"/>ดูสื่อทั้งหมด</Link>
          <Link className="btn btn-secondary" href="/media?price=free"><Sparkles className="h-5 w-5"/>สื่อฟรี</Link>
        </div>
      </div>
    </section>

    <section className="container-page py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-bold text-[#0F5BD8]">ค้นหาสื่อได้เร็วขึ้น</p>
          <h2 className="mt-1 text-3xl font-black tracking-[-.02em] text-[#0B2F6B] md:text-4xl">เลือกตามรายวิชา</h2>
          <p className="mt-2 text-[#66758A]">เลือกวิชาที่ต้องการ แล้วไปต่อยังสื่อที่ตรงกับการเรียนรู้ได้ทันที</p>
        </div>
        <Link href="/media" className="hidden items-center gap-1 font-semibold text-[#0F5BD8] sm:flex">ดูทั้งหมด <ArrowRight className="h-4 w-4"/></Link>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {subjects.map((subject, index) => {
          const visual = subjectVisuals[index % subjectVisuals.length];
          const Icon = visual.icon;
          return <Link
            key={subject}
            href={`/media?subject=${encodeURIComponent(subject)}`}
            className="group relative min-h-40 overflow-hidden rounded-[24px] border border-[#E3EAF4] bg-white p-5 shadow-[0_10px_30px_rgba(20,52,102,.07)] transition duration-300 hover:-translate-y-1.5 hover:border-[#BFD4F5] hover:shadow-[0_20px_45px_rgba(20,52,102,.13)]"
          >
            <div className={`absolute -right-5 -top-5 h-24 w-24 rounded-full ${visual.glow} opacity-80 transition duration-300 group-hover:scale-125`} />
            <div className={`relative grid h-14 w-14 place-items-center rounded-[18px] bg-gradient-to-br ${visual.tone} text-white shadow-lg shadow-blue-950/10`}>
              <Icon className="h-7 w-7" strokeWidth={2.2}/>
            </div>
            <div className="relative mt-6">
              <p className="text-base font-extrabold text-[#18345F]">{subject}</p>
              <p className="mt-1 text-xs font-medium text-[#8491A5]">ดูสื่อในวิชานี้</p>
            </div>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-[#A6B3C4] transition group-hover:translate-x-1 group-hover:text-[#0F5BD8]"/>
          </Link>;
        })}
      </div>
    </section>

    <section className="bg-[#F7FAFF] py-14">
      <div className="container-page">
        <div className="flex items-end justify-between">
          <div><p className="font-bold text-[#2B9B70]">คัดสรรสำหรับห้องเรียน</p><h2 className="section-title mt-1">สื่อแนะนำ</h2></div>
          <Link href="/media" className="flex items-center gap-1 font-semibold text-[#0F5BD8]">ดูทั้งหมด <ArrowRight className="h-4 w-4"/></Link>
        </div>
        {media.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{media.map(m => <MediaCard media={m} key={m.id}/>)}</div> : <div className="soft-card mt-6 p-10 text-center text-[#66758A]">ยังไม่มีสื่อที่ผ่านการอนุมัติ</div>}
      </div>
    </section>

    <section className="container-page py-14">
      <div className="grid gap-5 md:grid-cols-3">
        {[
          [ShieldCheck,"ปลอดภัยและตรวจสอบได้","สิทธิ์ผู้ใช้ ลิงก์ และการเปลี่ยนแปลงสำคัญมีประวัติย้อนหลัง"],
          [Sparkles,"สนับสนุนผู้สร้างไทย","ผู้สร้างได้รับส่วนแบ่ง 85–90% ตามระดับความน่าเชื่อถือ"],
          [Gamepad2,"Game Link First","เปิดเกมได้เร็ว พร้อมตรวจสุขภาพลิงก์และระบบสำรอง"],
        ].map(([Icon,title,text]) => <div className="soft-card p-6" key={title as string}><Icon className="h-9 w-9 text-[#0F5BD8]"/><h3 className="mt-4 text-lg font-extrabold text-[#0B2F6B]">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#66758A]">{text as string}</p></div>)}
      </div>
    </section>
  </>;
}
