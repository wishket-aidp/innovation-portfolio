#!/usr/bin/env python3
"""
홈어드민의 고객 자료(마크다운 문서 + 모든 첨부파일: PDF·이미지 등)를
포트폴리오 자료실로 싱크한다. AI(Claude)가 각 자료의 프로세스 단계를 추론한다.

- 문서: company_knowledge_docs 본문 → .md 업로드
- 첨부: request/company_knowledge/project_files/contract 첨부 → 원본 파일 다운로드 후 재업로드
  (work_item_attachments 는 회사 연결이 폴리모픽이라 제외)
- 저장: Supabase Storage(client-materials, 비공개) + client_materials 메타
- idempotent: source_id 로 upsert. 기존 행은 AI 추론 단계만 갱신.

사용:  python3 scripts/sync-materials.py
필요 자격:
  포트폴리오 → .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_PASSWORD)
  홈어드민 DB/스토리지 → ~/source/aidp/sales/.env.production (또는 HOME_ADMIN_DB_URL 등 env)
  AI → ANTHROPIC_API_KEY (또는 ~/.claude/claude-graph.env)
"""
import asyncio
import json
import os
import re
import sys
import urllib.request
import urllib.error
from urllib.parse import quote

import asyncpg  # type: ignore

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUCKET = "client-materials"
UPLOAD_CONCURRENCY = 8
AI_BATCH = 20
AI_MODEL = "claude-haiku-4-5-20251001"
MAX_BYTES = 50 * 1024 * 1024

# 홈어드민 첨부 테이블 → (버킷, 회사조인 SQL)
ATTACH_SOURCES = {
    "request": (
        "request-attachments",
        '''select ra.id, ra.filename, ra."mimeType" mime, ra."storageKey" key,
                  ra."sizeBytes" sz, r."companyId" cid, r.title ctx
           from request_attachments ra join requests r on r.id=ra."requestId"
           where ra."deletedAt" is null and r."companyId" = any($1::text[])''',
    ),
    "knowledge": (
        "company-knowledge-attachments",
        '''select ka.id, ka.filename, ka."mimeType" mime, ka."storageKey" key,
                  ka."sizeBytes" sz, ka."companyId" cid, coalesce(d.title,'') ctx
           from company_knowledge_attachments ka
           left join company_knowledge_docs d on d.id = ka."docId"
           where ka."deletedAt" is null and ka."companyId" = any($1::text[])''',
    ),
    "project_file": (
        "project-drive-files",
        '''select pf.id, coalesce(pf.title, pf.id) filename, pf.mime, pf."storageKey" key,
                  pf."sizeBytes" sz, p."companyId" cid, coalesce(pf.description,'') ctx
           from project_files pf join projects p on p.id=pf."projectId"
           where pf."deletedAt" is null and pf."storageKey" is not null
             and p."companyId" = any($1::text[])''',
    ),
    "contract": (
        "contract-attachments",
        '''select ca.id, ca.filename, ca."mimeType" mime, ca."storageKey" key,
                  ca."sizeBytes" sz, ct."companyId" cid, ct.title ctx
           from contract_attachments ca join contracts ct on ct.id=ca."contractId"
           where ct."companyId" = any($1::text[])''',
    ),
}

STAGE_DEFS = """AIDP 프로세스 15단계:
1 첫 대화(첫 접점·리드콜) / 2 문제 정의 / 3 사전 진단 / 4 현장 진단(인터뷰·진단서) /
5 가치 판단(Go/No-Go) / 6 구체화 및 제안(제안서·견적·SOW) / 7 계획(계약·확정 계획) /
8 실무진 onboard(인계) / 9 킥오프(착수보고) / 10 시스템 확정(요구사항·설계) /
11 R&R 확정(WBS·실행계획) / 12 중간 보고 / 13 검증(UAT·검수) /
14 오픈 및 교육(배포·운영 인계) / 15 클로징(종료·최종보고)"""


def load_env_file(path):
    env = {}
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


PORT = load_env_file(os.path.join(ROOT, ".env.local"))
SUPA_URL = PORT.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE = PORT.get("SUPABASE_SERVICE_ROLE_KEY")
PORT_REF = SUPA_URL.split("//")[1].split(".")[0] if SUPA_URL else None
PORT_DB = f"postgresql://postgres.{PORT_REF}:{PORT.get('SUPABASE_DB_PASSWORD')}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"

