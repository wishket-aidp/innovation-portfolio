-- 고객 자료 저장소 (내부 전용) — 녹취·제안서·발표자료 등 기밀 자료 메타데이터.
-- 실제 파일은 Supabase Storage 'client-materials' 버킷(비공개)에 저장, 여기엔 메타만.
create table if not exists public.client_materials (
  id uuid primary key default gen_random_uuid(),
  client_id text references public.clients(id) on delete cascade,
  step int check (step between 1 and 15),        -- 연관 프로세스 단계 (없으면 null)
  category text not null default 'file'
    check (category in ('proposal','transcript','report','contract','deck','file')),
  title text not null,
  storage_path text not null,                     -- Storage 내 경로
  file_name text,
  mime_type text,
  size_bytes bigint,
  note text,
  uploaded_at timestamptz not null default now()
);
create index if not exists client_materials_client_idx on public.client_materials (client_id);

-- 기밀: anon/authenticated 접근 전면 차단 (service_role 서버 라우트로만 접근)
alter table public.client_materials enable row level security;
revoke all on public.client_materials from anon, authenticated;
