import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 사이트 전체가 내부 전용 — 전 경로에 HTTP Basic 인증을 강제한다.
 * (정적 에셋 _next/*, favicon 제외. 자격증명 미설정 시 fail-closed 503 — 절대 개방 금지.)
 * 프로덕션에서는 Vercel Deployment Protection(SSO/비밀번호) 병행 권장.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AIDP Internal", charset="UTF-8"',
    },
  });
}

export function middleware(req: NextRequest) {
  const user = process.env.INTERNAL_ADMIN_USER;
  const pass = process.env.INTERNAL_ADMIN_PASSWORD;
  // 내부 전용 사이트는 자격증명 없이는 절대 열리지 않는다 (fail-closed)
  if (!user || !pass) {
    return new NextResponse("Not configured", { status: 503 });
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      return unauthorized();
    }
    const sep = decoded.indexOf(":");
    const u = decoded.slice(0, sep);
    const p = decoded.slice(sep + 1);
    if (u === user && p.length === pass.length && safeEqual(p, pass)) {
      return NextResponse.next();
    }
  }
  return unauthorized();
}

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length && i < b.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