SALES = load_env_file(os.path.expanduser("~/source/aidp/sales/.env.production"))
HOME_DB = re.sub(
    r"[?&]sslmode=[^&]*",
    "",
    os.environ.get("HOME_ADMIN_DB_URL")
    or SALES.get("SB_STORAGE_POSTGRES_URL_NON_POOLING", ""),
)
HOME_STORAGE_URL = SALES.get("SB_STORAGE_SUPABASE_URL")
HOME_STORAGE_KEY = SALES.get("SB_STORAGE_SUPABASE_SERVICE_ROLE_KEY")

ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY") or load_env_file(
    os.path.expanduser("~/.claude/claude-graph.env")
).get("ANTHROPIC_API_KEY")


def categorize(name: str) -> str:
    if any(k in name for k in ("녹취", "전사", "STT", "클로바")):
        return "transcript"
    if any(k in name for k in ("제안서", "견적", "SOW", "수행계획")):
        return "proposal"
    if "계약" in name:
        return "contract"
    if any(k in name for k in ("킥오프 자료", "발표", "덱", "deck", ".pptx", ".key")):
        return "deck"
    if any(k in name for k in ("보고서", "중간보고", "최종보고", "진단서", "요약", "회의록", "인터뷰", "분석")):
        return "report"
    return "file"


# ── AI 단계 추론 ────────────────────────────────────────────────
def ai_classify(items):
    """items: [{sid, desc}] → {sid: step or None}. 배치 호출."""
    result = {}
    if not ANTHROPIC_KEY:
        print("  ⚠ ANTHROPIC_API_KEY 없음 — 단계 추론 생략 (전부 미지정)")
        return {it["sid"]: None for it in items}
    for start in range(0, len(items), AI_BATCH):
        batch = items[start : start + AI_BATCH]
        listing = "\n".join(f"[{i}] {b['desc'][:600]}" for i, b in enumerate(batch))
        prompt = (
            f"{STAGE_DEFS}\n\n아래 각 고객 자료를 내용으로 판단해 가장 알맞은 단계 번호(1~15)로 "
            f"분류하라. 단계를 특정하기 어려운 일반 자료는 0.\n\n{listing}\n\n"
            'JSON 배열만 출력: [{"i":0,"step":9},{"i":1,"step":0},...]'
        )
        body = json.dumps(
            {
                "model": AI_MODEL,
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}],
            }
        ).encode()
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages", data=body, method="POST"
        )
        req.add_header("x-api-key", ANTHROPIC_KEY)
        req.add_header("anthropic-version", "2023-06-01")
        req.add_header("content-type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.load(r)
            text = data["content"][0]["text"]
            arr = json.loads(re.search(r"\[.*\]", text, re.S).group(0))
            for o in arr:
                step = o.get("step")
                result[batch[o["i"]]["sid"]] = step if step and 1 <= step <= 15 else None
        except Exception as e:
            print(f"  ⚠ AI 배치 실패({start}): {str(e)[:80]}")
            for b in batch:
                result.setdefault(b["sid"], None)
        print(f"    AI 분류 {min(start+AI_BATCH,len(items))}/{len(items)}", end="\r")
    print()
    return result


def upload_object(path, body, mime):
    url = f"{SUPA_URL}/storage/v1/object/{BUCKET}/{quote(path)}"
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Authorization", f"Bearer {SERVICE}")
    req.add_header("apikey", SERVICE)
    req.add_header("Content-Type", mime or "application/octet-stream")
    req.add_header("x-upsert", "true")
    try:
        urllib.request.urlopen(req, timeout=120)
        return True
    except urllib.error.HTTPError as e:
        print(f"    ✗ upload {path}: {e.code} {e.read().decode()[:100]}")
        return False


def download_home(bucket, key):
    url = f"{HOME_STORAGE_URL}/storage/v1/object/{bucket}/{quote(key)}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {HOME_STORAGE_KEY}")
    req.add_header("apikey", HOME_STORAGE_KEY)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        print(f"    ✗ download {bucket}/{key[:40]}: {e.code}")
        return None


def safe(s, n=120):
    return re.sub(r"[^\w.\-가-힣]", "_", s)[:n]


