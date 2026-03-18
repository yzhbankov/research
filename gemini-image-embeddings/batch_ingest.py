"""
Batch ingest a folder of images into ChromaDB using Gemini Embedding 2.

Usage:
    python batch_ingest.py ./images          # ingest all images in ./images
    python batch_ingest.py ./images --query ./query.jpg --top-k 5
"""

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai

from main import get_collection, ingest_image, search_by_image

load_dotenv()

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def batch_ingest(client, collection, folder: str) -> None:
    folder_path = Path(folder)
    images = [
        p for p in folder_path.rglob("*")
        if p.suffix.lower() in IMAGE_EXTENSIONS
    ]
    if not images:
        print(f"No images found in {folder}")
        return

    print(f"Found {len(images)} images — ingesting…")
    for img_path in images:
        try:
            ingest_image(
                client,
                collection,
                str(img_path),
                extra_metadata={"filename": img_path.name},
            )
        except Exception as exc:
            print(f"  [skip] {img_path.name}: {exc}")

    print(f"\nIngestion complete. Collection size: {collection.count()}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch image ingestion into ChromaDB via Gemini Embedding 2")
    parser.add_argument("folder", help="Folder containing images to ingest")
    parser.add_argument("--query", help="Image to use as similarity query after ingestion")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to return (default: 5)")
    args = parser.parse_args()

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("Set GOOGLE_API_KEY in your environment or .env file.")

    client = genai.Client(api_key=api_key)
    collection = get_collection()

    batch_ingest(client, collection, args.folder)

    if args.query:
        search_by_image(client, collection, args.query, n_results=args.top_k)


if __name__ == "__main__":
    main()
