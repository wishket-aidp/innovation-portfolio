-- 사례에 성과(gained)·대안 시나리오(alternative) 추가
alter table public.cases add column if not exists gained text;
alter table public.cases add column if not exists alternative text;

-- 신규 컬럼도 공개(anon) 읽기 허용 — 기존 컬럼 권한과 동일 정책
grant select (gained, alternative) on public.cases to anon, authenticated;
