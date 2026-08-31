import type { ProcessStep, ProcessGroup } from "./types";

/**
 * AIDP 프로젝트 운영 통합 매뉴얼 v9 기준 15단계 정의.
 * customer 필드는 대외 공개용 — 내부 운영 개념을 고객이 실제로 겪는 장면으로 실질화한 것.
 */
export const PROCESS_STEPS: ProcessStep[] = [
  {
    no: 1,
    slug: "lead-call",
    name: "리드콜",
    group: "영업 기회",
    keyQuestion: "고객이 해결하려는 문제와 대화의 출발점이 확인됐는가?",
    roles: ["GP"],
    outputs: ["리드콜 노트", "기회 기본정보"],
    gate: "문제와 다음 대화의 목적이 확인됨",
    hasPlaybook: false,
    customer: {
      name: "첫 대화",
      headline: "지금 겪고 있는 문제를 처음 꺼내놓는 자리",
      experience: [
        "전화나 미팅으로 현재 겪는 문제와 그 배경을 편하게 이야기합니다",
        "어떤 결과를 기대하는지, 왜 지금 필요한지를 함께 짚어봅니다",
        "다음 만남에서 무엇을 확인할지, 누가 함께하면 좋을지 정합니다",
      ],
      gets: [
        "우리 회사 문제를 정리한 첫 요약",
        "목적이 분명한 다음 미팅 일정",
      ],
    },
  },
  {
    no: 2,
    slug: "qualification",
    name: "기회 적격성 확인",
    group: "영업 기회",
    keyQuestion: "AIDP가 실질적으로 기여할 수 있는 기회인가?",
    roles: ["GP", "GA"],
    outputs: ["기회 적격성 판단", "PI 제안"],
    gate: "PI 진행 필요성과 담당자가 합의됨",
    hasPlaybook: false,
    customer: {
      name: "적합성 검토",
      headline: "AIDP가 정말 도움이 되는 일인지 함께 확인하는 자리",
      experience: [
        "문제가 얼마나 크고 시급한지, 데이터와 기술로 풀 수 있는 문제인지 함께 검토합니다",
        "예산·일정·내부 의사결정 구조를 공유하고 현실적인 진행 조건을 맞춰봅니다",
        "도움이 되기 어렵다고 판단되면 그 이유를 솔직하게 말씀드립니다",
      ],
      gets: [
        "진행 여부에 대한 솔직한 의견",
        "다음 단계인 사전 진단 제안",
      ],
    },
  },
  {
    no: 3,
    slug: "pi-prep",
    name: "PI 준비",
    group: "PI·판단",
    keyQuestion: "진단에 필요한 사람·자료·질문이 준비됐는가?",
    roles: ["GP", "GA"],
    outputs: ["PI 계획", "질문지", "자료요청 목록"],
    gate: "고객과 진단 일정·참여자가 확정됨",
    hasPlaybook: false,
    customer: {
      name: "진단 준비",
      headline: "정확한 진단을 위해 사람·자료·질문을 미리 맞추는 자리",
      experience: [
        "인터뷰할 분들(경영진부터 실무자까지)을 함께 정합니다",
        "진단에 필요한 자료 목록을 미리 받아 내부에서 준비할 시간을 확보합니다",
        "진단 일정과 현장 방문 계획을 확정합니다",
      ],
      gets: [
        "무엇을 어떻게 진단할지 담은 계획서",
        "미리 준비할 자료 목록과 질문지",
      ],
    },
  },
  {
    no: 4,
    slug: "pi-diagnosis",
    name: "PI 진단",
    group: "PI·판단",
    keyQuestion: "현행 업무·데이터·시스템과 문제 원인이 검증됐는가?",
    roles: ["GA", "BDE"],
    outputs: ["PI 진단 결과", "기회/제약 목록"],
    gate: "해결 가능성과 범위 가설이 근거와 함께 정리됨",
    hasPlaybook: false,
    customer: {
      name: "현장 진단",
      headline: "일하는 방식·데이터·시스템을 직접 보고 문제의 진짜 원인을 찾는 자리",
      experience: [
        "현업 인터뷰와 실제 데이터·시스템 확인으로 문제의 원인을 검증합니다",
        "진단 기간 중에도 진행 상황을 수시로 공유받습니다 — 결과만 기다리지 않습니다",
        "\"이건 됩니다, 이건 어렵습니다\"를 근거와 함께 확인합니다",
      ],
      gets: [
        "문제의 원인을 근거로 정리한 진단 결과",
        "해결할 수 있는 것과 제약이 되는 것의 목록",
      ],
    },
  },
  {
    no: 5,
    slug: "go-no-go",
    name: "Go/No-Go",
    group: "PI·판단",
    keyQuestion: "수행 가치와 실행 가능성을 근거로 착수 여부를 결정했는가?",
    roles: ["GP", "GA", "BDE"],
    outputs: ["Go/No-Go 결정", "조건", "후속조치"],
    gate: "진행 여부와 전제조건이 승인됨",
    hasPlaybook: false,
    customer: {
      name: "착수 판단",
      headline: "할 가치가 있는 일인지, 실제로 되는 일인지 근거를 놓고 결정하는 자리",
      experience: [
        "진단 결과를 근거로 사업 가치와 기술 가능성을 함께 확인합니다",
        "아직 확정되지 않은 조건이 있다면 숨기지 않고 책임자·기한과 함께 공개합니다",
        "가치가 없다고 판단되면 진행하지 않습니다 — 무리한 계약을 권하지 않습니다",
      ],
      gets: [
        "착수 권고안과 전제조건",
        "미확정 사항별 확인 계획",
      ],
    },
  },
  {
    no: 6,
    slug: "proposal",
    name: "제안·범위·견적",
    group: "업무범위·계약",
    keyQuestion: "고객의 문제와 약속할 수행 범위가 연결됐는가?",
    roles: ["GP"],
    outputs: ["제안서", "SOW", "견적"],
    gate: "양측이 범위·일정·비용을 협의 완료",
    hasPlaybook: false,
    customer: {
      name: "제안과 견적",
      headline: "무엇을 어디까지 함께할지 문서로 약속하는 자리",
      experience: [
        "우리 회사 문제와 해결 범위가 어떻게 연결되는지 확인합니다",
        "무엇이 만들어지고, 완료를 무엇으로 판단할지 문서로 검토합니다",
        "일정과 비용을 투명하게 협의합니다",
      ],
      gets: [
        "제안서와 수행범위 문서",
        "산출물·완료 기준이 연결된 견적서",
      ],
    },
  },
  {
    no: 7,
    slug: "contract",
    name: "계약",
    group: "업무범위·계약",
    keyQuestion: "프로젝트의 약속과 책임이 계약 문서로 확정됐는가?",
    roles: ["GP"],
    outputs: ["계약서", "최종 SOW"],
    gate: "서명 완료 및 착수 가능 상태",
    hasPlaybook: false,
    customer: {
      name: "계약",
      headline: "약속과 책임을 문서로 확정하는 자리",
      experience: [
        "최종 범위·기간·금액을 확정합니다",
        "진행 중 변경이 생기면 어떻게 다룰지, 검수는 어떻게 할지 미리 합의합니다",
      ],
      gets: [
        "서명된 계약서와 최종 수행범위 문서",
        "프로젝트 약속의 정본",
      ],
    },
  },
  {
    no: 8,
    slug: "delivery-handoff",
    name: "Delivery 인계",
    group: "업무범위·계약",
    keyQuestion: "영업·PI의 약속과 맥락이 수행팀에 빠짐없이 전달됐는가?",
    roles: ["GP", "GA", "BDE"],
    outputs: ["Delivery 인계서", "원천자료", "미결 목록"],
    gate: "BDE가 프로젝트와 첫 업무를 설명할 수 있음",
    hasPlaybook: false,
    customer: {
      name: "수행팀 연결",
      headline: "지금까지 나눈 모든 대화가 수행팀에 그대로 전달되는 자리",
      experience: [
        "같은 이야기를 수행팀에게 처음부터 다시 설명할 필요가 없습니다",
        "그동안의 논의 배경·결정·미확정 사항까지 수행팀이 이미 파악한 상태로 만납니다",
        "실행을 책임질 담당자를 소개받습니다",
      ],
      gets: [
        "프로젝트를 이미 이해하고 있는 수행팀",
        "실행 책임자와의 첫 미팅",
      ],
    },
  },
  {
    no: 9,
    slug: "kickoff",
    name: "킥오프·착수보고",
    group: "Delivery",
    keyQuestion:
      "BDE가 추가 설명 없이 프로젝트를 설명하고 고객과 첫 주 업무를 시작할 수 있는가?",
    roles: ["GP", "BDE"],
    outputs: ["킥오프 통합정보 (12영역)", "고객용 착수보고서 (8목차)"],
    gate: "승인된 착수 기준과 첫 주 실행 계획",
    hasPlaybook: true,
    customer: {
      name: "킥오프",
      headline: "왜·무엇을·누구와·언제까지 만들지 한 자리에서 확정하는 자리",
      experience: [
        "왜 시작하는지부터 목표·범위·일정·산출물까지 착수보고로 한 번에 확인합니다",
        "누가 무엇을 결정하고 어떤 채널로 소통할지 역할과 보고 체계를 확정합니다",
        "킥오프 다음 날 바로 시작할 첫 주 실행 계획을 함께 승인합니다",
      ],
      gets: [
        "프로젝트 전체가 담긴 착수보고서",
        "승인된 첫 주 실행 계획",
        "정해진 소통 채널과 보고 주기",
      ],
    },
  },
  {
    no: 10,
    slug: "discovery",
    name: "Discovery·Envision",
    group: "Delivery",
    keyQuestion: "현업 요구와 데이터 근거로 구현할 목표 상태가 구체화됐는가?",
    roles: ["GA", "BDE"],
    outputs: ["요구사항", "데이터 진단", "To-Be"],
    gate: "구현 대상과 우선순위가 합의됨",
    hasPlaybook: false,
    customer: {
      name: "요구 구체화",
      headline: "현업의 목소리와 데이터를 근거로 완성될 모습을 함께 그리는 자리",
      experience: [
        "실제 사용할 분들의 업무와 요구를 인터뷰로 확인합니다",
        "데이터의 구조와 품질을 진단해 되는 것과 보완할 것을 가립니다",
        "완성될 화면과 기능의 우선순위를 함께 정합니다",
      ],
      gets: [
        "정리된 요구사항과 데이터 진단 결과",
        "완성될 모습(To-Be)과 우선순위 합의",
      ],
    },
  },
  {
    no: 11,
    slug: "planning",
    name: "실행계획 수립",
    group: "Delivery",
    keyQuestion: "합의한 목표를 실행 가능한 작업과 일정으로 전환했는가?",
    roles: ["GA", "BDE"],
    outputs: ["실행계획", "WBS", "기술설계"],
    gate: "담당자별 작업과 완료 기준이 준비됨",
    hasPlaybook: false,
    customer: {
      name: "실행 계획",
      headline: "합의한 목표를 누가·언제·무엇으로 만드는지 일정표로 바꾸는 자리",
      experience: [
        "작업 목록과 담당자·완료 기준을 확인합니다",
        "고객 쪽에서 챙겨야 할 일(자료·결정·검토)도 같은 일정표에 함께 넣습니다",
        "작업 간 선후 관계를 확인해 무엇이 지연되면 무엇이 영향을 받는지 미리 압니다",
      ],
      gets: [
        "담당자와 완료 기준이 붙은 실행 일정표",
        "우리 회사가 챙길 일의 목록과 기한",
      ],
    },
  },
  {
    no: 12,
    slug: "interim-report",
    name: "Build·중간보고",
    group: "Delivery",
    keyQuestion:
      "고객이 현재 결과와 남은 길을 이해하고 잔여 일정·결정·액션을 서면으로 합의했는가?",
    roles: ["BDE", "GP"],
    outputs: ["현재 상태·근거 패키지", "잔여 WBS·결정 서면"],
    gate: "잔여 일정·결정·액션 서면 합의",
    hasPlaybook: true,
    customer: {
      name: "중간보고",
      headline: "진행률 숫자가 아니라 실제 화면과 시연으로 중간 결과를 확인하는 자리",
      experience: [
        "\"70% 완료\" 같은 숫자 대신, 동작하는 화면과 리허설된 시연을 직접 봅니다",
        "시작 후 새로 발견된 사실이 설계에 어떻게 반영됐는지 설명받습니다",
        "남은 일정과 결정할 사항을 그 자리에서 합의하고, 다음 날 서면으로 받습니다",
      ],
      gets: [
        "눈으로 확인한 중간 결과물",
        "남은 일정·담당·결정 사항의 서면 합의",
      ],
    },
  },
  {
    no: 13,
    slug: "uat",
    name: "검증·UAT",
    group: "Delivery",
    keyQuestion: "산출물이 실제 업무에서 검수 기준을 충족하는가?",
    roles: ["BDE"],
    outputs: ["UAT 결과", "결함조치", "검수 확인"],
    gate: "합의된 검수 기준 충족 및 배포 승인",
    hasPlaybook: false,
    customer: {
      name: "검증",
      headline: "실제 업무 시나리오로 직접 써보고 완료를 판단하는 자리",
      experience: [
        "계약 때 합의한 완료 기준으로 실제 업무 시나리오를 직접 테스트합니다",
        "발견된 문제는 목록으로 관리되고, 조치 결과를 다시 확인합니다",
        "기준을 충족했을 때만 오픈을 승인합니다",
      ],
      gets: [
        "직접 검증한 결과와 검수 확인서",
        "발견된 문제의 조치 내역",
      ],
    },
  },
  {
    no: 14,
    slug: "deployment",
    name: "배포·교육·운영 인계",
    group: "전환·종료",
    keyQuestion: "고객이 결과물을 안정적으로 사용하고 운영할 수 있는가?",
    roles: ["BDE"],
    outputs: ["배포본", "교육자료", "운영 인계서"],
    gate: "운영 책임자가 인수하고 자립 운영 가능",
    hasPlaybook: false,
    customer: {
      name: "오픈과 교육",
      headline: "시스템을 열고, 우리 팀이 직접 다룰 수 있게 배우는 자리",
      experience: [
        "실제 운영 환경에 시스템을 열고 안정화 기간을 함께 지켜봅니다",
        "사용자와 운영 담당자가 각각 필요한 교육을 받습니다",
        "권한·문서·운영 절차를 우리 팀이 정식으로 인수합니다",
      ],
      gets: [
        "운영 중인 시스템",
        "역할별 교육과 운영 가이드",
        "우리 팀이 직접 변경·운영할 수 있는 권한과 절차",
      ],
    },
  },
  {
    no: 15,
    slug: "closing",
    name: "클로징·종료",
    group: "전환·종료",
    keyQuestion:
      "양측이 완료 상태와 잔여 책임을 승인하고 다음 책임자가 명확한가?",
    roles: ["GP", "GA", "BDE"],
    outputs: ["성과·완료 증적 패키지", "종료 승인", "케이스 스터디 (D+30 자산화)"],
    gate: "완료 서면·지도·사실 경계·라포 인계 및 D+30 자산화",
    hasPlaybook: true,
    customer: {
      name: "클로징",
      headline: "시작할 때의 약속을 운영 기록으로 증명하고 마무리하는 자리",
      experience: [
        "킥오프 때 약속한 목표 대비 결과를 실제 운영 데이터로 확인합니다",
        "미완료가 있다면 포장하지 않고 기한·책임자와 함께 정직하게 공개합니다",
        "남은 과제와 이후 지원 체계를 확정하고, 다음 단계 여부는 고객이 결정합니다",
      ],
      gets: [
        "약속 대비 성과가 기록으로 증명된 종료보고서",
        "이후 지원·연락 체계",
        "필요하면 이어갈 다음 단계의 선택지",
      ],
    },
  },
];

