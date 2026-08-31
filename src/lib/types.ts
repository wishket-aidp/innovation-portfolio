export type DisclosureLevel = "public" | "internal" | "restricted";

export type ProcessGroup =
  | "고민/문제제기 단계"
  | "현황 분석/가치 판단 단계"
  | "구체화 및 확정 단계"
  | "Delivery 단계"
  | "전환 단계";

/**
 * GP: Growth Partner — 고객 사업·계약 맥락 중심, GA·BDE로 인계 (구 컨설턴트/BRE)
 * GA: Growth Architect — 성과 증명 주체, 경영 전략·최상위 목표 부여·확정 (구 DA)
 * BDE: Business Develop Engineer — 실질 수행 주체, Delivery 실행 책임 (구 FDE)
 */
export type Role = "GP" | "GA" | "BDE";

/**
 * 대외 공개용 고객 관점 뷰.
 * 내부 운영 개념(PI, Gate, 통합정보, WBS 등)을 고객이 실제로 겪는 장면으로 실질화한다.
 * 홈페이지에는 이 뷰만 렌더하고, 내부 필드(outputs·gate·hasPlaybook)는 노출하지 않는다.
 * 서술 원칙: 우리 중심이 아니라 고객 중심 — 고객이 놓인 상황에서 시작해 도달 상태로 끝난다.
 */
export interface CustomerView {
  /** 대외용 단계명 (내부 용어 제거) */
  name: string;
  /** 고객에게 이 단계가 어떤 자리인지 한 줄 */
  headline: string;
  /** 이 단계에 들어올 때 고객이 놓여 있는 상황 (공감 서술) */
  situation: string;
  /** 이 단계를 마치면 고객이 놓이게 되는 상태 */
  outcome: string;
  /** 이 단계에서 저희가 드리는 것 */
  weProvide: string[];
  /** 이 단계에서 고객이 하는 일 */
  youDo: string[];
}

export interface ProcessStep {
  no: number;
  slug: string;
  name: string;
  group: ProcessGroup;
  keyQuestion: string;
  roles: Role[];
  outputs: string[];
  gate: string;
  /** 9·12·15단계는 매뉴얼+플레이북으로 운영 */
  hasPlaybook: boolean;
  customer: CustomerView;
}

export interface Client {
  slug: string;
  name: string;
  logo?: string;
  industry?: string;
  referenceConsent: boolean;
  disclosureLevel: DisclosureLevel;
}

/**
 * 대외 공개용 상세 사례 (프로세스 단계 × 고객사).
 * 작성 원칙 (AIDP-CONTEXT.md §4.5):
 * - 고객사 명칭 전문 노출 금지 — maskedName은 항상 첫 글자 + **** 형태
 * - declaration: 업종·규모·상태를 한 문장으로 — 유추는 가능하되 특정은 불가하게
 * - story는 최소 500자, 홈어드민 기록에서 확인된 사실만 사용
 */
export interface DetailedCase {
  step: number;
  /** 첫 글자 + **** 마스킹 명칭 */
  maskedName: string;
  /** 조회자가 동질감을 느끼는 한 문장 선언 (업종·규모·상태) */
  declaration: string;
  /** 카드용 짧은 업종 태그 */
  industryTag: string;
  /** 본문 스토리 (문단 배열, 합계 500자 이상) */
  story: string[];
  /** 고객과 AIDP가 함께한 것 */
  together: string[];
  /** 고객이 한 것 */
  customerDid: string[];
  /** AIDP가 한 것 */
  aidpDid: string[];
  /** 이번 단계를 통해 고객이 얻어낸 성과 (추상적이어도 가시적으로) */
  gained: string;
  /** 위시켓 외 업체(SI·전략 컨설팅 등)와 진행했다면 맞닥뜨렸을 상황 (추정·제안 톤) */
  alternative: string;
  /**
   * 이 단계의 발표/보고 자료 (킥오프·중간보고·클로징 워게임 덱 등).
   * 홈어드민 Delivery > deliverables에 해당 단계 자료가 첨부되면 여기에 연결.
   */
  deliverables?: { title: string; url: string; note?: string }[];
  /** 시간순 요약 */
  timeline: { date: string; label: string }[];
}

/** 고객사 × 프로세스 단계 = 1 사례 */
export interface CaseStudy {
  clientSlug: string;
  step: number;
  /** 고민: 확인된 사실 (고객의 언어) */
  challenge: string;
  /** 판단·결정: AIDP가 어떻게 접근했나 */
  approach: string;
  /** 해결: 결과와 다음 단계로의 연결 */
  resolution: string;
  /** 근거·산출물 (공개 가능 범위 내) */
  evidence?: string;
  date?: string;
  disclosureLevel: DisclosureLevel;
}
