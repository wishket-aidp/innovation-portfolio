import "server-only";

/**
 * home.ai-delivery.work 홈어드민 API 클라이언트 (read 전용 토큰).
 * 서버 컴포넌트에서만 사용 — 토큰은 클라이언트로 절대 노출하지 않는다.
 *
 * 대외 공개 페이지에는 이름·로고 등 공개 가능한 필드만 내려보낸다.
 * 레퍼런스 동의 필드가 API에 생기기 전까지는 로고 보유 여부로만 필터링한다
 * (AIDP-CONTEXT.md §5 — 동의 관리 정책 확정 필요).
 */

const BASE = process.env.HOME_API_BASE ?? "https://home.ai-delivery.work";
const TOKEN = process.env.HOME_API_TOKEN;

export interface HomeCompany {
  id: string;
  name: string;
  logoUrl: string | null;
  projectCount: number;
}

async function homeFetch<T>(path: string): Promise<T | null> {
  if (!TOKEN) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; data: T };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

/** 로고가 있는 고객사만 — 대외 노출 후보 */
export async function getCompaniesWithLogo(): Promise<HomeCompany[]> {
  const data = await homeFetch<HomeCompany[]>("/api/companies");
  if (!data) return [];
  return data.filter((c) => c.logoUrl);
}
