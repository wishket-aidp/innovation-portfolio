#!/usr/bin/env python3
"""
(고객 × 단계) 자료를 AI(Claude)로 읽어 "이 단계에서 무슨 일이 있었는지" 요약을 생성해
stage_summaries 테이블에 저장한다.

- 대상: 자료실에 자료가 있는 (고객, 단계) 조합
- 입력: 해당 단계 자료의 제목 목록 + 마크다운 문서 본문 발췌
- 출력: 3~5문장, 고객 관점의 담백한 서술 (실명·수치 과장 없이)
- idempotent: 이미 요약이 있고 자료 수가 그대로면 건너뜀 (--force 로 재생성)

사용:  python3 scripts/summarize-stages.py [--force]
자격:  포트폴리오 .env.local, AI 키(~/.claude/claude-graph.env 또는 ANTHROPIC_API_KEY)
"""
import asyncio
import json
import os
import re
import sys
import urllib.request

import asyncpg  # type: ignore

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORCE = "--force" in sys.argv
AI_MODEL = "claude-haiku-4-5-20251001"
STORAGE_EXCERPT = 1200  # md 문서 본문 발췌 길이
MAX_DOCS_EXCERPT = 8    # 요약당 본문 발췌할 md 문서 수

STEP_NAMES = {
    1: "첫 대화", 2: "문제 정의", 3: "사전 진단", 4: "현장 진단", 5: "가치 판단",
    6: "구체화 및 제안", 7: "계획", 8: "실무진 onboard", 9: "킥오프",
    10: "시스템 확정", 11: "R&R 확정", 12: "중간 보고", 13: "검증",
    14: "오픈 및 교육", 15: "클로징",
}


def load_env(path):
    e = {}
    if os.path.exists(path):
        for l in open(path):
            l = l.strip()
            if l and not l.startswith("#") and "=" in l:
                k, v = l.split("=", 1)
                e[k.strip()] = v.strip().strip('"').strip("'")
    return e


PORT = load_env(os.path.join(ROOT, ".env.local"))
SUPA_URL = PORT.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE = PORT.get("SUPABASE_SERVICE_ROLE_KEY")
REF = SUPA_URL.split("//")[1].split(".")[0] if SUPA_URL else None
DB = f"postgresql://postgres.{REF}:{PORT.get('SUPABASE_DB_PASSWORD')}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
AI_KEY = os.environ.get("ANTHROPIC_API_KEY") or load_env(
    os.path.expanduser("~/.claude/claude-graph.env")
).get("ANTHROPIC_API_KEY")


def storage_text(path):
    """md 자료 본문 일부를 스토리지에서 읽어온다 (발췌)."""
    url = f"{SUPA_URL}/storage/v1/object/{path}"
    from urllib.parse import quote

    req = urllib.request.Request(
        f"{SUPA_URL}/storage/v1/object/client-materials/{quote(path)}"
    )
    req.add_header("Authorization", f"Bearer {SERVICE}")
    req.add_header("apikey", SERVICE)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()[:STORAGE_EXCERPT * 4].decode("utf-8", "ignore")
    except Exception:
        return ""


def summarize(masked, step, titles, excerpts):
    stage = STEP_NAMES[step]
    body_block = "\n\n".join(f"[{t}]\n{e[:STORAGE_EXCERPT]}" for t, e in excerpts)
    title_block = "\n".join(f"- {t}" for t in titles)
    prompt = (
        f"아래는 한 고객({masked})의 '{stage}' 단계 자료 목록과 일부 본문이다. "
        f"이 자료들을 근거로 이 단계에서 실제로 어떤 과정이 있었는지 3~4문장으로 담백하게 요약하라.\n"
        f"규칙: 고객 관점의 사실 위주. 자료에 없는 내용·수치 창작 금지. 고객사 실명 쓰지 말 것(항상 '{masked}'로). "
        f"광고 문구 대신 무슨 일이 오갔는지 설명.\n\n"
        f"[자료 목록]\n{title_block}\n\n[본문 발췌]\n{body_block or '(텍스트 본문 없음 — 파일 위주)'}\n\n"
        f"요약(3~4문장):"
    )
    data = json.dumps(
        {"model": AI_MODEL, "max_tokens": 500, "messages": [{"role": "user", "content": prompt}]}
    ).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=data, method="POST"
    )
    req.add_header("x-api-key", AI_KEY)
    req.add_header("anthropic-version", "2023-06-01")
    req.add_header("content-type", "application/json")
    with urllib.request.urlopen(req, timeout=60) as r:
        text = json.load(r)["content"][0]["text"].strip()
    # 선두 마크다운 헤더/'요약' 라벨 줄 제거
    lines = text.split("\n")
    while lines and (
        lines[0].strip().startswith("#")
        or re.match(r"^\s*(요약|\*\*.*요약.*\*\*)\s*:?\s*$", lines[0])
    ):
        lines.pop(0)
    return "\n".join(lines).strip()


async def main():
    if not AI_KEY:
        sys.exit("ANTHROPIC_API_KEY 없음")
    # 사례 고객(마스킹) 매핑 로드
    cc = open(os.path.join(ROOT, "src/lib/case-clients.ts")).read()
    id2mask = {
        cid: mask
        for mask, cid in re.findall(r'"([^"]+)": "([^"]+)"', cc)
    }
    conn = await asyncpg.connect(DB, ssl="require", timeout=30)

    # (고객,단계)별 자료 집계 — 사례 매핑된 고객만
    combos = await conn.fetch(
        """select client_id, step, count(*) n
           from client_materials
           where step is not null and client_id = any($1::text[])
           group by client_id, step order by client_id, step""",
        list(id2mask.keys()),
    )
    existing = {
        (r["client_id"], r["step"]): r["source_count"]
        for r in await conn.fetch("select client_id, step, source_count from stage_summaries")
    }

    todo = [
        c for c in combos
        if FORCE or existing.get((c["client_id"], c["step"])) != c["n"]
    ]
    print(f"대상 (고객×단계): {len(combos)} · 생성/갱신 필요: {len(todo)}")

    done = 0
    for c in todo:
        cid, step, n = c["client_id"], c["step"], c["n"]
        masked = id2mask.get(cid, "고객")
        rows = await conn.fetch(
            """select title, storage_path, mime_type from client_materials
               where client_id=$1 and step=$2 order by category limit 40""",
            cid, step,
        )
        titles = [r["title"] for r in rows]
        md = [r for r in rows if r["mime_type"] == "text/markdown"][:MAX_DOCS_EXCERPT]
        excerpts = []
        for r in md:
            txt = await asyncio.to_thread(storage_text, r["storage_path"])
            if txt:
                excerpts.append((r["title"], txt))
        try:
            summary = await asyncio.to_thread(
                summarize, masked, step, titles, excerpts
            )
        except Exception as e:
            print(f"  ✗ {masked} step{step}: {str(e)[:60]}")
            continue
        await conn.execute(
            """insert into stage_summaries (client_id, step, summary, source_count, updated_at)
               values ($1,$2,$3,$4, now())
               on conflict (client_id, step)
               do update set summary=excluded.summary, source_count=excluded.source_count, updated_at=now()""",
            cid, step, summary, n,
        )
        done += 1
        print(f"  ✓ {masked} {STEP_NAMES[step]} (자료 {n})", end="\r")

    print(f"\n완료: {done}건 요약 생성/갱신")
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
