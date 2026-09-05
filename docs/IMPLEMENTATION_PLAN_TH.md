# Implementation Plan — KruPo คลังสื่อ

สถานะเป้าหมาย: พร้อมเชื่อม Staging โดยไม่ Deploy Production และไม่รับเงินจริง

## Milestones และ exit criteria

1. **Foundation** — Next.js/TypeScript/Tailwind, design tokens, layout, env validation, Cloudflare config
2. **Database** — migrations ครบ, RLS, indexes, Thai comments/views, seed แบบ draft
3. **Auth** — Supabase SSR, Email/Password, Google callback structure, owner bootstrap, server authorization
4. **Public UI** — หน้าแรก/catalog/detail/games/legal, responsive, accessibility, SEO/share
5. **Search/Catalog** — server pagination, filter URL, Thai partial search indexes, no secure data leakage
6. **Creator Marketplace** — สมัครผู้สร้าง, dashboard, earnings, payout views, ownership agreement
7. **Submission** — temporary area, validation/checksum/safety state, review workflow
8. **Copyright Guard** — provider interface, Basic checks, budget guard, evidence-rich results
9. **Admin Review** — Thai admin queue, role matrix, auditable decisions
10. **Storage** — provider interface, local-test adapter, lifecycle and secure download
11. **Google Drive** — OAuth refresh, private file metadata, upload/download/move/copy/delete implementation
12. **Cart/Orders** — DB price source of truth, checkout minimum, commission snapshot
13. **Payment** — dev mock, Stripe PromptPay provider, signed/idempotent webhook, production guard
14. **Entitlement/Library** — stable user ID, no-store access, archive access policy
15. **Financial Ledger** — immutable entries, reversal, creator balances calculated from ledger
16. **Creator Revenue** — hold/available/payout minimum/manual payout architecture
17. **Link Health** — classification, history, SLA/escalation/platform incident model
18. **Copyright Complaint** — claim/evidence/hold/decision/strike flow
19. **Admin/Health** — action center, settings, kill switches, provider health without secret leakage
20. **Security** — headers, validation, RLS, anti-abuse adapter, no client trust, export safety
21. **Tests/Docs** — unit/integration/critical E2E, Thai operator docs, backup/restore guide
22. **Staging Gate** — lint, typecheck, test, build, Playwright, credential checklist, smoke runbook

ทุก milestone ต้องผ่าน `pnpm lint`, `pnpm typecheck`, `pnpm test`; final gate เพิ่ม `pnpm build` และ Playwright critical flows

## Provider boundaries

```text
Web/API -> Domain services -> StorageProvider / PaymentProvider / CopyrightRiskProvider
                         -> Repository (Supabase PostgreSQL)
                         -> Job runner / health probes
```

Google Drive, Stripe และ AI provider ห้ามถูกเรียกจาก React component หรือกระจายข้าม feature; การเลือก provider ทำใน server factory เท่านั้น

## Definition of Staging Ready

- build reproducible จาก lockfile
- migration/RLS ตรวจทานและรันใน staging project ได้
- external integrations ปิดอย่างปลอดภัยเมื่อ credential ไม่ครบ
- production deployment guard ผ่านเฉพาะ provider จริง
- critical flows มี automated tests และ staging smoke checklist
- owner ได้รายการ credential และ runbook แบบภาษาไทย
