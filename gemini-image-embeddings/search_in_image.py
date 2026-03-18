"""
Visual Phrase Search — Find where in an image your phrase best matches.

How it works:
  1. Split the image into a GRID x GRID of patches (default 10x10 = 100)
  2. Embed every patch with Gemini Embedding 2
  3. Embed your search phrase
  4. Compute cosine similarity for each patch
  5. Overlay a heatmap + bounding box on the original image and save it

Usage:
    python3 search_in_image.py photo.jpg "cinnamon"
    python3 search_in_image.py photo.jpg "cinnamon" --grid 8
"""

import argparse
import base64
import math
import os
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL = "gemini-embedding-2-preview"


# ── Embedding ─────────────────────────────────────────────────────────────────

def _to_b64(image: Image.Image) -> str:
    buf = BytesIO()
    image.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def embed_image_patch(client: genai.Client, patch: Image.Image) -> list[float]:
    resp = client.models.embed_content(
        model=MODEL,
        contents=types.Content(parts=[
            types.Part(inline_data=types.Blob(mime_type="image/jpeg", data=_to_b64(patch)))
        ]),
        config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY"),
    )
    return resp.embeddings[0].values


def embed_text(client: genai.Client, text: str) -> list[float]:
    resp = client.models.embed_content(
        model=MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY"),
    )
    return resp.embeddings[0].values


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(x * x for x in b))
    return dot / mag if mag else 0.0


# ── Grid ──────────────────────────────────────────────────────────────────────

def make_patches(image: Image.Image, grid: int) -> tuple[list[tuple], int, int]:
    """
    Returns list of (row, col, box, patch_image) and patch width/height.
    Crops cleanly — rightmost/bottommost pixels may be trimmed by <1 cell.
    """
    w, h = image.size
    pw, ph = w // grid, h // grid
    patches = []
    for r in range(grid):
        for c in range(grid):
            box = (c * pw, r * ph, (c + 1) * pw, (r + 1) * ph)
            patches.append((r, c, box, image.crop(box)))
    return patches, pw, ph


# ── Heatmap rendering ─────────────────────────────────────────────────────────

def score_to_color(normalized: float) -> tuple[int, int, int]:
    """Map 0→blue, 0.5→yellow, 1→red (jet-like colormap)."""
    t = normalized
    if t < 0.25:
        r, g, b = 0, int(t * 4 * 255), 255
    elif t < 0.5:
        r, g, b = 0, 255, int((1 - (t - 0.25) * 4) * 255)
    elif t < 0.75:
        r, g, b = int((t - 0.5) * 4 * 255), 255, 0
    else:
        r, g, b = 255, int((1 - (t - 0.75) * 4) * 255), 0
    return (r, g, b)


def draw_heatmap(
    image: Image.Image,
    scores: list[list[float]],   # scores[row][col]
    grid: int,
    pw: int,
    ph: int,
    top_n: int = 3,
    phrase: str = "",
) -> Image.Image:
    flat = [scores[r][c] for r in range(grid) for c in range(grid)]
    lo, hi = min(flat), max(flat)

    result = image.convert("RGBA")
    overlay = Image.new("RGBA", result.size, (0, 0, 0, 0))
    draw_o = ImageDraw.Draw(overlay)

    # Draw heatmap cells
    for r in range(grid):
        for c in range(grid):
            norm = (scores[r][c] - lo) / (hi - lo + 1e-9)
            color = score_to_color(norm)
            alpha = int(40 + norm * 160)   # 40 (transparent) → 200 (opaque)
            box = (c * pw, r * ph, (c + 1) * pw, (r + 1) * ph)
            draw_o.rectangle(box, fill=(*color, alpha))

    result = Image.alpha_composite(result, overlay)
    draw = ImageDraw.Draw(result)

    # Rank all cells by score
    ranked = sorted(
        [(scores[r][c], r, c) for r in range(grid) for c in range(grid)],
        reverse=True,
    )

    # Draw top-N bounding boxes
    box_styles = [
        ((255, 50,  50),  4, "BEST"),       # red   — 1st
        ((255, 165,  0),  3, "2nd"),        # orange
        ((255, 255,  0),  2, "3rd"),        # yellow
    ]
    for rank, (score, r, c) in enumerate(ranked[:top_n]):
        color, width, tag = box_styles[rank]
        x0, y0 = c * pw, r * ph
        x1, y1 = x0 + pw, y0 + ph
        draw.rectangle([x0, y0, x1, y1], outline=(*color, 255), width=width)

        # Label
        label = f"{tag} {score:.3f}"
        tx, ty = x0 + 4, y0 + 4
        draw.rectangle([tx - 1, ty - 1, tx + len(label) * 7, ty + 13], fill=(0, 0, 0, 180))
        draw.text((tx, ty), label, fill=color)

    # Title banner
    banner_h = 36
    banner = Image.new("RGBA", (result.width, banner_h), (0, 0, 0, 200))
    result.paste(banner, (0, 0), banner)
    draw2 = ImageDraw.Draw(result)
    draw2.text((10, 10), f'Search: "{phrase}"   |   grid {grid}×{grid}', fill=(255, 255, 255))

    return result.convert("RGB")


