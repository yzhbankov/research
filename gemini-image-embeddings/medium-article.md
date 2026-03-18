# Forget Object Detection Models — Search Inside Images With Plain English Using Gemini Embedding 2

*How multimodal embeddings let you find anything in any image with zero training, zero labels, and a single API call*

---

What if you could point at a photo of a supermarket shelf and ask "where is the cinnamon?" — and get an answer? No fine-tuned YOLO model. No labeled dataset. No training pipeline at all.

Or what if a factory camera could detect "person lying on the floor" without anyone ever teaching it what that looks like?

That is exactly what **Gemini Embedding 2** makes possible. Google's multimodal embedding model places images and text into the same 3072-dimensional vector space, so you can compute a simple cosine similarity between a photo and any English phrase — and it just works.

In this article I will walk through two practical, production-ready examples:

1. **Visual Phrase Search** — slice an image into a grid, embed every patch, and build a heatmap showing *where* a phrase matches best (think: "find rosemary on this shelf").
2. **Custom Alert System** — compare a live camera frame against user-defined alert phrases like "person lying on floor" or "forklift near pedestrian" to trigger real-time alerts with zero ML training.

Both solutions are under 50 lines of core logic each.

---

## Why Multimodal Embeddings Change Everything

Traditional computer vision follows a rigid pipeline: collect images, label them, train a model, deploy, repeat when requirements change. Need to detect a new object? Back to labeling.

Multimodal embeddings flip this. A single model like `gemini-embedding-2` maps both images and text into a shared vector space. If an image of a cinnamon jar and the word "cinnamon" are semantically related, their vectors are close — measured by cosine similarity.

This means:

- **Zero-shot detection** — describe what you are looking for in plain English
- **No training data needed** — works out of the box on any domain
- **Instantly customizable** — change the search phrase, not the model
- **Cross-modal search** — find images by text, or text by images

The embedding dimension is 3072, and the cross-modal similarity range is compressed (roughly 0.15–0.55), but within that range the signal is remarkably strong.

---

## Setup

You need a Google AI Studio API key (free tier works) and three Python packages:

```bash
pip install google-genai Pillow python-dotenv
```

```bash
export GOOGLE_API_KEY=your_key_here
```

---

## Example 1: Visual Phrase Search — "Find the Cinnamon"

**The idea:** Take a photo (e.g., a supermarket spice shelf), split it into a grid of patches, embed every patch, embed your search phrase, and compute cosine similarity for each cell. The result is a heatmap showing exactly where your phrase matches.

Here is the complete, minimal implementation:

```python
import base64, math, os
from io import BytesIO
from PIL import Image
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
MODEL = "gemini-embedding-2-preview"


def embed_image(img: Image.Image) -> list[float]:
    """Embed a PIL image using Gemini Embedding 2."""
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode()
    resp = client.models.embed_content(
        model=MODEL,
        contents=types.Content(parts=[
            types.Part(inline_data=types.Blob(
                mime_type="image/jpeg", data=b64
            ))
        ]),
        config=types.EmbedContentConfig(
            task_type="SEMANTIC_SIMILARITY"
        ),
    )
    return resp.embeddings[0].values


def embed_text(text: str) -> list[float]:
    """Embed a text phrase using the same model."""
    resp = client.models.embed_content(
        model=MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="SEMANTIC_SIMILARITY"
        ),
    )
    return resp.embeddings[0].values


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    mag = math.sqrt(sum(x*x for x in a)) * math.sqrt(sum(x*x for x in b))
    return dot / mag if mag else 0.0


def search_in_image(image_path: str, phrase: str, grid: int = 10):
    """Find where in an image a phrase matches best."""
    image = Image.open(image_path).convert("RGB")
    w, h = image.size
    pw, ph = w // grid, h // grid

    # 1. Embed every grid patch
    patch_embeddings = []
    for r in range(grid):
        for c in range(grid):
            box = (c * pw, r * ph, (c+1) * pw, (r+1) * ph)
            patch = image.crop(box)
            patch_embeddings.append(embed_image(patch))

    # 2. Embed the search phrase
    text_emb = embed_text(phrase)

    # 3. Score each patch
    scores = [cosine(emb, text_emb) for emb in patch_embeddings]

    # 4. Find top matches
    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    for idx, score in ranked[:3]:
        r, c = divmod(idx, grid)
        print(f"  row={r+1} col={c+1} score={score:.4f}")

    return scores


search_in_image("spice_shelf.jpg", "cinnamon")
```

