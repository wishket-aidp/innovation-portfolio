-- 홈어드민 싱크 idempotency 키
alter table public.client_materials add column if not exists source_id text;
create unique index if not exists client_materials_source_uq
  on public.client_materials (client_id, source_id) where source_id is not null;
