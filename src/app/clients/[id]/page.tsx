import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClient,
  getClientCases,
  getClientMaterials,
  signedUrl,
} from "@/lib/supabase-admin";
import { PROCESS_STEPS } from "@/lib/process";
import MaterialUploader from "@/components/MaterialUploader";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

const CATEGORY_LABELS: Record<string, string> = {
  proposal: "제안서",
  transcript: "녹취록",
  report: "보고서",
  deck: "발표자료",
  contract: "계약서",
  file: "파일",
};

function stepName(no: number): string {
  return PROCESS_STEPS.find((s) => s.no === no)?.name ?? `단계 ${no}`;
}

export default async function ClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await getClient(id);
  if (!client) notFound();

  const [cases, materials] = await Promise.all([
    getClientCases(id),
    getClientMaterials(id),
  ]);

  // 자료에 서명 URL 부여
  const materialsWithUrl = await Promise.all(
    materials.map(async (m) => ({
      ...m,
      url: await signedUrl(m.storage_path),
    })),
  );

  // 단계별로 사례+자료를 묶는다 (프로세스 순서)
  const stepsWithContent = PROCESS_STEPS.map((s) => ({
    no: s.no,
    name: s.name,
    group: s.group,
    cases: cases.filter((c) => c.step === s.no),
    materials: materialsWithUrl.filter((m) => m.step === s.no),
  })).filter((s) => s.cases.length > 0 || s.materials.length > 0);

  const unstaged = materialsWithUrl.filter((m) => m.step == null);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/clients"
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← 고객 자료실
      </Link>

      <div className="mt-6 mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
        내부 전용 · 기밀
      </div>
      <h1 className="text-3xl font-bold">{client.name}</h1>
      <p className="mt-2 text-neutral-500">
        대외 표기: {client.masked_name ?? "—"}
        {client.industry ? ` · ${client.industry}` : ""}
      </p>

      {/* 프로세스 여정: 단계별 사례 + 자료 */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">프로세스 여정</h2>
        {stepsWithContent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
            아직 이 고객의 사례·자료가 없습니다.
          </p>
        ) : (
          <ol className="space-y-4">
            {stepsWithContent.map((s) => (
              <li
                key={s.no}
                className="rounded-xl border border-neutral-200 p-5"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-neutral-400">
                    {String(s.no).padStart(2, "0")}
                  </span>
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-xs text-neutral-400">{s.group}</span>
                </div>
                {s.cases.map((c, i) => (
                  <p
                    key={i}
                    className="mt-3 text-sm leading-relaxed text-neutral-600"
                  >
                    {c.gained}
                  </p>
                ))}
                {s.materials.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {s.materials.map((m) => (
                      <li key={m.id}>
                        <a
                          href={m.url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
                        >
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                            {CATEGORY_LABELS[m.category] ?? m.category}
                          </span>
                          {m.title}
                          <span className="text-xs text-neutral-400">
                            {m.file_name}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 단계 미지정 자료 */}
      {unstaged.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-neutral-500">
            단계 미지정 자료
          </h2>
          <ul className="space-y-1.5">
            {unstaged.map((m) => (
              <li key={m.id}>
                <a
                  href={m.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
                >
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                    {CATEGORY_LABELS[m.category] ?? m.category}
                  </span>
                  {m.title}
                  <span className="text-xs text-neutral-400">{m.file_name}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 업로드 */}
      <section className="mt-10">
        <MaterialUploader clientId={id} />
      </section>
    </main>
  );
}
