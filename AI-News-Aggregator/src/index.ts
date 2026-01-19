import { TelegramChannelReader } from "./telegram/reader";
import { TelegramDigestBot } from "./telegram/bot";
import { WebScraper, RSSReader } from "./scraper/web";
import { ContentProcessor } from "./ai/processor";
import { AISummarizer } from "./ai/summarizer";
import { AppConfig, RawArticle, ProcessedArticle, AnalyzedArticle } from "./types";

export class NewsAggregator {
  private config: AppConfig;

  // Components
  private telegramReader: TelegramChannelReader | null = null;
  private telegramBot: TelegramDigestBot;
  private webScraper: WebScraper;
  private rssReader: RSSReader;
  private processor: ContentProcessor;
  private summarizer: AISummarizer;

  // State
  private collectedArticles: RawArticle[] = [];

  constructor(config: AppConfig) {
    this.config = config;

    // Initialize components
    this.telegramBot = new TelegramDigestBot(
      config.telegram.botToken,
      config.telegram.outputChannel
    );
    this.webScraper = new WebScraper();
    this.rssReader = new RSSReader();
    this.processor = new ContentProcessor(config.ai.apiKey, config.ai.model);
    this.summarizer = new AISummarizer(
      config.ai.apiKey,
      config.ai.model,
      config.ai.factCheckSources
    );
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    console.log("Initializing News Aggregator...");

    // Initialize web scraper
    await this.webScraper.initialize();

    // Initialize Telegram reader if credentials provided
    if (this.config.telegram.apiId && this.config.telegram.apiHash) {
      this.telegramReader = new TelegramChannelReader(
        this.config.telegram.apiId,
        this.config.telegram.apiHash
      );
      // Note: Connection requires session string from setup
    }

    console.log("Initialization complete");
  }

  /**
   * Collect articles from all sources
   */
  async collect(): Promise<RawArticle[]> {
    console.log("Starting article collection...");
    this.collectedArticles = [];

    // Collect from Telegram channels
    if (this.telegramReader && this.config.sources.telegram.channels.length > 0) {
      try {
        console.log("Fetching from Telegram channels...");
        const telegramArticles = await this.telegramReader.fetchFromChannels(
          this.config.sources.telegram.channels,
          24 // Last 24 hours
        );
        this.collectedArticles.push(...telegramArticles);
        console.log(`Collected ${telegramArticles.length} articles from Telegram`);
      } catch (error) {
        console.error("Error fetching from Telegram:", error);
      }
    }

    // Collect from websites
    if (this.config.sources.websites.length > 0) {
      try {
        console.log("Scraping websites...");
        const webArticles = await this.webScraper.scrapeWebsites(
          this.config.sources.websites
        );
        this.collectedArticles.push(...webArticles);
        console.log(`Collected ${webArticles.length} articles from websites`);
      } catch (error) {
        console.error("Error scraping websites:", error);
      }
    }

    // Collect from RSS feeds
    if (this.config.sources.rss.length > 0) {
      try {
        console.log("Fetching RSS feeds...");
        const rssUrls = this.config.sources.rss.map((r) =>
          typeof r === "string" ? r : r.url
        );
        const rssArticles = await this.rssReader.fetchFeeds(rssUrls);
        this.collectedArticles.push(...rssArticles);
        console.log(`Collected ${rssArticles.length} articles from RSS feeds`);
      } catch (error) {
        console.error("Error fetching RSS:", error);
      }
    }

    // Filter to last 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.collectedArticles = this.collectedArticles.filter(
      (a) => a.publishedAt >= cutoff
    );

    console.log(`Total collected: ${this.collectedArticles.length} articles`);
    return this.collectedArticles;
  }

  /**
   * Process collected articles and publish digest
   */
  async processAndPublish(): Promise<void> {
    if (this.collectedArticles.length === 0) {
      console.log("No articles to process");
      await this.telegramBot.sendMessage("📭 No news articles found for today's digest.");
      return;
    }

    console.log("Processing articles...");

    // Process: deduplicate, categorize, extract entities
    const processed = await this.processor.processArticles(this.collectedArticles);
    console.log(`Processed ${processed.length} unique articles`);

    // Analyze: summarize and fact-check
    console.log("Analyzing articles with AI...");
    const analyzed = await this.summarizer.analyzeArticles(processed);

    // Generate digest
    console.log("Generating digest...");
    const digest = await this.summarizer.generateDigest(analyzed);

    // Publish to Telegram
    console.log("Publishing to Telegram...");
    await this.telegramBot.postDigest(digest);

    console.log("Digest published successfully!");
  }

  /**
   * Run the full pipeline
   */
  async run(): Promise<void> {
    await this.initialize();
    await this.collect();
    await this.processAndPublish();
    await this.shutdown();
  }

  /**
   * Shutdown all components
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down...");

    if (this.telegramReader) {
      await this.telegramReader.disconnect();
    }

    await this.webScraper.close();

    console.log("Shutdown complete");
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
AI News Aggregator

Usage:
  npx tsx src/index.ts [options]

Options:
  --config <path>   Path to config file (default: config/config.yaml)
  --run-now         Run immediately instead of scheduling
  --setup-telegram  Set up Telegram session
  --help, -h        Show this help message

Environment Variables:
  ANTHROPIC_API_KEY     Your Anthropic API key
  TELEGRAM_API_ID       Telegram API ID
  TELEGRAM_API_HASH     Telegram API Hash
  TELEGRAM_BOT_TOKEN    Telegram Bot Token
  TELEGRAM_CHANNEL      Output Telegram channel (e.g., @mychannel)
`);
    return;
  }

  // Load config from environment or file
  const config: AppConfig = {
    telegram: {
      apiId: parseInt(process.env.TELEGRAM_API_ID || "0"),
      apiHash: process.env.TELEGRAM_API_HASH || "",
      botToken: process.env.TELEGRAM_BOT_TOKEN || "",
      outputChannel: process.env.TELEGRAM_CHANNEL || "",
    },
    ai: {
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      model: "claude-sonnet-4-20250514",
      factCheckSources: ["reuters.com", "apnews.com"],
    },
    schedule: {
      collectTime: "06:00",
      publishTime: "08:00",
      timezone: "UTC",
    },
    sources: {
      telegram: {
        channels: [],
      },
      websites: [
        {
          name: "Hacker News",
          url: "https://news.ycombinator.com",
          articleSelector: ".athing",
          titleSelector: ".titleline > a",
        },
      ],
      rss: [
        { url: "https://feeds.bbci.co.uk/news/rss.xml", name: "BBC News" },
      ],
    },
  };

  if (args.includes("--run-now")) {
    const aggregator = new NewsAggregator(config);
    await aggregator.run();
  } else {
    // Import and run scheduler
    const { Scheduler } = await import("./scheduler");
    const scheduler = new Scheduler(config);
    await scheduler.start();

    // Keep process running
    process.on("SIGINT", async () => {
      await scheduler.stop();
      process.exit(0);
    });
  }
}

// Export for programmatic use
export { TelegramChannelReader, TelegramDigestBot, WebScraper, RSSReader };
export { ContentProcessor, AISummarizer };
export { Scheduler } from "./scheduler";

// Run if executed directly
main().catch(console.error);
