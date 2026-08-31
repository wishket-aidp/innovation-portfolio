import Link from "next/link";
import { notFound } from "next/navigation";
import { PROCESS_STEPS, getStepBySlug } from "@/lib/process";
import { getDetailedCases, DETAILED_CASES } from "@/lib/cases";
import { CASE_CLIENT_IDS } from "@/lib/case-clients";
import {
  getMaterialsByClientStep,
  clientsWithMaterialsAtStep,
  getStageSummary,
} from "@/lib/supabase-admin";
import CaseExplorer from "@/components/CaseExplorer";

// 사례 고객(마스킹) 메타 — client_id → {maskedName, industryTag, declaration}
const CLIENT_META = new Map<
  string,
  { maskedName: string; industryTag: string; declaration: string }
>();
for (const c of DETAILED_CASES) {
  const cid = CASE_CLIENT_IDS[c.maskedName];
  if (cid && !CLIENT_META.has(cid)) {
    CLIENT_META.set(cid, {
      maskedName: c.maskedName,
      industryTag: c.industryTag,
      declaration: c.declaration,
    });
  }
}
const EMPTY_CASE = {
  story: [],
  together: [],
  customerDid: [],
  aidpDid: [],
  gained: "",
  alternative: "",
  timeline: [],
};

// 자료실(DB) 서명 URL을 실시간 생성 → 동적 렌더 (사이트 전체가 로그인 뒤라 정적화 불필요)
export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  GP: "Growth Partner",
  GA: "Growth Architect",
  BDE: "Business Develop Engineer",
};

export default async function ProcessStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step: slug } = await params;
  const step = getStepBySlug(slug);
  if (!step) notFound();

  const handCases = getDetailedCases(step.no);
  const handClientIds = new Set(
    handCases.map((c) => CASE_CLIENT_IDS[c.maskedName]).filter(Boolean),
  );

  // 1) 하드코딩 사례: 설명 + 해당 단계 자료
  const richCases = await Promise.all(
    handCases.map(async (c) => {
      const clientId = CASE_CLIENT_IDS[c.maskedName];
      const materials = clientId
        ? await getMaterialsByClientStep(clientId, step.no)
        : [];
      return { ...c, materials };
    }),
  );

  // 2) 사례는 없지만 이 단계에 자료가 있는 고객: 자료만 (설명은 추후)
  const matClientIds = await clientsWithMaterialsAtStep(step.no, [
    ...CLIENT_META.keys(),
  ]);
  const materialOnly = await Promise.all(
    matClientIds
      .filter((cid) => !handClientIds.has(cid))
      .map(async (cid) => {
        const meta = CLIENT_META.get(cid)!;
        const [materials, summary] = await Promise.all([
          getMaterialsByClientStep(cid, step.no),
          getStageSummary(cid, step.no),
        ]);
        return { ...EMPTY_CASE, ...meta, step: step.no, materials, summary };
      }),
  );

  const cases = [...richCases, ...materialOnly];
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

      {/* 이 단계에 들어올 때 — 고객이 놓인 상황 */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500">
          이 단계에 들어올 때, 이런 상황일 수 있습니다
        </h2>
        <p className="text-[15px] leading-7 text-neutral-700">
          {step.customer.situation}
        </p>
      </section>

      {/* 저희가 드리는 것 / 고객이 하시는 일 */}
      <section className="mb-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 p-6">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-neutral-500">
            저희가 드리는 것
          </h2>
          <ul className="space-y-3">
            {step.customer.weProvide.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-neutral-700">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-neutral-200 p-6">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-neutral-500">
            고객이 하시는 일
          </h2>
          <ul className="space-y-3">
            {step.customer.youDo.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-neutral-700">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 이 단계를 마치면 — 도달 상태 */}
      <section className="mb-12 rounded-xl bg-neutral-900 p-7 text-white">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400">
          이 단계를 마치면
        </h2>
        <p className="text-[15px] leading-7 text-neutral-100">
          {step.customer.outcome}
        </p>
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
