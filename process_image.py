#!/usr/bin/env python3
"""
車両画像をダウンロードして圧縮・リサイズするスクリプト。
使い方: python3 process_image.py <画像URL> <出力ファイル名>
例:    python3 process_image.py "https://example.com/car.jpg" patoka.jpg
"""

import requests
import io
import os
from PIL import Image

MAX_W = 600
MAX_H = 450
QUALITY = 78
QUEUE_FILE = "next_image.txt"

HEADERS = {"User-Agent": "Mozilla/5.0"}

def process(url: str, out_name: str):
    out_path = f"images/{out_name}"
    print(f"ダウンロード中...")
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content)).convert("RGB")
    img.thumbnail((MAX_W, MAX_H), Image.LANCZOS)
    img.save(out_path, "JPEG", quality=QUALITY, optimize=True)
    size_kb = os.path.getsize(out_path) // 1024
    print(f"✓ 保存: {out_path} ({img.width}x{img.height}, {size_kb}KB)")

if __name__ == "__main__":
    with open(QUEUE_FILE) as f:
        lines = f.read().strip().splitlines()
    url, out_name = lines[0], lines[1]
    process(url, out_name)
