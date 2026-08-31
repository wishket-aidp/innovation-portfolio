"use client";

import { useState } from "react";
import type { DetailedCase } from "@/lib/types";

interface StageMaterial {
  title: string;
  category: string;
  file_name: string | null;
  url: string | null;
}
type CaseWithMaterials = DetailedCase & {
  materials?: StageMaterial[];
  summary?: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  proposal: "제안서",
  transcript: "녹취록",
  report: "보고서",
  deck: "발표자료",
  contract: "계약서",
  file: "파일",
};

/**
 * 단계 상세의 고객 사례 목록 + 우측 슬라이드 상세 패널.
 * 고객사 카드 클릭 → 우측에서 패널이 슬라이드 인. 자료실에서 취합한 해당 단계 자료도 표시.
 */
export default function CaseExplorer({ cases }: { cases: CaseWithMaterials[] }) {
  const [selected, setSelected] = useState<CaseWithMaterials | null>(null);

  if (cases.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400">
        이 단계를 거친 고객사의 고민과 해결 사례가 이곳에 표시됩니다.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {cases.map((c) => (
          <button
            key={c.maskedName}
            onClick={() => setSelected(c)}
            className="rounded-lg border border-neutral-200 p-5 text-left transition hover:border-neutral-400 hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">{c.maskedName}</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                {c.industryTag}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {c.declaration}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs font-medium text-neutral-400">
                사례 보기 →
              </span>
              {c.materials && c.materials.length > 0 && (
                <span className="text-xs text-neutral-400">
                  자료 {c.materials.length}건
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 백드롭 */}
      <div
        onClick={() => setSelected(null)}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          selected ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* 우측 슬라이드 패널 */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-xl transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ${
          selected ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selected && (
          <div className="px-8 py-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{selected.maskedName}</h2>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                    {selected.industryTag}
                  </span>
                </div>
                <p className="mt-2 text-neutral-700">{selected.declaration}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="닫기"
                className="ml-4 rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* 사례 설명이 없으면 AI 요약(자료 기반) 또는 안내 */}
            {selected.story.length === 0 &&
              (selected.summary ? (
                <div className="mt-8">
                  <div className="mb-2 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                    자료 기반 요약
                  </div>
                  <p className="text-[15px] leading-7 text-neutral-700">
                    {selected.summary}
                  </p>
                </div>
              ) : (
                <div className="mt-8 rounded-lg bg-neutral-50 p-5 text-sm leading-relaxed text-neutral-500">
                  이 단계에서 이 고객과 오간 실제 자료입니다. 아래 자료로 어떤
                  과정이 있었는지 확인할 수 있습니다.
                </div>
              ))}

            {/* 스토리 */}
            {selected.story.length > 0 && (
              <div className="mt-8 space-y-4">
                {selected.story.map((para) => (
                  <p
                    key={para.slice(0, 24)}
                    className="text-[15px] leading-7 text-neutral-700"
                  >
                    {para}
                  </p>
                ))}
              </div>
            )}

            {/* 함께한 것 / 고객이 한 것 / AIDP가 한 것 */}
            {selected.together.length > 0 && (
              <div className="mt-10 space-y-6">
                <RoleSection
                  title="고객과 AIDP가 함께한 것"
                  items={selected.together}
                  accent="bg-neutral-900"
                />
                <RoleSection
                  title="고객이 한 것"
                  items={selected.customerDid}
                  accent="bg-neutral-400"
                />
                <RoleSection
                  title="AIDP가 한 것"
                  items={selected.aidpDid}
                  accent="bg-neutral-600"
                />
              </div>
            )}

            {/* 이 단계에서 고객이 얻은 성과 */}
            {selected.gained && (
              <div className="mt-10 rounded-xl bg-neutral-900 p-6 text-white">
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400">
                  이 단계에서 고객이 얻은 것
                </h3>
                <p className="text-[15px] leading-7 text-neutral-100">
                  {selected.gained}
                </p>
              </div>
            )}

            {/* 이 단계의 발표/보고 자료 (있을 때만) */}
            {selected.deliverables && selected.deliverables.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500">
                  이 단계의 발표 자료
                </h3>
                <ul className="space-y-2">
                  {selected.deliverables.map((d) => (
                    <li key={d.url}>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm transition hover:border-neutral-400"
                      >
                        <span className="text-neutral-400">📄</span>
                        <span className="font-medium text-neutral-800">
                          {d.title}
                        </span>
                        {d.note && (
                          <span className="text-xs text-neutral-400">
                            {d.note}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-neutral-400">
                          열기 →
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 다른 곳과 진행했다면 (추정) */}
            {selected.alternative && (
              <div className="mt-4 rounded-xl border border-dashed border-neutral-300 p-6">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-neutral-500">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                    가정
                  </span>
                  다른 SI·컨설팅 업체와 진행했다면
                </h3>
                <p className="text-[15px] leading-7 text-neutral-600">
                  {selected.alternative}
                </p>
              </div>
            )}

            {/* 이 단계의 자료 (자료실에서 취합) */}
            {selected.materials && selected.materials.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-1 text-sm font-semibold tracking-wide text-neutral-500">
                  이 단계의 자료 ({selected.materials.length})
                </h3>
                <p className="mb-3 text-xs text-neutral-400">
                  고객 자료실에서 이 단계로 분류된 실제 자료입니다.
                </p>
                <ul className="space-y-1.5">
                  {selected.materials.map((m, i) => (
                    <li key={`${m.title}-${i}`}>
                      <a
                        href={m.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-neutral-100 px-3 py-2 text-sm transition hover:border-neutral-300"
                      >
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                          {CATEGORY_LABELS[m.category] ?? m.category}
                        </span>
                        <span className="truncate text-neutral-700">
                          {m.title}
                        </span>
                        <span className="ml-auto shrink-0 text-xs text-neutral-400">
                          ↓
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 타임라인 */}
            {selected.timeline.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-4 text-sm font-semibold tracking-wide text-neutral-500">
                타임라인
              </h3>
              <ol className="relative space-y-4 border-l border-neutral-200 pl-5">
                {selected.timeline.map((t) => (
                  <li key={`${t.date}-${t.label}`} className="relative">
                    <span className="absolute -left-[26px] top-1.5 h-2 w-2 rounded-full bg-neutral-900" />
                    <span className="block font-mono text-xs text-neutral-400">
                      {t.date}
                    </span>
                    <span className="text-sm text-neutral-700">{t.label}</span>
                  </li>
                ))}
              </ol>
            </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function RoleSection({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.slice(0, 24)}
            className="rounded-lg bg-neutral-50 px-4 py-2.5 text-sm leading-relaxed text-neutral-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
