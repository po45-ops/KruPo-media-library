import type { Metadata } from "next"; import { AuthCard } from "@/components/auth-card";
export const metadata:Metadata={title:"สมัครสมาชิก",robots:{index:false,follow:false}}; export default function Page(){return <AuthCard mode="register"/>}
