import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

/**
 * 사이트 전체가 내부 전용 — 비밀번호 로그인(세션 쿠키) 없이는 접근 불가.
 * 세션 미검증 시: 페이지는 /login 리다이렉트, API는 401.
 * 자격증명 미설정 시 503 fail-closed. 정적 에셋 _next/*·favicon 제외.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 로그인 표면은 세션 없이 통과
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  // 내부 전용 사이트는 비밀번호 미설정 시 절대 열리지 않는다 (fail-closed)
  if (!process.env.INTERNAL_ADMIN_PASSWORD) {
    return new NextResponse("Not configured", { status: 503 });
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}
