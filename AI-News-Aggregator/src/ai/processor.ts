import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { RawArticle, ProcessedArticle, ArticleCategory, Entity } from "../types";

export class ContentProcessor {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  /**
   * Process raw articles: deduplicate, categorize, extract entities
   */
  async processArticles(articles: RawArticle[]): Promise<ProcessedArticle[]> {
    // First, deduplicate by content similarity
    const deduplicated = this.deduplicateArticles(articles);
    console.log(`Deduplicated: ${articles.length} -> ${deduplicated.length} articles`);

    // Then categorize and extract entities using AI
    const processed: ProcessedArticle[] = [];

    // Process in batches to reduce API calls
    const batchSize = 5;
    for (let i = 0; i < deduplicated.length; i += batchSize) {
      const batch = deduplicated.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch);
      processed.push(...batchResults);

      // Rate limiting
      await this.sleep(1000);
    }

    return processed;
  }

  /**
   * Process a batch of articles
   */
  private async processBatch(articles: RawArticle[]): Promise<ProcessedArticle[]> {
    const articlesText = articles
      .map((a, i) => `[${i}] Title: ${a.title}\nContent: ${a.content.substring(0, 500)}`)
      .join("\n\n---\n\n");

    const prompt = `Analyze these news articles and categorize them.

ARTICLES:
${articlesText}

For each article, determine:
1. Category (one of: technology, politics, business, sports, entertainment, science, health, world, other)
2. Language (e.g., "en", "ru", "es")
3. Key entities (people, organizations, locations mentioned)

Respond in JSON format:
{
  "articles": [
    {
      "index": 0,
      "category": "technology",
      "language": "en",
      "entities": [
        {"type": "person", "name": "Elon Musk"},
        {"type": "organization", "name": "Tesla"}
      ]
    }
  ]
}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const results: ProcessedArticle[] = [];

        for (const articleData of parsed.articles || []) {
          const article = articles[articleData.index];
          if (!article) continue;

          results.push({
            ...article,
            language: articleData.language || "en",
            category: this.validateCategory(articleData.category),
            entities: (articleData.entities || []).map((e: any) => ({
              type: e.type,
              name: e.name,
              mentions: 1,
            })),
            hash: this.hashContent(article.title + article.content),
          });
        }

        return results;
      }
    } catch (error) {
      console.error("Error processing batch:", error);
    }

    // Fallback: return articles with default categorization
    return articles.map((article) => ({
      ...article,
      language: "en",
      category: "other" as ArticleCategory,
      entities: [],
      hash: this.hashContent(article.title + article.content),
    }));
  }

  /**
   * Deduplicate articles based on content similarity
   */
  private deduplicateArticles(articles: RawArticle[]): RawArticle[] {
    const seen = new Map<string, RawArticle>();
    const result: RawArticle[] = [];

    for (const article of articles) {
      // Create a normalized key from title
      const normalizedTitle = this.normalizeText(article.title);
      const titleHash = this.hashContent(normalizedTitle);

      // Check if we've seen a very similar title
      let isDuplicate = false;

      for (const [hash, existing] of seen) {
        const similarity = this.calculateSimilarity(
          normalizedTitle,
          this.normalizeText(existing.title)
        );

        if (similarity > 0.8) {
          isDuplicate = true;
          // Keep the one with more content
          if (article.content.length > existing.content.length) {
            seen.set(hash, article);
          }
          break;
        }
      }

      if (!isDuplicate) {
        seen.set(titleHash, article);
        result.push(article);
      }
    }

    return result;
  }

  /**
   * Calculate Jaccard similarity between two texts
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Hash content for deduplication
   */
  private hashContent(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  /**
   * Validate and normalize category
   */
  private validateCategory(category: string): ArticleCategory {
    const validCategories: ArticleCategory[] = [
      "technology",
      "politics",
      "business",
      "sports",
      "entertainment",
      "science",
      "health",
      "world",
      "other",
    ];

    const normalized = category?.toLowerCase().trim();
    if (validCategories.includes(normalized as ArticleCategory)) {
      return normalized as ArticleCategory;
    }
    return "other";
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
