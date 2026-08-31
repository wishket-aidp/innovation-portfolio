-- (고객 × 단계) AI 생성 요약 — 자료 기반으로 "이 단계에서 무슨 일이 있었는지"
create table if not exists public.stage_summaries (
  client_id text not null references public.clients(id) on delete cascade,
  step int not null check (step between 1 and 15),
  summary text not null,
  source_count int not null default 0,   -- 요약에 사용된 자료 수
  updated_at timestamptz not null default now(),
  primary key (client_id, step)
);
-- 내부 전용 서버 라우트(service_role)로만 접근
alter table public.stage_summaries enable row level security;
revoke all on public.stage_summaries from anon, authenticated;