async def main():
    if not (SUPA_URL and SERVICE and PORT.get("SUPABASE_DB_PASSWORD")):
        sys.exit(".env.local 자격 부족")
    if not HOME_DB:
        sys.exit("홈어드민 DB URL 없음")

    home = await asyncpg.connect(HOME_DB, ssl="require", timeout=30)
    await home.execute("SET default_transaction_read_only=on")
    port = await asyncpg.connect(PORT_DB, ssl="require", timeout=30)

    client_ids = [r["id"] for r in await port.fetch("select id from clients")]
    existing = {
        (r["client_id"], r["source_id"])
        for r in await port.fetch(
            "select client_id, source_id from client_materials where source_id is not null"
        )
    }

    # ── 작업 목록 구성 ──
    worklist = []  # {cid, sid, kind, title, mime, category, desc, bucket?, key?, body?}
    # 1) 마크다운 문서
    docs = await home.fetch(
        '''select d.id, d."companyId" cid, d.title, d.body
           from company_knowledge_docs d
           where d."companyId" = any($1::text[]) and d."deletedAt" is null
             and d.body is not null and length(d.body) > 0''',
        client_ids,
    )
    for d in docs:
        worklist.append(
            {
                "cid": d["cid"], "sid": d["id"], "kind": "doc",
                "title": d["title"], "mime": "text/markdown",
                "category": categorize(d["title"]),
                "desc": f"{d['title']} | {d['body'][:400]}",
                "path": f"{d['cid']}/{d['id']}.md",
                "body": d["body"].encode("utf-8"),
                "fname": safe(d["title"], 180) + ".md",
            }
        )
    # 2) 첨부 파일
    for name, (bucket, sql) in ATTACH_SOURCES.items():
        for a in await home.fetch(sql, client_ids):
            if a["sz"] and a["sz"] > MAX_BYTES:
                continue
            sid = f"file:{a['id']}"
            # 스토리지 키는 ASCII만 허용 → 확장자만 붙이고 원본명은 DB 표시용(fname)에만
            ext = os.path.splitext(a["filename"])[1]
            ext = "." + re.sub(r"[^A-Za-z0-9]", "", ext)[:8] if ext else ""
            worklist.append(
                {
                    "cid": a["cid"], "sid": sid, "kind": "file",
                    "title": a["filename"], "mime": a["mime"],
                    "category": categorize(a["filename"] + " " + (a["ctx"] or "")),
                    "desc": f"{a['filename']} | {a['ctx'] or ''}",
                    "path": f"{a['cid']}/file_{a['id']}{ext}",
                    "bucket": bucket, "key": a["key"],
                    "fname": a["filename"][:200],
                }
            )

    new_items = [w for w in worklist if (w["cid"], w["sid"]) not in existing]
    print(
        f"작업 목록: 문서 {len(docs)} + 첨부 {len(worklist)-len(docs)} = {len(worklist)}건 "
        f"(신규 {len(new_items)}, 기존 {len(worklist)-len(new_items)} 건너뜀)"
    )
    if not new_items:
        print("신규 자료 없음 — 종료.")
        await home.close()
        await port.close()
        return

    # ── 신규만 AI 단계 추론 (기존은 이미 분류됨) ──
    print("AI 단계 추론 중…")
    steps = ai_classify([{"sid": w["sid"], "desc": w["desc"]} for w in new_items])

    # 신규 업로드 (동시) → 성공분 insert
    sem = asyncio.Semaphore(UPLOAD_CONCURRENCY)
    uploaded_rows = []

    async def do_upload(w):
        async with sem:
            if w["kind"] == "doc":
                body = w["body"]
            else:
                body = await asyncio.to_thread(download_home, w["bucket"], w["key"])
                if body is None:
                    return
            ok = await asyncio.to_thread(upload_object, w["path"], body, w["mime"])
            if ok:
                uploaded_rows.append((w, len(body)))

    # 진행 표시
    done = 0
    for i in range(0, len(new_items), 50):
        chunk = new_items[i : i + 50]
        await asyncio.gather(*(do_upload(w) for w in chunk))
        done += len(chunk)
        print(f"    업로드 {min(done,len(new_items))}/{len(new_items)}", end="\r")
    print()

    for w, size in uploaded_rows:
        await port.execute(
            """insert into client_materials
               (client_id, step, category, title, storage_path, file_name,
                mime_type, size_bytes, note, source_id)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
               on conflict (client_id, source_id) where source_id is not null
               do update set step=excluded.step, category=excluded.category""",
            w["cid"], steps.get(w["sid"]), w["category"], w["title"][:300],
            w["path"], w["fname"], w["mime"], size, "홈어드민 싱크", w["sid"],
        )

    total = await port.fetchval("select count(*) from client_materials")
    mapped = await port.fetchval("select count(*) from client_materials where step is not null")
    print(f"\n완료: 총 {total}건 · 단계 매핑 {mapped}건 · 신규 업로드 {len(uploaded_rows)}건")
    await home.close()
    await port.close()


if __name__ == "__main__":
    asyncio.run(main())
