import { NextResponse } from "next/server";
import {
  supabaseAdmin,
  MATERIALS_BUCKET,
  clientExists,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";
// 접근 통제는 사이트 전체 미들웨어(Basic 인증)가 담당한다.

// 고객 id 형식 (홈어드민 cuid / 안전 문자만) — 경로 조작(../, /) 차단
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_CATEGORIES = new Set([
  "proposal",
  "transcript",
  "report",
  "contract",
  "deck",
  "file",
]);
// 업로드 허용 MIME (실행/스크립트 렌더 위험 타입 배제). 미지정/불일치는 octet-stream으로 저장.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/haansofthwp",
  "application/x-hwp",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "video/mp4",
  "video/quicktime",
  "application/zip",
]);

/**
 * 고객 자료 업로드 (사이트 전체가 내부 전용 — 미들웨어 Basic 인증 뒤).
 * multipart/form-data: file, clientId, title, category, step?, note?
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const clientId = form.get("clientId");
  const title = form.get("title");
  const categoryRaw = (form.get("category") as string) || "file";
  const stepRaw = form.get("step");
  const note = (form.get("note") as string) || null;

  if (!(file instanceof File) || typeof clientId !== "string" || !title) {
    return NextResponse.json(
      { error: "file, clientId, title 필수" },
      { status: 400 },
    );
  }
  // clientId 형식 검증 (경로 조작 차단)
  if (!CLIENT_ID_RE.test(clientId)) {
    return NextResponse.json({ error: "잘못된 clientId" }, { status: 400 });
  }
  // 실제 고객 존재 확인 (FK 선검증)
  if (!(await clientExists(clientId))) {
    return NextResponse.json({ error: "존재하지 않는 고객" }, { status: 404 });
  }
  // 크기 제한
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 413 },
    );
  }
  // 카테고리 검증
  const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : "file";
  // step 검증 (1~15만 허용)
  let step: number | null = null;
  if (stepRaw) {
    const n = Number(stepRaw);
    if (Number.isInteger(n) && n >= 1 && n <= 15) step = n;
  }
  // MIME 허용목록 — 위험 타입은 octet-stream으로 강등 저장 (+ 서명 URL은 다운로드 강제)
  const safeContentType = ALLOWED_MIME.has(file.type)
    ? file.type
    : "application/octet-stream";

  const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_").slice(0, 120);
  const path = `${clientId}/${Date.now()}_${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabaseAdmin.storage
    .from(MATERIALS_BUCKET)
    .upload(path, buffer, {
      contentType: safeContentType,
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data, error: dbErr } = await supabaseAdmin
    .from("client_materials")
    .insert({
      client_id: clientId,
      step,
      category,
      title,
      storage_path: path,
      file_name: file.name.slice(0, 200),
      mime_type: safeContentType,
      size_bytes: file.size,
      note,
    })
    .select()
    .single();
  if (dbErr) {
    // 메타 저장 실패 시 업로드 파일 롤백
    await supabaseAdmin.storage.from(MATERIALS_BUCKET).remove([path]);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, material: data });
}

/** 자료 삭제 (내부 전용) — ?id= */
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  const { data: row } = await supabaseAdmin
    .from("client_materials")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (row?.storage_path) {
    await supabaseAdmin.storage
      .from(MATERIALS_BUCKET)
      .remove([row.storage_path]);
  }
  await supabaseAdmin.from("client_materials").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
