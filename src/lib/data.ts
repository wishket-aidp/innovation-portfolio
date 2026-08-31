import type { CaseStudy, Client } from "./types";

/**
 * 사례·고객사 시드 데이터.
 * 1차: 리포 내 수동 관리 → 2차: 클로징 D+30 자산화 파이프라인 자동 수집 (AIDP-CONTEXT.md §4.3)
 * 게시 조건: disclosureLevel === "public" && referenceConsent === true
 */
export const CLIENTS: Client[] = [
  // TODO: 레퍼런스 동의 확보된 고객사로 채운다
];

export const CASE_STUDIES: CaseStudy[] = [
  // TODO: 고객사 × 단계 사례 (challenge / approach / resolution)
];

export function getPublicClients(): Client[] {
  return CLIENTS.filter(
    (c) => c.disclosureLevel === "public" && c.referenceConsent,
  );
}

export function getCasesByStep(step: number): CaseStudy[] {
  return CASE_STUDIES.filter(
    (c) => c.step === step && c.disclosureLevel === "public",
  );
}

export function getCasesByClient(clientSlug: string): CaseStudy[] {
  return CASE_STUDIES.filter(
    (c) => c.clientSlug === clientSlug && c.disclosureLevel === "public",
  );
}
