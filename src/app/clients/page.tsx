import Link from "next/link";
import { listClients } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "고객 자료실",
  robots: { index: false, follow: false },
};

export default async function ClientsIndex() {
  // 접근 통제는 사이트 전체 미들웨어(Basic 인증)가 담당
  const clients = await listClients();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
        내부 전용 · 기밀 자료
      </div>
      <h1 className="mt-2 text-3xl font-bold">고객 자료실</h1>
      <p className="mt-3 text-neutral-600">
        고객별 프로세스 여정과 제공한 모든 자료(녹취·제안서·발표자료 등)를
        관리합니다.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400"
          >
            <div className="font-semibold">{c.name}</div>
            <div className="mt-1 text-sm text-neutral-500">
              {c.masked_name ?? "—"}
              {c.industry ? ` · ${c.industry}` : ""}
            </div>
          </Link>
        ))}
      </div>
      {clients.length === 0 && (
        <p className="mt-8 text-sm text-neutral-400">고객이 없습니다.</p>
      )}
    </main>
  );
}
