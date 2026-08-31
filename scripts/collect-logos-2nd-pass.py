import json, re, subprocess, os
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse, urljoin, parse_qs

OUT = "/Users/yonggill/source/org/innovation-portfolio/public/logos"
MANIFEST = "/Users/yonggill/source/org/innovation-portfolio/src/lib/logos.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"

def curl(url, out=None, timeout=10):
    cmd = ["curl", "-skL", "--max-time", str(timeout), "-A", UA, url]
    if out:
        cmd += ["-o", out, "-w", "%{http_code}|%{content_type}"]
        r = subprocess.run(cmd, capture_output=True, text=True)
        return r.stdout.strip()
    r = subprocess.run(cmd, capture_output=True)
    return r.stdout

def img_width(path):
    r = subprocess.run(["sips", "-g", "pixelWidth", path], capture_output=True, text=True)
    m = re.search(r"pixelWidth: (\d+)", r.stdout)
    return int(m.group(1)) if m else 0

def save_image(url, cid, min_width=48):
    tmp = f"/tmp/logo2_{cid}"
    meta = curl(url, out=tmp, timeout=10)
    if not meta or "|" not in meta: return None
    code, ct = meta.split("|", 1)
    if code != "200" or not os.path.exists(tmp) or os.path.getsize(tmp) < 400: return None
    ext = None
    if "svg" in ct: ext = "svg"
    elif "png" in ct: ext = "png"
    elif "webp" in ct: ext = "webp"
    elif "jpeg" in ct or "jpg" in ct: ext = "jpg"
    else:
        head = open(tmp, "rb").read(64)
        if head.startswith(b"\x89PNG"): ext = "png"
        elif head.startswith(b"\xff\xd8"): ext = "jpg"
        elif b"<svg" in head.lower(): ext = "svg"
    if not ext: return None
    dest = f"{OUT}/{cid}.{ext}"
    os.rename(tmp, dest)
    if ext != "svg":
        w = img_width(dest)
        if w < min_width:
            os.remove(dest); return None
        if w > 512: subprocess.run(["sips", "-Z", "512", dest], capture_output=True)
    return f"{cid}.{ext}"

def second_pass(c):
    cid, name, url = c["id"], c["name"], c.get("logoUrl") or ""
    if "google.com" not in url: return None
    domain = (parse_qs(urlparse(url).query).get("domain") or [""])[0]
    if not domain: return None
    html = curl(f"https://{domain}", timeout=10) or curl(f"http://{domain}", timeout=10)
    text = html.decode("utf-8", "ignore") if html else ""
    # apple-touch-icon / 큰 아이콘 링크
    for pat in [r'<link[^>]+apple-touch-icon[^>]+href=["\']([^"\']+)',
                r'<link[^>]+href=["\']([^"\']+)["\'][^>]*apple-touch-icon',
                r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
                r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image']:
        m = re.search(pat, text, re.I)
        if m:
            saved = save_image(urljoin(f"https://{domain}/", m.group(1)), cid, min_width=64)
            if saved: return {"id": cid, "name": name, "file": saved, "source": "touch-icon/og"}
    # 파비콘 128 수용 (마지막 수단, 최소 96px)
    saved = save_image(f"https://www.google.com/s2/favicons?sz=128&domain={domain}", cid, min_width=96)
    if saved: return {"id": cid, "name": name, "file": saved, "source": "favicon128"}
    return None

data = json.load(open("/tmp/companies.json"))["data"]
manifest = json.load(open(MANIFEST))
have = {m["id"] for m in manifest}
targets = [c for c in data if c.get("logoUrl") and c["id"] not in have]
with ThreadPoolExecutor(max_workers=10) as ex:
    results = [r for r in ex.map(second_pass, targets) if r]
manifest.extend(results)
json.dump(manifest, open(MANIFEST, "w"), ensure_ascii=False, indent=2)
print("2차 추가:", len(results), "/", len(targets))
print("총:", len(manifest))
for r in results: print("+", r["name"], r["source"])
