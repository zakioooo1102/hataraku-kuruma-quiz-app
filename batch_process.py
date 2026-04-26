#!/usr/bin/env python3
import csv, requests, io, os, time, base64
from PIL import Image

MAX_W, MAX_H, QUALITY = 600, 450, 78
HEADERS = {"User-Agent": "Mozilla/5.0"}

def fetch_image(url):
    if url.startswith("data:image"):
        b64 = url.split(",", 1)[1]
        return Image.open(io.BytesIO(base64.b64decode(b64)))
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    return Image.open(io.BytesIO(r.content))

def process(url, filename):
    img = fetch_image(url).convert("RGB")
    img.thumbnail((MAX_W, MAX_H), Image.LANCZOS)
    out = f"images/{filename}"
    img.save(out, "JPEG", quality=QUALITY, optimize=True)
    kb = os.path.getsize(out) // 1024
    return img.width, img.height, kb

with open("image_list.csv", newline="", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

failed = []
for row in rows:
    no, name = row["no"], row["名前"]
    filename, url, status = row["ファイル名"], row["URL"].strip(), row["状態"].strip()

    if status == "済み":
        continue
    if not url:
        print(f"[skip] {no}. {name} (URLなし)")
        continue
    if os.path.exists(f"images/{filename}"):
        print(f"[skip] {no}. {name} (画像あり)")
        continue

    print(f"[処理] {no}. {name} ...", end=" ", flush=True)
    try:
        w, h, kb = process(url, filename)
        print(f"✓ {w}x{h}, {kb}KB")
    except Exception as e:
        print(f"✗ {e}")
        failed.append(f"{no}. {name}")
    time.sleep(0.3)

print("\n--- 完了 ---")
if failed:
    print(f"失敗 {len(failed)}件:")
    for f in failed:
        print(f"  {f}")
else:
    print("全件成功！")
