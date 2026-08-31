-- innovation-portfolio 초기 스키마
-- clients: 계약 체결 고객 (레퍼런스 동의·공개수준 관리)
-- cases: 프로세스 단계별 상세 사례 (마스킹 콘텐츠)
-- sync_log: 홈어드민 → 포트폴리오 동기화 이력

create table public.clients (
  id text primary key,                     -- 홈어드민 companyId
  name text not null,                      -- 내부 관리용 실명 (대외 비노출)
  masked_name text,                        -- 첫 글자 + ****
  logo_file text,                          -- public/logos/ 파일명
  industry text,
  reference_consent boolean not null default false,
  disclosure_level text not null default 'internal'
    check (disclosure_level in ('public','internal','restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  client_id text references public.clients(id) on delete set null,
  step int not null check (step between 1 and 15),
  masked_name text not null,
  declaration text not null,
  industry_tag text not null,
  story jsonb not null default '[]',       -- 문단 배열 (합계 500자 이상 규칙)
  together jsonb not null default '[]',
  customer_did jsonb not null default '[]',
  aidp_did jsonb not null default '[]',
  timeline jsonb not null default '[]',    -- [{date,label}]
  status text not null default 'draft'
    check (status in ('draft','review','published')),
  source_note text,                        -- 원천 근거 (녹취록·계약 등 내부 참조)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cases_step_idx on public.cases (step) where status = 'published';

create table public.sync_log (
  id bigint generated always as identity primary key,
  source text not null,                    -- 'home-admin'
  kind text not null,                      -- 'companies' | 'contracts' | 'cases'
  detail jsonb,
  synced_at timestamptz not null default now()
);

-- RLS: 공개 사이트(anon)는 published/동의 데이터만 읽기
alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.sync_log enable row level security;

create policy "anon_read_public_clients" on public.clients
  for select using (disclosure_level = 'public' and reference_consent);

create policy "anon_read_published_cases" on public.cases
  for select using (status = 'published');

-- sync_log는 service role 전용 (anon 정책 없음)
