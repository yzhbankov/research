import Anthropic from "@anthropic-ai/sdk";
import {
  ProcessedArticle,
  ArticleSummary,
  FactCheck,
  AnalyzedArticle,
  DailyDigest,
  DigestSection,
  ArticleCategory,
} from "../types";
import { TelegramDigestBot } from "../telegram/bot";

export class AISummarizer {
  private client: Anthropic;
  private model: string;
  private factCheckSources: string[];

  constructor(apiKey: string, model: string = "claude-sonnet-4-20250514", factCheckSources: string[] = []) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.factCheckSources = factCheckSources;
  }

  /**
   * Summarize a single article
   */
  async summarizeArticle(article: ProcessedArticle): Promise<ArticleSummary> {
    const prompt = `Analyze this news article and provide a summary.

ARTICLE:
Title: ${article.title}
Source: ${article.source}
Content: ${article.content.substring(0, 3000)}

Respond in JSON format:
{
  "headline": "A clear, concise headline (max 100 chars)",
  "summary": "2-3 sentence summary of the key information",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "importance": 7
}

The importance score should be 1-10 based on:
- Global impact
- Number of people affected
- Timeliness/urgency
- Novelty of information`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          articleId: article.id,
          headline: parsed.headline || article.title,
          summary: parsed.summary || "",
          keyPoints: parsed.keyPoints || [],
          importance: parsed.importance || 5,
        };
      }
    } catch (error) {
      console.error(`Error summarizing article ${article.id}:`, error);
    }

    // Fallback
    return {
      articleId: article.id,
      headline: article.title,
      summary: article.content.substring(0, 200) + "...",
      keyPoints: [],
      importance: 5,
    };
  }

  /**
   * Fact-check claims in an article
   */
  async factCheckArticle(article: ProcessedArticle): Promise<FactCheck[]> {
    const prompt = `Analyze this news article for factual claims that can be verified.

ARTICLE:
Title: ${article.title}
Source: ${article.source}
Content: ${article.content.substring(0, 3000)}

TRUSTED SOURCES FOR VERIFICATION: ${this.factCheckSources.join(", ") || "Reuters, AP News, official government sources"}

Identify the main factual claims and assess their verifiability.
For each claim, determine if it:
- Can be verified against known facts
- Contains unverified assertions
- Has disputed elements
- Contains false information

Respond in JSON format:
{
  "claims": [
    {
      "claim": "The specific claim made",
      "verdict": "verified|unverified|disputed|false",
      "confidence": 0.85,
      "explanation": "Brief explanation of the assessment",
      "sources": ["source1", "source2"]
    }
  ]
}

Only include claims that are significant and verifiable. Limit to 3 most important claims.
If no significant verifiable claims, return empty claims array.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.claims || []).map((c: any) => ({
          claim: c.claim,
          verdict: c.verdict || "unverified",
          confidence: c.confidence || 0.5,
          explanation: c.explanation || "",
          sources: c.sources || [],
        }));
      }
    } catch (error) {
      console.error(`Error fact-checking article ${article.id}:`, error);
    }

    return [];
  }

  /**
   * Analyze multiple articles (summarize + fact-check)
   */
  async analyzeArticles(articles: ProcessedArticle[]): Promise<AnalyzedArticle[]> {
    const analyzed: AnalyzedArticle[] = [];

    for (const article of articles) {
      console.log(`Analyzing: ${article.title.substring(0, 50)}...`);

      const [summary, factChecks] = await Promise.all([
        this.summarizeArticle(article),
        this.factCheckArticle(article),
      ]);

      analyzed.push({
        ...article,
        summary,
        factChecks,
      });

      // Rate limiting
      await this.sleep(1000);
    }

    return analyzed;
  }

  /**
   * Generate the final daily digest
   */
  async generateDigest(analyzedArticles: AnalyzedArticle[]): Promise<DailyDigest> {
    // Group by category
    const byCategory = new Map<ArticleCategory, AnalyzedArticle[]>();

    for (const article of analyzedArticles) {
      const category = article.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(article);
    }

    // Sort articles within each category by importance
    for (const articles of byCategory.values()) {
      articles.sort((a, b) => b.summary.importance - a.summary.importance);
    }

    // Create sections
    const sections: DigestSection[] = [];
    const categoryOrder: ArticleCategory[] = [
      "world",
      "politics",
      "technology",
      "business",
      "science",
      "health",
      "sports",
      "entertainment",
      "other",
    ];

    for (const category of categoryOrder) {
      const articles = byCategory.get(category);
      if (!articles || articles.length === 0) continue;

      // Take top 3 articles per category
      const topArticles = articles.slice(0, 3);

      sections.push({
        category,
        emoji: TelegramDigestBot.getCategoryEmoji(category),
        articles: topArticles.map((article) => {
          // Determine fact-check status
          let factCheckStatus: "verified" | "warning" | "none" = "none";
          let factCheckNote: string | undefined;

          if (article.factChecks.length > 0) {
            const hasDisputed = article.factChecks.some(
              (fc) => fc.verdict === "disputed" || fc.verdict === "false"
            );
            const allVerified = article.factChecks.every(
              (fc) => fc.verdict === "verified"
            );

            if (hasDisputed) {
              factCheckStatus = "warning";
              const disputed = article.factChecks.find(
                (fc) => fc.verdict === "disputed" || fc.verdict === "false"
              );
              factCheckNote = disputed?.explanation;
            } else if (allVerified) {
              factCheckStatus = "verified";
            }
          }

          return {
            headline: article.summary.headline,
            summary: article.summary.summary,
            factCheckStatus,
            factCheckNote,
            sources: [article.source],
          };
        }),
      });
    }

    // Calculate stats
    const factChecksPerformed = analyzedArticles.reduce(
      (sum, a) => sum + a.factChecks.length,
      0
    );

    return {
      date: new Date(),
      sections,
      stats: {
        totalArticles: analyzedArticles.length,
        factChecksPerformed,
        categoriesCovered: sections.length,
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
