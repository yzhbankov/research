"""
Gemini Embedding 2 — Image → Embedding → ChromaDB

Uses gemini-embedding-exp-03-07 (Gemini Embedding 2) multimodal model to:
1. Load an image (local file or URL)
2. Generate an embedding via Gemini API
3. Store the embedding in ChromaDB
4. Query by image similarity
"""

import os
import base64
import uuid
from pathlib import Path
from io import BytesIO

import requests
from PIL import Image
from dotenv import load_dotenv
import chromadb
from google import genai
from google.genai import types

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

GEMINI_MODEL = "gemini-embedding-2-preview"   # Gemini Embedding 2
CHROMA_COLLECTION = "image_embeddings"
CHROMA_PATH = "./chroma_db"


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_image_as_pil(source: str) -> Image.Image:
    """Load an image from a local path or HTTP URL."""
    if source.startswith("http://") or source.startswith("https://"):
        response = requests.get(source, timeout=15)
        response.raise_for_status()
        return Image.open(BytesIO(response.content)).convert("RGB")
    return Image.open(source).convert("RGB")


def pil_to_base64(image: Image.Image, fmt: str = "JPEG") -> str:
    """Encode a PIL image as a base64 string."""
    buffer = BytesIO()
    image.save(buffer, format=fmt)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


# ── Embedding ─────────────────────────────────────────────────────────────────

def embed_image(client: genai.Client, image: Image.Image) -> list[float]:
    """
    Generate a multimodal embedding for an image using Gemini Embedding 2.

    The model accepts inline image data via a Part object alongside an optional
    text prefix. Task type SEMANTIC_SIMILARITY works well for image retrieval.
    """
    b64 = pil_to_base64(image)

    response = client.models.embed_content(
        model=GEMINI_MODEL,
        contents=types.Content(
            parts=[
                types.Part(
                    inline_data=types.Blob(
                        mime_type="image/jpeg",
                        data=b64,
                    )
                )
            ]
        ),
        config=types.EmbedContentConfig(
            task_type="SEMANTIC_SIMILARITY",
        ),
    )

    return response.embeddings[0].values


# ── Vector DB ─────────────────────────────────────────────────────────────────

def get_collection(path: str = CHROMA_PATH) -> chromadb.Collection:
    """Return (or create) a persistent ChromaDB collection."""
    client = chromadb.PersistentClient(path=path)
    # ChromaDB validates embedding dimensions on first upsert, so we skip the
    # dimension hint here — it will be inferred from the first stored vector.
    return client.get_or_create_collection(
        name=CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )


def store_embedding(
    collection: chromadb.Collection,
    embedding: list[float],
    image_source: str,
    extra_metadata: dict | None = None,
) -> str:
    """Upsert an embedding into ChromaDB and return its ID."""
    doc_id = str(uuid.uuid4())
    metadata = {"source": image_source, **(extra_metadata or {})}

    collection.upsert(
        ids=[doc_id],
        embeddings=[embedding],
        metadatas=[metadata],
        documents=[image_source],   # store source path/URL as the document
    )
    print(f"  Stored  id={doc_id}  source={image_source}")
    return doc_id


def query_similar(
    collection: chromadb.Collection,
    query_embedding: list[float],
    n_results: int = 3,
) -> list[dict]:
    """Return the n most similar stored images."""
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, collection.count()),
        include=["metadatas", "distances", "documents"],
    )
    hits = []
    for i, doc_id in enumerate(results["ids"][0]):
        hits.append(
            {
                "id": doc_id,
                "source": results["documents"][0][i],
                "distance": results["distances"][0][i],
                "metadata": results["metadatas"][0][i],
            }
        )
    return hits


# ── Pipeline ──────────────────────────────────────────────────────────────────

def ingest_image(
    client: genai.Client,
    collection: chromadb.Collection,
    source: str,
    extra_metadata: dict | None = None,
) -> str:
    """Full pipeline: load → embed → store. Returns the stored document ID."""
    print(f"\n[ingest] {source}")
    image = load_image_as_pil(source)
    embedding = embed_image(client, image)
    print(f"  Embedding dim={len(embedding)}")
    return store_embedding(collection, embedding, source, extra_metadata)


def search_by_image(
    client: genai.Client,
    collection: chromadb.Collection,
    query_source: str,
    n_results: int = 3,
) -> list[dict]:
    """Embed a query image and return the most similar stored images."""
    print(f"\n[search] query={query_source}")
    image = load_image_as_pil(query_source)
    embedding = embed_image(client, image)
    hits = query_similar(collection, embedding, n_results)
    print(f"  Top {len(hits)} results:")
    for h in hits:
        print(f"    distance={h['distance']:.4f}  source={h['source']}")
    return hits


# ── Demo ──────────────────────────────────────────────────────────────────────

def demo_with_synthetic_images(
    client: genai.Client,
    collection: chromadb.Collection,
) -> None:
    """
    Demo using solid-colour PNG images generated in-memory so the example runs
    without any external image files or network requests beyond the Gemini API.
    """
    import tempfile

    colours = {
        "red_square":    (220,  50,  50),
        "green_square":  ( 50, 180,  50),
        "blue_square":   ( 50,  50, 220),
        "red_circle":    (200,  30,  30),   # similar to red_square
    }

    tmp_dir = tempfile.mkdtemp()
    paths = {}
    for name, colour in colours.items():
        img = Image.new("RGB", (128, 128), colour)
        path = os.path.join(tmp_dir, f"{name}.jpg")
        img.save(path)
        paths[name] = path

    # Ingest all images
    for name, path in paths.items():
        ingest_image(client, collection, path, extra_metadata={"label": name})

    # Query with the red_circle — expect red_square to rank highest
    print("\n── Similarity search: red_circle ──")
    hits = search_by_image(client, collection, paths["red_circle"], n_results=3)
    return hits


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise EnvironmentError("Set GOOGLE_API_KEY in your environment or .env file.")

    client = genai.Client(api_key=api_key)
    collection = get_collection()

    print(f"ChromaDB collection '{CHROMA_COLLECTION}' — {collection.count()} docs stored")

    # ── Option A: ingest your own image ──────────────────────────────────────
    # ingest_image(client, collection, "/path/to/your/image.jpg")
    # ingest_image(client, collection, "https://example.com/photo.jpg")

    # ── Option B: run the built-in demo ──────────────────────────────────────
    demo_with_synthetic_images(client, collection)

    print("\nDone. Embeddings persisted in", CHROMA_PATH)


if __name__ == "__main__":
    main()
