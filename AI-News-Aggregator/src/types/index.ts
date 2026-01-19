// Source types
export interface TelegramChannelConfig {
  username: string;
  name?: string;
}

export interface WebsiteConfig {
  name: string;
  url: string;
  articleSelector: string;
  titleSelector?: string;
  contentSelector?: string;
  dateSelector?: string;
}

export interface RSSFeedConfig {
  url: string;
  name?: string;
}

export interface SourcesConfig {
  telegram: {
    channels: TelegramChannelConfig[];
  };
  websites: WebsiteConfig[];
  rss: RSSFeedConfig[];
}

// Content types
export interface RawArticle {
  id: string;
  source: string;
  sourceType: "telegram" | "website" | "rss";
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
  author?: string;
  imageUrl?: string;
}

export interface ProcessedArticle extends RawArticle {
  language: string;
  category: ArticleCategory;
  entities: Entity[];
  hash: string; // For deduplication
}

export interface Entity {
  type: "person" | "organization" | "location" | "event";
  name: string;
  mentions: number;
}

export type ArticleCategory =
  | "technology"
  | "politics"
  | "business"
  | "sports"
  | "entertainment"
  | "science"
  | "health"
  | "world"
  | "other";

// AI Analysis types
export interface ArticleSummary {
  articleId: string;
  headline: string;
  summary: string;
  keyPoints: string[];
  importance: number; // 1-10
}

export interface FactCheck {
  claim: string;
  verdict: "verified" | "unverified" | "disputed" | "false";
  confidence: number; // 0-1
  explanation: string;
  sources: string[];
}

export interface AnalyzedArticle extends ProcessedArticle {
  summary: ArticleSummary;
  factChecks: FactCheck[];
}

// Digest types
export interface DigestSection {
  category: ArticleCategory;
  emoji: string;
  articles: DigestArticle[];
}

export interface DigestArticle {
  headline: string;
  summary: string;
  factCheckStatus: "verified" | "warning" | "none";
  factCheckNote?: string;
  sources: string[];
}

export interface DailyDigest {
  date: Date;
  sections: DigestSection[];
  stats: {
    totalArticles: number;
    factChecksPerformed: number;
    categoriesCovered: number;
  };
}

// Configuration
export interface AppConfig {
  telegram: {
    apiId: number;
    apiHash: string;
    botToken: string;
    outputChannel: string;
  };
  ai: {
    apiKey: string;
    model: string;
    factCheckSources: string[];
  };
  schedule: {
    collectTime: string;
    publishTime: string;
    timezone: string;
  };
  sources: SourcesConfig;
}
