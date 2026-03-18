"""
Interactive Image ↔ Text Semantic Similarity using Gemini Embedding 2

Drop an image into ./watch_folder/, run this script, type a phrase — get a
cosine similarity score showing how semantically related the image and text are.

Score guide (cross-modal image ↔ text range is ~0.15 – 0.55):
  0.50+        Very high match
  0.42 – 0.50  Strong match
  0.33 – 0.42  Moderate match
  0.22 – 0.33  Weak match
  < 0.22       Little / no match
"""

import os
import base64
import math
from io import BytesIO
from pathlib import Path

from PIL import Image
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL = "gemini-embedding-2-preview"
WATCH_FOLDER = Path("./watch_folder")
WATCH_FOLDER.mkdir(exist_ok=True)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


# ── Embedding helpers ─────────────────────────────────────────────────────────

def _pil_to_b64(image: Image.Image) -> str:
    buf = BytesIO()
    image.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


def embed_image(client: genai.Client, path: Path) -> list[float]:
    image = Image.open(path).convert("RGB")
    b64 = _pil_to_b64(image)
    resp = client.models.embed_content(
        model=MODEL,
        contents=types.Content(parts=[
            types.Part(inline_data=types.Blob(mime_type="image/jpeg", data=b64))
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


# ── Cosine similarity ─────────────────────────────────────────────────────────

def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def score_label(score: float) -> str:
    # Cross-modal (image ↔ text) cosine similarity with Gemini Embedding 2
    # operates in a compressed range (~0.15–0.55). Thresholds are calibrated
    # accordingly — do not compare these values to text↔text similarity scores.
    if score >= 0.50:
        return "Very high match"
    if score >= 0.42:
        return "Strong match"
    if score >= 0.33:
        return "Moderate match"
    if score >= 0.22:
        return "Weak match"
    return "Little / no match"


def similarity_bar(score: float, width: int = 40) -> str:
    # Scale bar to the realistic cross-modal range [0.10, 0.60]
    LOW, HIGH = 0.10, 0.60
    normalized = max(0.0, min(1.0, (score - LOW) / (HIGH - LOW)))
    filled = round(normalized * width)
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {score:.4f}"


# ── Image picker ──────────────────────────────────────────────────────────────

def list_images() -> list[Path]:
    return sorted(
        p for p in WATCH_FOLDER.iterdir()
        if p.suffix.lower() in IMAGE_EXTENSIONS
    )


def pick_image() -> Path | None:
    images = list_images()
    if not images:
        print(f"\n  No images found in {WATCH_FOLDER.resolve()}")
        print("  Drop an image file there and press Enter to retry.\n")
        return None

    print("\n  Images in watch folder:")
    for i, p in enumerate(images, 1):
        print(f"    [{i}] {p.name}")

    if len(images) == 1:
        print(f"  Auto-selecting: {images[0].name}")
        return images[0]

    raw = input("\n  Pick image number (or path): ").strip()
    if raw.isdigit():
        idx = int(raw) - 1
        if 0 <= idx < len(images):
            return images[idx]
        print("  Invalid number.")
        return None
    p = Path(raw)
    if p.exists():
        return p
    print("  File not found.")
    return None


# ── Main loop ─────────────────────────────────────────────────────────────────

def main() -> None:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise EnvironmentError("Set GOOGLE_API_KEY in .env or environment.")

    client = genai.Client(api_key=api_key)

    print("=" * 60)
    print("  Gemini Embedding 2 — Image ↔ Text Semantic Similarity")
    print("=" * 60)
    print(f"  Watch folder: {WATCH_FOLDER.resolve()}")
    print("  Type 'quit' to exit, 'image' to change the selected image.\n")

    current_image: Path | None = None
    current_embedding: list[float] | None = None

    while True:
        # ── Select image ──────────────────────────────────────────────────────
        if current_image is None:
            current_image = pick_image()
            if current_image is None:
                input("  Press Enter to retry...")
                continue

            print(f"\n  Embedding image: {current_image.name} ...", end=" ", flush=True)
            try:
                current_embedding = embed_image(client, current_image)
                print(f"done  (dim={len(current_embedding)})")
            except Exception as e:
                print(f"failed: {e}")
                current_image = None
                continue

        # ── Get phrase ────────────────────────────────────────────────────────
        try:
            phrase = input(f"\n  [{current_image.name}] Enter phrase: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n  Bye!")
            break

        if not phrase:
            continue
        if phrase.lower() == "quit":
            print("  Bye!")
            break
        if phrase.lower() == "image":
            current_image = None
            current_embedding = None
            continue

        # ── Embed text & compare ──────────────────────────────────────────────
        print("  Embedding text ...", end=" ", flush=True)
        try:
            text_embedding = embed_text(client, phrase)
            print("done")
        except Exception as e:
            print(f"failed: {e}")
            continue

        score = cosine_similarity(current_embedding, text_embedding)
        label = score_label(score)
        bar   = similarity_bar(score)

        print()
        print(f"  Image : {current_image.name}")
        print(f"  Text  : \"{phrase}\"")
        print(f"  Score : {bar}")
        print(f"  Match : {label}")
        print()


if __name__ == "__main__":
    main()
