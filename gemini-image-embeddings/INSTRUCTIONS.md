# Gemini Embedding 2 — Image ↔ Text Semantic Similarity

Interactive CLI that embeds an image and a text phrase using **Gemini Embedding 2**
(`gemini-embedding-2-preview`) and prints a cosine similarity score between them.

---

## Prerequisites

- Python 3.10+
- A Google AI Studio API key → https://aistudio.google.com/apikey

---

## Setup

**1. Install dependencies**
```bash
pip3 install -r requirements.txt
```

**2. Set your API key**
```bash
cp .env.example .env
# open .env and replace the placeholder with your real key
```

Or export it inline without a file:
```bash
export GOOGLE_API_KEY=your_key_here
```

---

## Run

```bash
python3 compare.py
```

---

## Usage

1. Drop any image (`.jpg`, `.png`, `.webp`, …) into the **`watch_folder/`** directory.
2. The app auto-selects it (or lets you pick if there are multiple).
3. Type a text phrase and press Enter — the similarity score is printed instantly.
4. Repeat with different phrases. Type `image` to swap to a different image, `quit` to exit.

**Example session:**
```
============================================================
  Gemini Embedding 2 — Image ↔ Text Semantic Similarity
============================================================
  Watch folder: ./watch_folder
  Type 'quit' to exit, 'image' to change the selected image.

  Images in watch folder:
    [1] sunset.jpg
    [2] cat.png
  Pick image number (or path): 1

  Embedding image: sunset.jpg ... done  (dim=3072)

  [sunset.jpg] Enter phrase: golden sky over the ocean
  Score : [████████████████████████████░░░░░░░░░░░░] 0.7102
  Match : Strong match

  [sunset.jpg] Enter phrase: a cold snowy mountain
  Score : [█████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0.3341
  Match : Weak match

  [sunset.jpg] Enter phrase: image

  (image picker shown again)
```

---

## Score guide

Cross-modal (image ↔ text) cosine similarity with Gemini Embedding 2 operates
in a compressed range of roughly **0.15 – 0.55**. Do not compare these values
to text↔text similarity scores, which span a much wider range.

| Score | Meaning |
|-------|---------|
| 0.50+ | Very high match |
| 0.42 – 0.50 | Strong match |
| 0.33 – 0.42 | Moderate match |
| 0.22 – 0.33 | Weak match |
| < 0.22 | Little / no match |

---

## Files

| File | Purpose |
|------|---------|
| `compare.py` | Interactive similarity app (main entry point) |
| `main.py` | Core embedding helpers + ChromaDB batch pipeline |
| `batch_ingest.py` | CLI to ingest a folder of images into ChromaDB |
| `watch_folder/` | Drop images here before running `compare.py` |
| `requirements.txt` | Python dependencies |
| `.env.example` | API key template |
