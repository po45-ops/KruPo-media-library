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
  Search,
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
      <div className="relative overflow-hidden rounded-[34px] border border-[#DCE8F8] bg-[radial-gradient(circle_at_top_right,_rgba(101,84,232,.16),_transparent_34%),linear-gradient(135deg,#F7FAFF_0%,#FFFFFF_54%,#EEF4FF_100%)] px-6 py-10 shadow-[0_24px_70px_rgba(11,47,107,.09)] md:px-12 md:py-14">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#DDE7FF]/60 blur-3xl" />
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <span className="badge bg-white/90 text-[#6554E8] shadow-sm ring-1 ring-[#E5E9F5]"><Sparkles className="h-4 w-4"/>KruPo คลังสื่อสำหรับการเรียนรู้ยุคใหม่</span>
            <h1 className="mt-5 max-w-3xl text-[2.55rem] font-black leading-[1.12] tracking-[-.03em] text-[#0B2F6B] md:text-[4.15rem]">
              สื่อดี ๆ ที่ช่วยให้<br/>
              <span className="bg-gradient-to-r from-[#0F5BD8] to-[#6554E8] bg-clip-text text-transparent">การสอนง่ายขึ้น การเรียนสนุกขึ้น</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#5D6D84] md:text-lg">
              รวมเกมการศึกษา ใบงาน แบบฝึกหัด และสื่อพร้อมใช้สำหรับครู นักเรียน และผู้ปกครอง คัดสรรให้ค้นหาง่าย ใช้ได้จริง และเข้าถึงได้ในที่เดียว
            </p>
            <form action="/media" className="mt-8 flex max-w-2xl gap-2 rounded-[20px] border border-white/90 bg-white p-2 shadow-[0_14px_36px_rgba(15,91,216,.12)]">
              <label htmlFor="hero-search" className="sr-only">ค้นหาสื่อ</label>
              <Search className="ml-2 mt-3 h-5 w-5 shrink-0 text-[#66758A]"/>
              <input id="hero-search" name="q" className="min-w-0 flex-1 bg-transparent px-2 outline-none" placeholder="ค้นหาเกม ใบงาน แบบฝึกหัด หรือรายวิชา..."/>
              <button className="btn btn-primary" type="submit">ค้นหา</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn btn-primary" href="/media"><BookOpen className="h-5 w-5"/>ดูสื่อทั้งหมด</Link>
              <Link className="btn btn-secondary" href="/media?price=free"><Sparkles className="h-5 w-5"/>สื่อฟรี</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#53647D]">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#2FC58D]"/>ใช้งานง่ายและตรวจสอบได้</span>
              <span className="inline-flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-[#0F5BD8]"/>มีทั้งเกมและสื่อพร้อมใช้</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[620px]">
            <div className="absolute inset-x-12 bottom-3 h-16 rounded-full bg-[#173B82]/10 blur-2xl" />
            <Image src="/brand/hero-learning.svg" alt="แท็บเล็ต หนังสือ และอุปกรณ์การเรียนรู้" width={640} height={390} className="relative w-full drop-shadow-[0_24px_34px_rgba(11,47,107,.12)]" priority/>
          </div>
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
