import "server-only";
import { admin } from "./supabase-admin";
import { DETAILED_CASES } from "./cases";
import { CASE_CLIENT_IDS } from "./case-clients";

/**
 * 단계별 사례 카드 수 = (하드코딩 사례 고객) ∪ (해당 단계에 자료 보유 고객).
 * 프로세스 페이지가 카드를 만드는 방식과 동일하게 계산.
 */
export async function getStepCaseCounts(): Promise<Record<number, number>> {
  const mappedIds = Object.values(CASE_CLIENT_IDS);
  const { data } = await admin()
    .from("client_materials")
    .select("step, client_id")
    .not("step", "is", null)
    .in("client_id", mappedIds);

  const matByStep = new Map<number, Set<string>>();
  for (const r of (data ?? []) as { step: number; client_id: string }[]) {
    if (!matByStep.has(r.step)) matByStep.set(r.step, new Set());
    matByStep.get(r.step)!.add(r.client_id);
  }

  const counts: Record<number, number> = {};
  for (let step = 1; step <= 15; step++) {
    const set = new Set(matByStep.get(step) ?? []);
    for (const c of DETAILED_CASES) {
      if (c.step === step) {
        const cid = CASE_CLIENT_IDS[c.maskedName];
        if (cid) set.add(cid);
      }
    }
    counts[step] = set.size;
  }
  return counts;
}