**That is it.** Under 50 lines of logic. No model training. No labeled bounding boxes.

When I ran this against a photo of a supermarket spice shelf, the system correctly highlighted the cinnamon section with the highest similarity score — and when I changed the phrase to "rosemary" or "ground black pepper," the heatmap shifted to the correct area each time.

### How It Looks

The output is a color-coded heatmap overlay: blue regions have low similarity, yellow is moderate, and red is high. The top 3 matching patches get highlighted bounding boxes — red for the best match, orange for second, yellow for third.

*[See the heatmap output images in the repository: `watch_folder/img_1_search_cinamon.png`, `img_1_search_rosemary.png`, `img_1_search_ground_black_pepper.png`]*

The beauty is that I never told the model what cinnamon looks like. The shared embedding space already "understands" the visual–semantic relationship.

---

## Example 2: Custom Manufacturing Alerts — Zero-Training Anomaly Detection

Now let's flip the use case. Instead of searching *within* an image, we compare an *entire* camera frame against a set of user-defined alert phrases. If the similarity score crosses a threshold, we fire an alert.

Think of it as a completely customizable surveillance system where the operator types what to watch for in plain English:

- "person lying on the floor"
- "forklift moving near pedestrian"
- "spill on the ground"
- "smoke or fire"
- "worker without hard hat"

No retraining. No new dataset. Just a new string.

```python
import base64, math, os, time
from io import BytesIO
from PIL import Image
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
MODEL = "gemini-embedding-2-preview"


def embed_image(img: Image.Image) -> list[float]:
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode()
    resp = client.models.embed_content(
        model=MODEL,
        contents=types.Content(parts=[
            types.Part(inline_data=types.Blob(
                mime_type="image/jpeg", data=b64
            ))
        ]),
        config=types.EmbedContentConfig(
            task_type="SEMANTIC_SIMILARITY"
        ),
    )
    return resp.embeddings[0].values


def embed_text(text: str) -> list[float]:
    resp = client.models.embed_content(
        model=MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="SEMANTIC_SIMILARITY"
        ),
    )
    return resp.embeddings[0].values


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    mag = math.sqrt(sum(x*x for x in a)) * math.sqrt(sum(x*x for x in b))
    return dot / mag if mag else 0.0


# ── User-defined alerts ─────────────────────────────────────
ALERTS = [
    "person lying on the floor",
    "forklift near a pedestrian",
    "liquid spill on the ground",
    "smoke or fire",
]
THRESHOLD = 0.35   # Tune based on your environment

# Pre-embed all alert phrases once at startup
alert_embeddings = {phrase: embed_text(phrase) for phrase in ALERTS}


def check_frame(frame: Image.Image):
    """Compare one camera frame against all alert phrases."""
    frame_emb = embed_image(frame)

    for phrase, phrase_emb in alert_embeddings.items():
        score = cosine(frame_emb, phrase_emb)
        if score >= THRESHOLD:
            print(f"  ALERT  [{score:.3f}] {phrase}")


# ── Simulated camera loop ───────────────────────────────────
def monitor(image_source: str, interval: int = 5):
    """Poll a camera (or image file) and check for alerts."""
    print(f"Monitoring: {image_source}")
    print(f"Watching for: {', '.join(ALERTS)}")
    print(f"Threshold: {THRESHOLD}\n")

    while True:
        frame = Image.open(image_source).convert("RGB")
        check_frame(frame)
        time.sleep(interval)


monitor("camera_feed.jpg")
```

