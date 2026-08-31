import json, re, subprocess, os, sys
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse, urljoin, parse_qs

OUT = "/Users/yonggill/source/org/innovation-portfolio/public/logos"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"

def curl(url, out=None, timeout=10):
    cmd = ["curl", "-sL", "--max-time", str(timeout), "-A", UA, url]
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

def ext_from_ct(ct):
    if "svg" in ct: return "svg"
    if "png" in ct: return "png"
    if "webp" in ct: return "webp"
    if "jpeg" in ct or "jpg" in ct: return "jpg"
    if "gif" in ct: return "gif"
    return None

def save_image(url, cid, min_width=48):
    tmp = f"/tmp/logo_{cid}"
    meta = curl(url, out=tmp, timeout=10)
    if not meta or "|" not in meta: return None
    code, ct = meta.split("|", 1)
    if code != "200" or os.path.getsize(tmp) < 400: return None
    ext = ext_from_ct(ct)
    if not ext:
        head = open(tmp, "rb").read(64)
        if head.startswith(b"\x89PNG"): ext = "png"
        elif head.startswith(b"\xff\xd8"): ext = "jpg"
        elif b"<svg" in head.lower() or b"<?xml" in head.lower(): ext = "svg"
        else: return None
    dest = f"{OUT}/{cid}.{ext}"
    os.rename(tmp, dest)
    if ext != "svg":
        w = img_width(dest)
        if w < min_width:
            os.remove(dest); return None
        if w > 512:
            subprocess.run(["sips", "-Z", "512", dest], capture_output=True)
    return f"{cid}.{ext}"

def find_homepage_logo(domain, cid):
    for scheme in ("https", "http"):
        html = curl(f"{scheme}://{domain}", timeout=10)
        if html and len(html) > 500: break
    else:
        return None
    try: text = html.decode("utf-8", "ignore")
    except AttributeError: text = html
    imgs = re.findall(r"<img[^>]+>", text[:150000], re.I)
    cands = []
    for tag in imgs:
        m = re.search(r'src=["\']([^"\']+)["\']', tag, re.I)
        if not m: continue
        src = m.group(1)
        score = 0
        if re.search(r"logo", src, re.I): score += 3
        if re.search(r'(class|alt|id)=["\'][^"\']*logo', tag, re.I): score += 2
        if re.search(r"(banner|popup|footer)", src, re.I): score -= 2
        if score > 0: cands.append((score, src))
    for _, src in sorted(cands, key=lambda x: -x[0])[:3]:
        full = urljoin(f"https://{domain}/", src)
        saved = save_image(full, cid, min_width=48)
        if saved: return saved
    return None

def process(c):
    cid, name, url = c["id"], c["name"], c.get("logoUrl") or ""
    if "supabase" in url:
        saved = save_image(url, cid, min_width=32)
        return (cid, name, saved, "supabase")
    if "google.com" in url:
        qs = parse_qs(urlparse(url).query)
        domain = (qs.get("domain") or [""])[0]
        if domain:
            saved = find_homepage_logo(domain, cid)
            if saved: return (cid, name, saved, "homepage")
            saved = save_image(f"https://www.google.com/s2/favicons?sz=256&domain={domain}", cid, min_width=64)
            if saved: return (cid, name, saved, "favicon256")
    return (cid, name, None, "none")

data = json.load(open("/tmp/companies.json"))["data"]
targets = [c for c in data if c.get("logoUrl")]
with ThreadPoolExecutor(max_workers=10) as ex:
    results = list(ex.map(process, targets))

manifest = [{"id": r[0], "name": r[1], "file": r[2], "source": r[3]} for r in results if r[2]]
json.dump(manifest, open(f"{OUT}/../..//src/lib/logos.json", "w"), ensure_ascii=False, indent=2)
from collections import Counter
print("결과:", Counter(r[3] for r in results))
print("성공:", len(manifest), "/", len(targets))
