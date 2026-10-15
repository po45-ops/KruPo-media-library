import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[55vh] place-items-center text-center">
      <div>
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#EEF4FF] text-[#0F5BD8]"><Compass className="h-10 w-10" /></span>
        <h1 className="mt-5 text-3xl font-black text-[#0B2F6B]">ไม่พบหน้าที่คุณกำลังหา</h1>
        <p className="mt-2 text-[#66758A]">ลิงก์อาจถูกย้ายหรือไม่มีอยู่แล้ว</p>
        <Link className="btn btn-primary mt-6" href="/">กลับหน้าแรก</Link>
      </div>
    </div>
  );
}
