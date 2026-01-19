import cron from "node-cron";
import { NewsAggregator } from "../index";
import { AppConfig } from "../types";

export class Scheduler {
  private aggregator: NewsAggregator;
  private config: AppConfig;
  private collectJob: cron.ScheduledTask | null = null;
  private publishJob: cron.ScheduledTask | null = null;

  constructor(config: AppConfig) {
    this.config = config;
    this.aggregator = new NewsAggregator(config);
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    console.log("Starting News Aggregator Scheduler...");

    // Initialize the aggregator
    await this.aggregator.initialize();

    // Parse schedule times
    const collectTime = this.parseTime(this.config.schedule.collectTime);
    const publishTime = this.parseTime(this.config.schedule.publishTime);

    // Schedule collection job
    const collectCron = `${collectTime.minute} ${collectTime.hour} * * *`;
    this.collectJob = cron.schedule(collectCron, async () => {
      console.log(`[${new Date().toISOString()}] Running collection job...`);
      try {
        await this.aggregator.collect();
        console.log("Collection completed successfully");
      } catch (error) {
        console.error("Collection failed:", error);
      }
    }, {
      timezone: this.config.schedule.timezone,
    });

    // Schedule publish job
    const publishCron = `${publishTime.minute} ${publishTime.hour} * * *`;
    this.publishJob = cron.schedule(publishCron, async () => {
      console.log(`[${new Date().toISOString()}] Running publish job...`);
      try {
        await this.aggregator.processAndPublish();
        console.log("Publish completed successfully");
      } catch (error) {
        console.error("Publish failed:", error);
      }
    }, {
      timezone: this.config.schedule.timezone,
    });

    console.log(`Scheduled collection at ${this.config.schedule.collectTime} ${this.config.schedule.timezone}`);
    console.log(`Scheduled publish at ${this.config.schedule.publishTime} ${this.config.schedule.timezone}`);
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (this.collectJob) {
      this.collectJob.stop();
    }
    if (this.publishJob) {
      this.publishJob.stop();
    }
    await this.aggregator.shutdown();
    console.log("Scheduler stopped");
  }

  /**
   * Run immediately (for testing)
   */
  async runNow(): Promise<void> {
    console.log("Running aggregation immediately...");
    await this.aggregator.initialize();
    await this.aggregator.collect();
    await this.aggregator.processAndPublish();
    await this.aggregator.shutdown();
  }

  /**
   * Parse time string (HH:MM) to hour and minute
   */
  private parseTime(timeStr: string): { hour: number; minute: number } {
    const [hour, minute] = timeStr.split(":").map(Number);
    return { hour: hour || 0, minute: minute || 0 };
  }
}

/**
 * Create and run scheduler from config file
 */
export async function runScheduler(configPath: string): Promise<void> {
  const fs = await import("fs");
  const yaml = await import("yaml");

  const configContent = fs.readFileSync(configPath, "utf-8");
  const config = yaml.parse(configContent) as AppConfig;

  const scheduler = new Scheduler(config);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await scheduler.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await scheduler.stop();
    process.exit(0);
  });

  await scheduler.start();
}
