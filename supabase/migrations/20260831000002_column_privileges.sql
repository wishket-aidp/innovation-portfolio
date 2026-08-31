-- 마스킹 보호: anon이 사례↔실명을 조인으로 매핑하지 못하도록 컬럼 단위 권한 제한
-- clients.name(실명)과 cases.client_id(연결키)를 공개 role에서 제거

revoke select on public.clients from anon, authenticated;
grant select (id, masked_name, logo_file, industry, disclosure_level)
  on public.clients to anon, authenticated;

revoke select on public.cases from anon, authenticated;
grant select (id, step, masked_name, declaration, industry_tag,
              story, together, customer_did, aidp_did, timeline, status, created_at)
  on public.cases to anon, authenticated;