export const PROCESS_GROUPS: { name: ProcessGroup; description: string }[] = [
  { name: "영업 기회", description: "문제와 기회 확인" },
  { name: "PI·판단", description: "가능성과 범위 진단" },
  { name: "업무범위·계약", description: "약속과 책임 확정" },
  { name: "Delivery", description: "착수·요구·계획·구현·검증" },
  { name: "전환·종료", description: "운영 이관과 관계 전환" },
];

/** 대외 공개용 그룹 설명 — 고객 여정의 언어로 */
export const PUBLIC_GROUP_DESCRIPTIONS: Record<ProcessGroup, string> = {
  "영업 기회": "문제를 꺼내놓고, 함께할 만한 일인지 확인합니다",
  "PI·판단": "현장을 직접 진단하고, 되는 일인지 근거로 판단합니다",
  "업무범위·계약": "무엇을 어디까지 할지 문서로 약속합니다",
  Delivery: "약속을 눈에 보이는 결과물로 만들어 갑니다",
  "전환·종료": "직접 운영할 수 있게 넘겨드리고, 약속을 증명하며 마무리합니다",
};

export function getStepBySlug(slug: string): ProcessStep | undefined {
  return PROCESS_STEPS.find((s) => s.slug === slug);
}

export function getStepsByGroup(group: ProcessGroup): ProcessStep[] {
  return PROCESS_STEPS.filter((s) => s.group === group);
}
