#!/usr/bin/env python3
"""
홈어드민(company_knowledge_docs)의 고객 자료를 포트폴리오 자료실로 싱크한다.
각 문서(마크다운 본문)를 Supabase Storage(client-materials, 비공개)에 .md로 올리고
client_materials 메타 행을 upsert 한다. source_id(홈어드민 doc id)로 idempotent.

사용:
  HOME_ADMIN_DB_URL=<홈어드민 postgres URL> python3 scripts/sync-materials.py
  (미설정 시 ~/source/aidp/sales/.env.production 에서 자동 로드)

포트폴리오 자격은 .env.local 에서 읽는다.
"""
import asyncio
import json
import os
import re
import sys
import urllib.request
import urllib.error

import asyncpg  # type: ignore

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUCKET = "client-materials"
CONCURRENCY = 8


def load_env_file(path):
    env = {}
    if not os.path.exists(path):
        return env
    for line in open(path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


PORT_ENV = load_env_file(os.path.join(ROOT, ".env.local"))
SUPA_URL = PORT_ENV.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE = PORT_ENV.get("SUPABASE_SERVICE_ROLE_KEY")
PORT_DB_PASS = PORT_ENV.get("SUPABASE_DB_PASSWORD")
PORT_REF = SUPA_URL.split("//")[1].split(".")[0] if SUPA_URL else None
PORT_DB = f"postgresql://postgres.{PORT_REF}:{PORT_DB_PASS}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"


def home_admin_db_url():
    url = os.environ.get("HOME_ADMIN_DB_URL")
    if url:
        return re.sub(r"[?&]sslmode=[^&]*", "", url)
    sales = load_env_file(os.path.expanduser("~/source/aidp/sales/.env.production"))
    url = sales.get("SB_STORAGE_POSTGRES_URL_NON_POOLING") or sales.get(
        "SB_STORAGE_POSTGRES_URL"
    )
    if not url:
        sys.exit("HOME_ADMIN_DB_URL 미설정 & 홈어드민 .env.production 없음")
    return re.sub(r"[?&]sslmode=[^&]*", "", url)


def categorize(title: str) -> str:
    if any(k in title for k in ("녹취", "전사", "STT", "클로바")):
        return "transcript"
    if any(k in title for k in ("제안서", "견적", "SOW", "수행계획")):
        return "proposal"
    if "계약" in title:
        return "contract"
    if any(k in title for k in ("킥오프 자료", "발표", "덱", "deck")):
        return "deck"
    if any(
        k in title
        for k in ("보고서", "중간보고", "최종보고", "진단서", "요약", "회의록", "인터뷰", "분석")
    ):
        return "report"
    return "file"


STEP_KW = [
    (("초기 리드", "리드콜", "첫 통화", "첫 대화"), 1),
    (("문제 정의", "문제정의"), 2),
    (("사전 진단", "PI 준비"), 3),
    (("현장 진단", "PI 진단", "진단서", "인터뷰"), 4),
    (("가치 판단", "Go/No-Go"), 5),
    (("제안", "견적", "SOW"), 6),
    (("계약",), 7),
    (("인계", "onboard", "핸드오프"), 8),
    (("킥오프", "착수"), 9),
    (("Discovery", "요구사항", "시스템 확정", "설계안"), 10),
    (("WBS", "실행계획", "R&R"), 11),
    (("중간보고", "중간 보고"), 12),
    (("UAT", "검증", "검수"), 13),
    (("배포", "오픈", "교육", "운영 인계"), 14),
    (("클로징", "종료", "최종보고", "최종 보고"), 15),
]


def infer_step(title: str):
    for kws, step in STEP_KW:
        if any(k in title for k in kws):
            return step
    return None


def upload_object(path: str, body: bytes, mime: str) -> bool:
    url = f"{SUPA_URL}/storage/v1/object/{BUCKET}/{path}"
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Authorization", f"Bearer {SERVICE}")
    req.add_header("apikey", SERVICE)
    req.add_header("Content-Type", mime)
    req.add_header("x-upsert", "true")
    try:
        urllib.request.urlopen(req)
        return True
    except urllib.error.HTTPError as e:
        print(f"    ✗ upload {path}: {e.code} {e.read().decode()[:120]}")
        return False


async def main():
    if not (SUPA_URL and SERVICE and PORT_DB_PASS):
        sys.exit(".env.local 에 SUPABASE URL/SERVICE_ROLE/DB_PASSWORD 필요")

    home = await asyncpg.connect(home_admin_db_url(), ssl="require", timeout=30)
    await home.execute("SET default_transaction_read_only=on")
    port = await asyncpg.connect(PORT_DB, ssl="require", timeout=30)

    clients = await port.fetch("select id, name from clients order by name")
    total_docs = total_uploaded = total_skipped = 0

    for c in clients:
        cid, name = c["id"], c["name"]
        docs = await home.fetch(
            """select d.id, d.title, d.body, d."createdAt"
               from company_knowledge_docs d
               where d."companyId" = $1 and d."deletedAt" is null
                 and d.body is not null and length(d.body) > 0
               order by d."createdAt" """,
            cid,
        )
        if not docs:
            continue
        sem = asyncio.Semaphore(CONCURRENCY)
        rows = []

        async def handle(doc):
            nonlocal total_uploaded
            async with sem:
                path = f"{cid}/{doc['id']}.md"
                body = doc["body"].encode("utf-8")
                ok = await asyncio.to_thread(upload_object, path, body, "text/markdown")
                if ok:
                    total_uploaded += 1
                    rows.append(
                        (
                            cid,
                            infer_step(doc["title"]),
                            categorize(doc["title"]),
                            doc["title"][:300],
                            path,
                            (doc["title"][:180] + ".md"),
                            "text/markdown",
                            len(body),
                            "홈어드민 싱크",
                            doc["id"],
                        )
                    )

        await asyncio.gather(*(handle(d) for d in docs))
        # 메타 upsert (source_id 충돌 시 무시)
        inserted = 0
        for r in rows:
            res = await port.execute(
                """insert into client_materials
                   (client_id, step, category, title, storage_path, file_name,
                    mime_type, size_bytes, note, source_id)
                   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                   on conflict (client_id, source_id)
                   where source_id is not null do nothing""",
                *r,
            )
            if res.endswith("1"):
                inserted += 1
        total_docs += len(docs)
        total_skipped += len(rows) - inserted
        print(f"  {name[:20]:22} 문서 {len(docs):4} → 신규 {inserted:4} (기존 {len(rows)-inserted})")

    print(
        f"\n완료: 문서 {total_docs} · 업로드 {total_uploaded} · 신규메타 {total_docs - total_skipped} · 중복 {total_skipped}"
    )
    await home.close()
    await port.close()


if __name__ == "__main__":
    asyncio.run(main())
