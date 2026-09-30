#!/usr/bin/env python3
"""
Otimiza as imagens do site.

- Gera a versão .webp de cada .jpg/.jpeg/.png em assets/ e assets/portfolio/
- Redimensiona para uma largura máxima (fotos: 1400px, portfólio: 1400px)
- Se o JPG original for muito grande (> 1600px ou > 600 KB), cria uma versão
  otimizada no lugar e guarda o original em _originais/ (fora do site)

Uso (precisa do Python 3 e da biblioteca Pillow):
    pip install Pillow
    python3 tools/otimizar-imagens.py

Rode de novo sempre que trocar alguma foto ou imagem do portfólio.
"""
from pathlib import Path
import shutil
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Instale o Pillow primeiro:  pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
BACKUP = ROOT / "_originais"
MAX_W = 1400
JPG_MAX_BYTES = 600 * 1024
SKIP = {"noise.png", "favicon-32.png", "apple-touch-icon.png"}


def process(path: Path) -> None:
    img = ImageOps.exif_transpose(Image.open(path))
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    if img.width > MAX_W:
        img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)

    webp = path.with_suffix(".webp")
    img.save(webp, "WEBP", quality=80, method=6)

    if path.suffix.lower() in (".jpg", ".jpeg"):
        original_w = Image.open(path).width
        if original_w > 1600 or path.stat().st_size > JPG_MAX_BYTES:
            BACKUP.mkdir(exist_ok=True)
            shutil.copy2(path, BACKUP / path.name)
            img.convert("RGB").save(path, "JPEG", quality=82, optimize=True, progressive=True)

    print(f"ok  {path.relative_to(ROOT)}  ->  {webp.name} ({webp.stat().st_size // 1024} KB)")


def main() -> None:
    files = [p for folder in (ASSETS, ASSETS / "portfolio") if folder.exists()
             for p in sorted(folder.iterdir())
             if p.suffix.lower() in (".jpg", ".jpeg", ".png") and p.name not in SKIP]
    if not files:
        print("Nenhuma imagem encontrada em assets/.")
    for f in files:
        process(f)
    for foto in ("foto-apresentacao.jpg", "foto-historia.jpg"):
        if not (ASSETS / foto).exists():
            print(f"atenção: falta assets/{foto}")


if __name__ == "__main__":
    main()
