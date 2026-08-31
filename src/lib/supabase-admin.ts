import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트 (service_role).
 * 절대 클라이언트 컴포넌트에서 import 금지 — RLS를 우회하는 키다.
 * 고객 자료(기밀)는 이 클라이언트를 통해서만 접근한다.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

export const MATERIALS_BUCKET = "client-materials";

/** 내부 관리 페이지 노출 여부 — 대외 배포에서는 INTERNAL_ADMIN 미설정으로 숨김 */
export const isInternalAdmin = process.env.INTERNAL_ADMIN === "1";

export interface ClientMaterial {
  id: string;
  client_id: string | null;
  step: number | null;
  category: string;
  title: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  note: string | null;
  uploaded_at: string;
}

export interface ClientRow {
  id: string;
  name: string;
  masked_name: string | null;
  industry: string | null;
  logo_file: string | null;
}

/** 내부용: 실명 포함 고객 목록 (계약 체결 고객만) */
export async function listClients(): Promise<ClientRow[]> {
  const { data } = await supabaseAdmin
    .from("clients")
    .select("id, name, masked_name, industry, logo_file")
    .order("name");
  return data ?? [];
}

export async function getClient(id: string): Promise<ClientRow | null> {
  const { data } = await supabaseAdmin
    .from("clients")
    .select("id, name, masked_name, industry, logo_file")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getClientMaterials(
  clientId: string,
): Promise<ClientMaterial[]> {
  const { data } = await supabaseAdmin
    .from("client_materials")
    .select("*")
    .eq("client_id", clientId)
    .order("step", { ascending: true, nullsFirst: false })
    .order("uploaded_at", { ascending: false });
  return (data as ClientMaterial[]) ?? [];
}

export interface ClientCaseRow {
  step: number;
  masked_name: string;
  story: string[];
  gained: string;
}

/** 내부용: 특정 고객의 프로세스 사례 (단계순) */
export async function getClientCases(
  clientId: string,
): Promise<ClientCaseRow[]> {
  const { data } = await supabaseAdmin
    .from("cases")
    .select("step, masked_name, story, gained")
    .eq("client_id", clientId)
    .order("step");
  return (data as ClientCaseRow[]) ?? [];
}

/**
 * 비공개 버킷 파일의 서명 URL (60분 유효).
 * download:true 로 Content-Disposition: attachment 강제 → 브라우저가 렌더하지 않고 내려받음
 * (업로드된 HTML/SVG 등의 stored XSS 방지).
 */
export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(path, 3600, { download: true });
  return data?.signedUrl ?? null;
}

/** 고객 존재 확인 (업로드 전 FK 검증용) */
export async function clientExists(id: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  return !!data;
}
