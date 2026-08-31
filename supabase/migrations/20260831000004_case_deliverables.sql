-- 사례 단계별 발표/보고 자료 (킥오프·중간보고·클로징 워게임 덱 등)
alter table public.cases add column if not exists deliverables jsonb not null default '[]';
grant select (deliverables) on public.cases to anon, authenticated;
