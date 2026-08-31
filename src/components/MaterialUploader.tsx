"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "proposal", label: "제안서" },
  { value: "transcript", label: "녹취록" },
  { value: "report", label: "보고서" },
  { value: "deck", label: "발표자료" },
  { value: "contract", label: "계약서" },
  { value: "file", label: "기타 파일" },
];

export default function MaterialUploader({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    form.set("clientId", clientId);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `업로드 실패 (${res.status})`);
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-200 p-5"
    >
      <h3 className="mb-4 text-sm font-semibold">자료 업로드</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="title"
          required
          placeholder="자료 제목 (예: 킥오프 발표자료)"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
        />
        <select
          name="category"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          name="step"
          type="number"
          min={1}
          max={15}
          placeholder="연관 단계 (1~15, 선택)"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          name="file"
          type="file"
          required
          className="text-sm sm:col-span-2"
        />
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "업로드 중…" : "업로드"}
      </button>
    </form>
  );
}
