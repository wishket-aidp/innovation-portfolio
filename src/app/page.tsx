import Link from "next/link";
import {
  PROCESS_GROUPS,
  PUBLIC_GROUP_DESCRIPTIONS,
  getStepsByGroup,
} from "@/lib/process";
import LogoMarquee from "@/components/LogoMarquee";
import LogoutButton from "@/components/LogoutButton";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-16">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium tracking-widest text-neutral-500">
            AIDP INNOVATION PORTFOLIO
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/clients"
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-neutral-500"
            >
              고객 자료실 →
            </Link>
            <LogoutButton />
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-bold">
          문제에서 증명까지, 고객과 함께 걷는 15개의 자리
        </h1>
        <p className="mt-3 text-neutral-600">
          첫 대화부터 클로징까지 — 각 자리에서 고객이 무엇을 하고, 무엇을 받는지
          그대로 보여드립니다.
        </p>
      </header>

      {/* 프로세스 맵: 5그룹 × 15단계 (고객 관점) */}
      <section className="mb-20">
        <h2 className="mb-6 text-xl font-semibold">함께 걷는 과정</h2>
        <div className="space-y-10">
          {PROCESS_GROUPS.map((group) => (
            <div key={group.name}>
              <div className="mb-3">
                <h3 className="font-semibold">{group.name}</h3>
                <p className="text-sm text-neutral-500">
                  {PUBLIC_GROUP_DESCRIPTIONS[group.name]}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {getStepsByGroup(group.name).map((step) => (
                  <Link
                    key={step.slug}
                    href={`/process/${step.slug}`}
                    className="rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-neutral-400">
                        {String(step.no).padStart(2, "0")}
                      </span>
                      <span className="font-medium">{step.customer.name}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
                      {step.customer.headline}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 로고 롤링: 계약 체결 고객사 + 파트너 */}
      <section>
        <h2 className="mb-8 text-xl font-semibold">함께해온 기업들</h2>
        <LogoMarquee />
      </section>
    </main>
  );
}
