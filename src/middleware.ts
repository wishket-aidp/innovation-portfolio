import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 내부 관리 표면(/clients, /api/materials) 접근 게이트.
 * env 플래그(INTERNAL_ADMIN)를 kill-switch로, HTTP Basic 인증을 실제 인증 게이트로 사용한다.
 * (env 플래그 단독이 유일한 게이트가 되지 않도록 — 보안 리뷰 대응)
 * 프로덕션에서는 여기에 더해 Vercel Deployment Protection(SSO/비밀번호)을 권장.
 */
export const config = {
  matcher: ["/clients", "/clients/:path*", "/api/materials", "/api/materials/:path*"],
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
  // 대외 배포: 내부 관리 비활성 → 존재하지 않는 것처럼 404
  if (process.env.INTERNAL_ADMIN !== "1") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const user = process.env.INTERNAL_ADMIN_USER;
  const pass = process.env.INTERNAL_ADMIN_PASSWORD;
  if (!user || !pass) {
    return new NextResponse("Internal admin not configured", { status: 500 });
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
    // 길이 먼저 비교 후 상수시간 유사 비교
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
