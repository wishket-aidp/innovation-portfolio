"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-600"
    >
      로그아웃
    </button>
  );
}
