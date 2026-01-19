import { chromium, Browser, Page } from "playwright";
import * as cheerio from "cheerio";
import { RawArticle, WebsiteConfig } from "../types";
import crypto from "crypto";

export class WebScraper {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Scrape articles from a website
   */
  async scrapeWebsite(config: WebsiteConfig): Promise<RawArticle[]> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    const articles: RawArticle[] = [];
    const page = await this.browser.newPage();

    try {
      console.log(`Scraping website: ${config.name}`);

      // Navigate to the page
      await page.goto(config.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      // Get page content
      const html = await page.content();
      const $ = cheerio.load(html);

      // Find articles using the configured selector
      $(config.articleSelector).each((index, element) => {
        if (index >= 20) return; // Limit to 20 articles per site

        const $article = $(element);

        // Extract title
        const titleSelector = config.titleSelector || "h1, h2, h3, .title, .headline";
        const title = $article.find(titleSelector).first().text().trim() ||
          $article.find("a").first().text().trim();

        if (!title) return;

        // Extract content
        const contentSelector = config.contentSelector || "p, .summary, .excerpt, .description";
        const content = $article.find(contentSelector).text().trim() ||
          $article.text().trim();

        // Extract link
        const link = $article.find("a").first().attr("href");
        const url = link ? this.resolveUrl(link, config.url) : undefined;

        // Extract date if possible
        const dateSelector = config.dateSelector || "time, .date, .timestamp";
        const dateStr = $article.find(dateSelector).attr("datetime") ||
          $article.find(dateSelector).text().trim();
        const publishedAt = this.parseDate(dateStr);

        // Generate unique ID
        const id = `web_${config.name}_${crypto.createHash("md5").update(title).digest("hex").substring(0, 8)}`;

        articles.push({
          id,
          source: config.name,
          sourceType: "website",
          title: title.substring(0, 300),
          content: content.substring(0, 5000),
          url,
          publishedAt,
        });
      });
    } catch (error) {
      console.error(`Error scraping ${config.name}:`, error);
    } finally {
      await page.close();
    }

    return articles;
  }

  /**
   * Scrape from multiple websites
   */
  async scrapeWebsites(configs: WebsiteConfig[]): Promise<RawArticle[]> {
    const allArticles: RawArticle[] = [];

    for (const config of configs) {
      const articles = await this.scrapeWebsite(config);
      allArticles.push(...articles);

      // Rate limiting
      await this.sleep(2000);
    }

    return allArticles;
  }

  /**
   * Resolve relative URLs
   */
  private resolveUrl(link: string, baseUrl: string): string {
    try {
      return new URL(link, baseUrl).toString();
    } catch {
      return link;
    }
  }

  /**
   * Parse various date formats
   */
  private parseDate(dateStr: string | undefined): Date {
    if (!dateStr) return new Date();

    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      // Fall through
    }

    return new Date();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Simple RSS/Atom feed reader
 */
export class RSSReader {
  /**
   * Fetch and parse an RSS feed
   */
  async fetchFeed(feedUrl: string): Promise<RawArticle[]> {
    const articles: RawArticle[] = [];

    try {
      console.log(`Fetching RSS feed: ${feedUrl}`);

      const response = await fetch(feedUrl);
      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      // Try RSS format first
      $("item").each((index, element) => {
        if (index >= 30) return;

        const $item = $(element);
        const title = $item.find("title").text().trim();
        const content = $item.find("description").text().trim() ||
          $item.find("content\\:encoded").text().trim();
        const link = $item.find("link").text().trim();
        const pubDate = $item.find("pubDate").text().trim();

        if (title) {
          articles.push({
            id: `rss_${crypto.createHash("md5").update(link || title).digest("hex").substring(0, 8)}`,
            source: new URL(feedUrl).hostname,
            sourceType: "rss",
            title,
            content: this.stripHtml(content).substring(0, 5000),
            url: link,
            publishedAt: pubDate ? new Date(pubDate) : new Date(),
          });
        }
      });

      // Try Atom format if no RSS items found
      if (articles.length === 0) {
        $("entry").each((index, element) => {
          if (index >= 30) return;

          const $entry = $(element);
          const title = $entry.find("title").text().trim();
          const content = $entry.find("content").text().trim() ||
            $entry.find("summary").text().trim();
          const link = $entry.find("link").attr("href") || "";
          const updated = $entry.find("updated").text().trim() ||
            $entry.find("published").text().trim();

          if (title) {
            articles.push({
              id: `atom_${crypto.createHash("md5").update(link || title).digest("hex").substring(0, 8)}`,
              source: new URL(feedUrl).hostname,
              sourceType: "rss",
              title,
              content: this.stripHtml(content).substring(0, 5000),
              url: link,
              publishedAt: updated ? new Date(updated) : new Date(),
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    }

    return articles;
  }

  /**
   * Fetch multiple RSS feeds
   */
  async fetchFeeds(feedUrls: string[]): Promise<RawArticle[]> {
    const allArticles: RawArticle[] = [];

    for (const url of feedUrls) {
      const articles = await this.fetchFeed(url);
      allArticles.push(...articles);
      await this.sleep(500);
    }

    return allArticles;
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
