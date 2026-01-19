import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";
import { RawArticle, TelegramChannelConfig } from "../types";

export class TelegramChannelReader {
  private client: TelegramClient;
  private apiId: number;
  private apiHash: string;
  private session: StringSession;

  constructor(apiId: number, apiHash: string, sessionString: string = "") {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.session = new StringSession(sessionString);
    this.client = new TelegramClient(this.session, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });
  }

  async connect(): Promise<string> {
    await this.client.start({
      phoneNumber: async () => {
        throw new Error("Phone number required - run setup first");
      },
      password: async () => {
        throw new Error("Password required - run setup first");
      },
      phoneCode: async () => {
        throw new Error("Phone code required - run setup first");
      },
      onError: (err) => console.error("Telegram error:", err),
    });

    console.log("Connected to Telegram");
    return this.session.save();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  /**
   * Fetch messages from a channel within the last N hours
   */
  async fetchChannelMessages(
    channelUsername: string,
    hoursBack: number = 24,
    limit: number = 100
  ): Promise<RawArticle[]> {
    const articles: RawArticle[] = [];
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    try {
      // Resolve channel entity
      const channel = await this.client.getEntity(channelUsername);

      // Fetch messages
      const messages = await this.client.getMessages(channel, {
        limit,
      });

      for (const message of messages) {
        // Skip if older than cutoff
        if (message.date && new Date(message.date * 1000) < cutoffTime) {
          continue;
        }

        // Skip empty messages
        if (!message.message && !message.text) {
          continue;
        }

        const content = message.message || message.text || "";

        // Extract title from first line or use truncated content
        const lines = content.split("\n").filter((l) => l.trim());
        const title = lines[0]?.substring(0, 200) || "Untitled";

        articles.push({
          id: `tg_${channelUsername}_${message.id}`,
          source: channelUsername,
          sourceType: "telegram",
          title,
          content,
          publishedAt: new Date(message.date * 1000),
          url: `https://t.me/${channelUsername.replace("@", "")}/${message.id}`,
        });
      }
    } catch (error) {
      console.error(`Error fetching from ${channelUsername}:`, error);
    }

    return articles;
  }

  /**
   * Fetch from multiple channels
   */
  async fetchFromChannels(
    channels: TelegramChannelConfig[],
    hoursBack: number = 24
  ): Promise<RawArticle[]> {
    const allArticles: RawArticle[] = [];

    for (const channel of channels) {
      console.log(`Fetching from Telegram channel: ${channel.username}`);
      const articles = await this.fetchChannelMessages(
        channel.username,
        hoursBack
      );
      allArticles.push(...articles);

      // Rate limiting - wait between channels
      await this.sleep(1000);
    }

    return allArticles;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Setup script to get session string (run once interactively)
 */
export async function setupTelegramSession(
  apiId: number,
  apiHash: string
): Promise<string> {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  const session = new StringSession("");
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: () => question("Enter your phone number: "),
    password: () => question("Enter your 2FA password (if any): "),
    phoneCode: () => question("Enter the code you received: "),
    onError: (err) => console.error(err),
  });

  rl.close();

  const sessionString = session.save();
  console.log("\nYour session string (save this securely):");
  console.log(sessionString);

  await client.disconnect();
  return sessionString;
}