### Why This Is Powerful

In traditional manufacturing vision systems, adding a new alert type means:

1. Collecting hundreds of labeled examples
2. Retraining or fine-tuning a detection model
3. Redeploying the model
4. Hoping it generalizes

With multimodal embeddings, a floor manager can literally type "worker without safety goggles" into a text field and the system starts monitoring for it *immediately*. The cost of a new alert is one API call to embed the new phrase.

### Score Calibration

Cross-modal similarity with Gemini Embedding 2 operates in a compressed range:

| Score | Interpretation |
|-------|---------------|
| 0.50+ | Very high match |
| 0.42 – 0.50 | Strong match |
| 0.33 – 0.42 | Moderate match |
| 0.22 – 0.33 | Weak match |
| < 0.22 | Little / no match |

For an alert system, start with a threshold around **0.35** and adjust based on your false-positive tolerance. You can also use a two-tier system: 0.35 for "warning" and 0.45 for "critical."

---

## Combining Both Approaches

The two examples are complementary. In a real deployment you might:

1. **First pass (Example 2):** Compare the full frame against alert phrases. If "person lying on floor" scores above threshold, proceed to step 2.
2. **Second pass (Example 1):** Run the grid search to *locate where* in the frame the match is strongest, drawing a bounding box around the detected area.

This gives you both detection and localization — all from text descriptions, all with zero training.

---

## Scaling With a Vector Database

For image-to-image search (e.g., "find all frames similar to this incident"), store embeddings in a vector database like ChromaDB:

```python
import chromadb

db = chromadb.PersistentClient(path="./alert_db")
collection = db.get_or_create_collection(
    name="camera_frames",
    metadata={"hnsw:space": "cosine"},
)

# Store a frame
collection.upsert(
    ids=["frame_001"],
    embeddings=[frame_embedding],
    metadatas=[{"timestamp": "2025-03-15T10:30:00", "camera": "floor_2"}],
)

# Find similar past incidents
results = collection.query(
    query_embeddings=[new_frame_embedding],
    n_results=5,
)
```

This enables historical search: "show me all frames that looked like this incident" — useful for audits, pattern analysis, and compliance.

---

## Limitations and Practical Tips

**Accuracy.** Multimodal embeddings are not a replacement for fine-tuned object detectors when you need pixel-precise bounding boxes or 99.9% recall. They are best for flexible, zero-shot, "good enough" detection where adaptability matters more than precision.

**Latency.** Each embedding API call takes ~200-500ms. For the grid search (100 patches), that is 100 sequential API calls. Batch them, reduce grid size, or use async calls for production.

**Score range.** Cross-modal scores are compressed (0.15–0.55). Do not compare them to text-to-text similarity. Always calibrate thresholds on your specific domain.

**Patch size matters.** Too small and the patch loses context. Too large and you lose localization precision. A 10x10 grid is a good starting point for most images.

---

## Conclusion

Gemini Embedding 2 makes a category of computer vision tasks trivially easy that previously required significant ML infrastructure. The ability to compare any image with any text phrase — using a single API and basic cosine similarity — opens up use cases that were simply impractical before:

- **Retail:** Search product shelves by name
- **Manufacturing:** Custom safety alerts in plain English
- **Agriculture:** Identify plant species in field photos
- **Security:** Describe suspicious behavior in words
- **Healthcare:** Flag visual anomalies by description

The full working code — including the heatmap visualization, interactive CLI, and ChromaDB integration — is available in the [companion repository](https://github.com/niceyzhbankov/research/tree/master/gemini-image-embeddings).

Zero training. Zero labels. Just embeddings and cosine similarity.

---

*All code examples use `gemini-embedding-2-preview` via the `google-genai` Python SDK. The API is available through Google AI Studio with a free tier.*