# ── Main pipeline ─────────────────────────────────────────────────────────────

def search(image_path: str, phrase: str, grid: int = 10, top_n: int = 3) -> Path:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("Set GOOGLE_API_KEY in environment or .env file.")

    client = genai.Client(api_key=api_key)

    print(f"\nLoading image: {image_path}")
    image = Image.open(image_path).convert("RGB")
    print(f"  Size: {image.width}×{image.height}  →  {grid}×{grid} = {grid*grid} patches")

    patches, pw, ph = make_patches(image, grid)

    # Embed all patches
    print(f"\nEmbedding {len(patches)} patches", end="", flush=True)
    patch_embeddings: list[list[float]] = []
    for i, (r, c, box, patch) in enumerate(patches):
        emb = embed_image_patch(client, patch)
        patch_embeddings.append(emb)
        if (i + 1) % 10 == 0:
            print(f" {i+1}", end="", flush=True)
    print(" done")

    # Embed query
    print(f'\nEmbedding phrase: "{phrase}" ...', end=" ", flush=True)
    text_emb = embed_text(client, phrase)
    print("done")

    # Compute similarity scores
    scores_flat = [cosine(emb, text_emb) for emb in patch_embeddings]
    scores_grid = [
        [scores_flat[r * grid + c] for c in range(grid)]
        for r in range(grid)
    ]

    # Print top matches
    ranked = sorted(
        [(scores_flat[r * grid + c], r, c) for r in range(grid) for c in range(grid)],
        reverse=True,
    )
    print(f"\nTop {top_n} patches:")
    for score, r, c in ranked[:top_n]:
        print(f"  row={r+1:2d} col={c+1:2d}  score={score:.4f}")

    # Render result image
    result_img = draw_heatmap(image, scores_grid, grid, pw, ph, top_n=top_n, phrase=phrase)

    # Save
    src = Path(image_path)
    safe_phrase = phrase.replace(" ", "_")[:30]
    out_path = src.parent / f"{src.stem}_search_{safe_phrase}{src.suffix}"
    result_img.save(out_path)
    print(f"\nSaved result → {out_path}")
    return out_path


# ── Interactive mode ──────────────────────────────────────────────────────────

def interactive() -> None:
    print("=" * 60)
    print("  Visual Phrase Search  (Gemini Embedding 2)")
    print("=" * 60)

    # Pick image
    image_path = input("\n  Image path: ").strip()
    if not Path(image_path).exists():
        sys.exit(f"File not found: {image_path}")

    grid_raw = input("  Grid size (default 10 → 10×10=100 patches): ").strip()
    grid = int(grid_raw) if grid_raw.isdigit() else 10

    while True:
        try:
            phrase = input("\n  Search phrase (or 'quit'): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n  Bye!")
            break
        if not phrase or phrase.lower() == "quit":
            print("  Bye!")
            break
        search(image_path, phrase, grid=grid)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Find where in an image a text phrase best matches using Gemini Embedding 2"
    )
    parser.add_argument("image", nargs="?", help="Path to the image file")
    parser.add_argument("phrase", nargs="?", help="Text phrase to search for")
    parser.add_argument("--grid", type=int, default=10, help="Grid size (default 10 → 10×10 patches)")
    parser.add_argument("--top", type=int, default=3, help="Number of top matches to highlight (default 3)")
    args = parser.parse_args()

    if args.image and args.phrase:
        search(args.image, args.phrase, grid=args.grid, top_n=args.top)
    else:
        interactive()


if __name__ == "__main__":
    main()
