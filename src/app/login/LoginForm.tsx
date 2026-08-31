"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** next 파라미터는 내부 경로만 허용 (오픈 리다이렉트 방지) */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "로그인 실패");
      }
      router.replace(next);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "로그인 실패");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        placeholder="비밀번호"
        className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-900"
      />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        disabled={busy || !password}
        className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "확인 중…" : "접속"}
      </button>
      <p className="mt-3 text-xs text-neutral-400">세션은 1주일 유지됩니다.</p>
    </form>
  );
}
