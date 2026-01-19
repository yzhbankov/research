# AI News Aggregator

An intelligent service that aggregates news from Telegram channels and websites, uses AI to summarize and fact-check the content, and delivers daily digests to your Telegram channel.

## The Idea

### Problem
- Information overload from multiple news sources
- Time-consuming to read through all channels and sites
- Difficulty distinguishing facts from misinformation
- No centralized summary of daily news

### Solution
An automated service that:
1. **Collects** news from your specified Telegram channels and news websites
2. **Analyzes** content using AI to extract key information
3. **Fact-checks** claims against reliable sources
4. **Summarizes** everything into a concise daily digest
5. **Delivers** the summary to your Telegram channel

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SCHEDULER (Cron)                            │
│                      Runs daily at specified time                    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR                                 │
│                    Coordinates all components                        │
└─────────────────────────────────────────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  TELEGRAM READER     │ │   WEB SCRAPER    │ │    RSS READER        │
│                      │ │                  │ │                      │
│ - MTProto API        │ │ - Puppeteer      │ │ - RSS/Atom feeds     │
│ - Read channels      │ │ - Article parser │ │ - Feed aggregation   │
│ - Extract messages   │ │ - Content clean  │ │                      │
└──────────────────────┘ └──────────────────┘ └──────────────────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CONTENT PROCESSOR                               │
│                                                                      │
│  - Deduplication (similar articles)                                  │
│  - Language detection                                                │
│  - Category classification                                           │
│  - Entity extraction (people, places, organizations)                 │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AI ENGINE (Claude)                            │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │   SUMMARIZER    │  │  FACT CHECKER   │  │  DIGEST GENERATOR   │  │
│  │                 │  │                 │  │                     │  │
│  │ - Key points    │  │ - Claim extract │  │ - Format output     │  │
│  │ - TL;DR         │  │ - Source verify │  │ - Priority sort     │  │
│  │ - Importance    │  │ - Confidence    │  │ - Final review      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TELEGRAM BOT                                    │
│                                                                      │
│  - Post to channel                                                   │
│  - Format with Markdown                                              │
│  - Include fact-check warnings                                       │
│  - Add source links                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
1. COLLECT (6:00 AM)
   ├── Telegram: Fetch last 24h messages from subscribed channels
   ├── Websites: Scrape articles from configured news sites
   └── RSS: Pull latest entries from feeds

2. PROCESS
   ├── Clean HTML/formatting
   ├── Detect language
   ├── Remove duplicates (cosine similarity)
   └── Categorize (Politics, Tech, Sports, etc.)

3. ANALYZE (AI)
   ├── Summarize each article (2-3 sentences)
   ├── Extract factual claims
   ├── Cross-reference claims with known facts
   └── Assign confidence scores

4. GENERATE
   ├── Group by category
   ├── Sort by importance
   ├── Create digest with:
   │   ├── Headlines
   │   ├── Summaries
   │   ├── Fact-check notes
   │   └── Source links
   └── Format for Telegram

5. DELIVER (8:00 AM)
   └── Post to configured Telegram channel
```

## Key Features

### 1. Multi-Source Aggregation
- **Telegram Channels**: Using MTProto API (gramjs/telethon)
- **News Websites**: Configurable list with CSS selectors
- **RSS Feeds**: Standard feed parsing

### 2. AI-Powered Summarization
- Extracts key points from each article
- Generates concise summaries
- Identifies main topics and entities
- Ranks by importance/relevance

### 3. Fact-Checking
- Extracts verifiable claims from articles
- Cross-references with trusted sources
- Provides confidence scores
- Flags potentially misleading content
- Adds context where needed

### 4. Smart Digest Generation
- Groups related stories
- Removes redundant information
- Maintains readable format
- Includes source attribution

## Configuration

```yaml
# config/sources.yaml
telegram:
  channels:
    - "@techcrunch"
    - "@bbcnews"
    - "@crypto_news"

websites:
  - name: "TechCrunch"
    url: "https://techcrunch.com"
    selector: "article.post"

  - name: "BBC News"
    url: "https://bbc.com/news"
    selector: ".gs-c-promo"

rss:
  - "https://feeds.bbci.co.uk/news/rss.xml"
  - "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"

schedule:
  collect_time: "06:00"
  publish_time: "08:00"
  timezone: "UTC"

output:
  telegram_channel: "@my_news_digest"

ai:
  model: "claude-sonnet-4-20250514"
  fact_check_sources:
    - "reuters.com"
    - "apnews.com"
    - "snopes.com"
```

## Output Example

```
📰 Daily News Digest - January 19, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔷 TECHNOLOGY

▪️ OpenAI Announces GPT-5 Release
OpenAI unveiled GPT-5 with significant improvements in
reasoning and multimodal capabilities. The model shows
40% better performance on complex tasks.
✅ Fact-checked: Confirmed by OpenAI official blog
📎 Sources: TechCrunch, The Verge

▪️ Apple's New AR Glasses Launch
Apple announced Vision Pro 2 with lighter design and
improved battery life. Pre-orders start February 1.
⚠️ Note: Price not officially confirmed yet
📎 Sources: @apple_news, MacRumors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔷 WORLD NEWS

▪️ Climate Summit Reaches Agreement
195 countries agreed on new emissions targets at COP31.
The agreement includes binding commitments for 2030.
✅ Fact-checked: Verified via UN official statement
📎 Sources: BBC, Reuters

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Today's Summary:
• 12 articles processed
• 8 fact-checks performed
• 3 categories covered

🔗 Full sources: [link to detailed version]
```

## Tech Stack

- **Runtime**: Node.js / TypeScript
- **Telegram API**: gramjs (MTProto) + Bot API
- **Web Scraping**: Playwright + Cheerio
- **AI**: Anthropic Claude API
- **Scheduling**: node-cron
- **Database**: SQLite (for caching/dedup)
- **Configuration**: YAML

## Privacy & Ethics

- Only reads public channels/content
- No personal data collection
- Transparent source attribution
- Clear fact-check methodology
- User controls all sources
