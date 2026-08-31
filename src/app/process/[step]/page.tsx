import Link from "next/link";
import { notFound } from "next/navigation";
import { PROCESS_STEPS, getStepBySlug } from "@/lib/process";
import { getDetailedCases } from "@/lib/cases";
import CaseExplorer from "@/components/CaseExplorer";

const ROLE_LABELS: Record<string, string> = {
  GP: "Growth Partner",
  GA: "Growth Architect",
  BDE: "Business Develop Engineer",
};

export function generateStaticParams() {
  return PROCESS_STEPS.map((step) => ({ step: step.slug }));
}

export default async function ProcessStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step: slug } = await params;
  const step = getStepBySlug(slug);
  if (!step) notFound();

  const cases = getDetailedCases(step.no);
  const prev = PROCESS_STEPS.find((s) => s.no === step.no - 1);
  const next = PROCESS_STEPS.find((s) => s.no === step.no + 1);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← 전체 과정
      </Link>

      {/* 고객 관점 단계 헤더 */}
      <header className="mt-6 mb-12 border-b border-neutral-200 pb-8">
        <p className="text-sm font-medium tracking-widest text-neutral-500">
          {String(step.no).padStart(2, "0")} / 15 · {step.group}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{step.customer.name}</h1>
        <p className="mt-3 text-lg text-neutral-700">
          {step.customer.headline}
        </p>
      </header>

      {/* 이 자리에서 하는 일 */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">이 자리에서 하는 일</h2>
        <ul className="space-y-3">
          {step.customer.experience.map((item) => (
            <li key={item} className="flex gap-3 text-neutral-700">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 이 단계를 마치면 */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">이 단계를 마치면</h2>
        <ul className="space-y-2">
          {step.customer.gets.map((item) => (
            <li
              key={item}
              className="rounded-lg bg-neutral-50 px-4 py-3 text-neutral-700"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 함께하는 사람 */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">함께하는 사람</h2>
        <div className="flex flex-wrap gap-2">
          {step.roles.map((role) => (
            <span
              key={role}
              className="rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600"
            >
              <strong>{role}</strong> · {ROLE_LABELS[role]}
            </span>
          ))}
        </div>
      </section>

      {/* 고객 사례: 카드 클릭 → 우측 슬라이드 상세 */}
      <section>
        <h2 className="mb-6 text-lg font-semibold">이 자리를 지나간 고객들</h2>
        <CaseExplorer cases={cases} />
      </section>

      {/* 이전/다음 단계 */}
      <nav className="mt-16 flex justify-between border-t border-neutral-200 pt-6 text-sm">
        {prev ? (
          <Link
            href={`/process/${prev.slug}`}
            className="text-neutral-500 hover:text-neutral-900"
          >
            ← {String(prev.no).padStart(2, "0")} {prev.customer.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/process/${next.slug}`}
            className="text-neutral-500 hover:text-neutral-900"
          >
            {String(next.no).padStart(2, "0")} {next.customer.name} →
          </Link>
        )}
      </nav>
    </main>
  );
}
