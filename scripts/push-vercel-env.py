#!/usr/bin/env python3
"""
innovation-portfolio Vercel 프로젝트에 런타임 환경변수를 업서트한다.
사용:  VERCEL_TOKEN=xxx python3 scripts/push-vercel-env.py [project_name]
비밀값은 .env.local에서 읽는다 (레포에 하드코딩하지 않음).
"""
import json
import os
import sys
import urllib.request
import urllib.parse

TOKEN = os.environ.get("VERCEL_TOKEN")
PROJECT_NAME = sys.argv[1] if len(sys.argv) > 1 else "innovation-portfolio"
API = "https://api.vercel.com"

# 배포에 필요한 변수 (코드가 런타임에 읽는 것)
KEYS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "INTERNAL_ADMIN_PASSWORD",
    "SESSION_SECRET",
]


def load_env_local():
    env = {}
    path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    for line in open(path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api(method, path, body=None, team=None):
    url = f"{API}{path}"
    if team:
        sep = "&" if "?" in url else "?"
        url += f"{sep}teamId={team}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"__error__": e.code, "body": e.read().decode()[:300]}


def find_project():
    # 개인 계정 + 모든 팀에서 프로젝트 검색
    scopes = [None]
    teams = api("GET", "/v2/teams")
    for t in teams.get("teams", []):
        scopes.append(t["id"])
    for team in scopes:
        res = api("GET", f"/v9/projects?search={urllib.parse.quote(PROJECT_NAME)}", team=team)
        for p in res.get("projects", []):
            if p["name"] == PROJECT_NAME:
                return p["id"], team
    return None, None


def main():
    if not TOKEN:
        sys.exit("VERCEL_TOKEN 환경변수가 필요합니다.")
    env = load_env_local()
    missing = [k for k in KEYS if not env.get(k)]
    if missing:
        sys.exit(f".env.local에 값 없음: {missing}")

    pid, team = find_project()
    if not pid:
        sys.exit(f"'{PROJECT_NAME}' Vercel 프로젝트를 찾지 못했습니다. 프로젝트명을 인자로 넘겨주세요.")
    print(f"프로젝트: {PROJECT_NAME} ({pid}) team={team}")

    for k in KEYS:
        body = {
            "key": k,
            "value": env[k],
            "type": "encrypted",
            "target": ["production", "preview", "development"],
        }
        # upsert=true 로 기존 값 있으면 갱신
        res = api("POST", f"/v10/projects/{pid}/env?upsert=true", body=body, team=team)
        if res.get("__error__"):
            print(f"  ✗ {k}: {res['__error__']} {res.get('body','')}")
        else:
            print(f"  ✓ {k} 설정됨")
    print("완료 — Vercel에서 재배포하면 적용됩니다.")


if __name__ == "__main__":
    main()
