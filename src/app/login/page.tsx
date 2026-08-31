import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "로그인 · AIDP",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-sm font-medium tracking-widest text-neutral-400">
          AIDP INNOVATION PORTFOLIO
        </p>
        <h1 className="mt-2 text-2xl font-bold">내부 전용</h1>
        <p className="mt-2 text-sm text-neutral-500">
          접속하려면 비밀번호를 입력하세요.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
