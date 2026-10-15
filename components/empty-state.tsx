import Link from "next/link";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  href = "/media",
  action = "เลือกดูสื่อ",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="soft-card grid min-h-72 place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#EEF4FF] text-[#0F5BD8] [&>svg]:h-8 [&>svg]:w-8">
          {icon}
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-[#0B2F6B]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#66758A]">{description}</p>
        <Link className="btn btn-primary mt-6" href={href}>{action}</Link>
      </div>
    </div>
  );
}
