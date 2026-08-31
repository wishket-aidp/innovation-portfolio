import { NextResponse } from "next/server";
import {
  supabaseAdmin,
  MATERIALS_BUCKET,
  isInternalAdmin,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * 고객 자료 업로드 (내부 전용).
 * multipart/form-data: file, clientId, title, category, step?, note?
 * 대외 배포(INTERNAL_ADMIN 미설정)에서는 404 — 이 라우트 자체가 없는 것처럼.
 */
export async function POST(request: Request) {
  if (!isInternalAdmin) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const clientId = form.get("clientId");
  const title = form.get("title");
  const category = (form.get("category") as string) || "file";
  const stepRaw = form.get("step");
  const note = (form.get("note") as string) || null;

  if (!(file instanceof File) || !clientId || !title) {
    return NextResponse.json(
      { error: "file, clientId, title 필수" },
      { status: 400 },
    );
  }

  const step = stepRaw ? Number(stepRaw) : null;
  const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
  const path = `${clientId}/${Date.now()}_${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabaseAdmin.storage
    .from(MATERIALS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
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
      file_name: file.name,
      mime_type: file.type || null,
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
  if (!isInternalAdmin) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
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
