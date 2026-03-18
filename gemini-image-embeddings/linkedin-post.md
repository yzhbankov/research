# LinkedIn Post

---

**What if you could search inside an image using plain English — with zero training?**

I built two practical tools using Google's Gemini Embedding 2 — a multimodal model that places images and text into the same vector space.

**Example 1: Visual Phrase Search**
Point at a supermarket shelf photo, type "cinnamon" — the system highlights exactly where it is. Change to "rosemary"? Instant re-search. No labeled data. No fine-tuning. Just cosine similarity between image patches and your text query.

**Example 2: Custom Manufacturing Alerts**
Compare camera frames against plain-English phrases like "person lying on the floor" or "forklift near pedestrian." If the similarity exceeds a threshold — alert fires. Adding a new alert? Just type a new sentence. Zero retraining.

The core insight: when images and text share the same embedding space, you can replace entire ML pipelines with a single API call + cosine similarity.

**What this means for production:**
- Retail → search shelves by product name
- Manufacturing → instant safety monitoring in plain English
- Agriculture → identify species from a description
- Security → describe what to watch for, in words

50 lines of Python. No training data. No model management.

Full code + heatmap visualizations in the repo (link in comments).

---

**Suggested images to attach (from repo):**

1. `watch_folder/img_1.png` — Original supermarket spice shelf (the input image)
2. `watch_folder/img_1_search_cinamon.png` — Heatmap result for "cinnamon" search
3. `watch_folder/img_1_search_rosemary.png` — Heatmap result for "rosemary" search
4. `watch_folder/img_1_search_ground_black_pepper.png` — Heatmap result for "ground black pepper" search

**Image carousel order:** Original shelf → Cinnamon heatmap → Rosemary heatmap → Black pepper heatmap

---

**Hashtags:**
#MachineLearning #ComputerVision #GoogleAI #GeminiEmbeddings #MultimodalAI #Python #ZeroShotLearning #ManufacturingAI #RetailTech #Embeddings
