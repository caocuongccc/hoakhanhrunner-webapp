// lib/strava-rate-limiter.ts - Rate Limiter & Request Queue
import { supabase } from "./supabase";

type QueuedRequest = {
  id: string;
  userId: string;
  type: "activity" | "athlete" | "refresh";
  activityId?: number;
  priority: number; // 1 = highest, 3 = lowest
  addedAt: Date;
  retries: number;
};

class StravaRateLimiter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private requestCounts: { timestamp: number; count: number }[] = [];

  // Rate limits: 100 requests/15min = 6.67 requests/min
  private readonly MAX_REQUESTS_PER_15_MIN = 90; // Buffer: 90 instead of 100
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MIN_DELAY_MS = 1000; // 1 second between requests

  /**
   * Check if we can make a request now
   */
  canMakeRequest(): boolean {
    const now = Date.now();

    // Remove old requests outside 15min window
    this.requestCounts = this.requestCounts.filter(
      (r) => now - r.timestamp < this.WINDOW_MS
    );

    return this.requestCounts.length < this.MAX_REQUESTS_PER_15_MIN;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requestCounts.push({ timestamp: Date.now(), count: 1 });
  }

  /**
   * Get current usage
   */
  getCurrentUsage(): { used: number; limit: number; percentage: number } {
    const now = Date.now();
    this.requestCounts = this.requestCounts.filter(
      (r) => now - r.timestamp < this.WINDOW_MS
    );

    const used = this.requestCounts.length;
    const percentage = (used / this.MAX_REQUESTS_PER_15_MIN) * 100;

    return { used, limit: this.MAX_REQUESTS_PER_15_MIN, percentage };
  }

  /**
   * Add request to queue
   */
  async addToQueue(request: Omit<QueuedRequest, "id" | "addedAt" | "retries">) {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${Date.now()}_${Math.random()}`,
      addedAt: new Date(),
      retries: 0,
    };

    // Insert sorted by priority
    const insertIndex = this.queue.findIndex(
      (r) => r.priority > request.priority
    );
    if (insertIndex === -1) {
      this.queue.push(queuedRequest);
    } else {
      this.queue.splice(insertIndex, 0, queuedRequest);
    }

    console.log(
      `📝 Queued request: ${request.type} (priority: ${request.priority})`
    );

    // Start processing if not already
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process queue
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Wait if rate limit reached
      while (!this.canMakeRequest()) {
        console.log("⏳ Rate limit reached, waiting 60s...");
        await this.sleep(60000); // Wait 1 minute
      }

      const request = this.queue.shift();
      if (!request) break;

      try {
        await this.executeRequest(request);
        this.recordRequest();

        // Small delay between requests
        await this.sleep(this.MIN_DELAY_MS);
      } catch (error) {
        console.error("Request failed:", error);

        // Retry with lower priority
        if (request.retries < 3) {
          request.retries++;
          request.priority = Math.min(request.priority + 1, 3);
          this.queue.push(request);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Execute a queued request
   */
  private async executeRequest(request: QueuedRequest) {
    console.log(`🚀 Executing: ${request.type} for user ${request.userId}`);

    // Get user's valid access token
    const accessToken = await this.getValidAccessToken(request.userId);

    switch (request.type) {
      case "activity":
        if (request.activityId) {
          return await this.fetchActivity(request.activityId, accessToken);
        }
        break;
      case "athlete":
        return await this.fetchAthlete(accessToken);
      case "refresh":
        return await this.refreshToken(request.userId);
    }
  }

  private async getValidAccessToken(userId: string): Promise<string> {
    const { data: user } = await supabase
      .from("users")
      .select(
        "strava_access_token, strava_refresh_token, strava_token_expires_at"
      )
      .eq("id", userId)
      .single();

    if (!user) throw new Error("User not found");

    const expiresAt = new Date(user.strava_token_expires_at).getTime();
    const now = Date.now();

    // Refresh if expires in < 5 minutes
    if (expiresAt - now < 5 * 60 * 1000) {
      const newTokens = await this.refreshToken(userId);
      return newTokens.access_token;
    }

    return user.strava_access_token;
  }

  private async fetchActivity(activityId: number, accessToken: string) {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  private async fetchAthlete(accessToken: string) {
    const response = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  private async refreshToken(userId: string) {
    const { data: user } = await supabase
      .from("users")
      .select("strava_refresh_token")
      .eq("id", userId)
      .single();

    if (!user) throw new Error("User not found");

    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: user.strava_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) throw new Error("Token refresh failed");

    const tokens = await response.json();

    // Update in database
    await supabase
      .from("users")
      .update({
        strava_access_token: tokens.access_token,
        strava_refresh_token: tokens.refresh_token,
        strava_token_expires_at: new Date(
          tokens.expires_at * 1000
        ).toISOString(),
      })
      .eq("id", userId);

    return tokens;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const rateLimiter = new StravaRateLimiter();

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Example 1: Queue activity fetch
 */
export async function queueActivityFetch(
  userId: string,
  activityId: number,
  priority: 1 | 2 | 3 = 2
) {
  await rateLimiter.addToQueue({
    userId,
    type: "activity",
    activityId,
    priority,
  });
}

/**
 * Example 2: Get current rate limit usage
 */
export function getRateLimitStatus() {
  return rateLimiter.getCurrentUsage();
}

/**
 * Example 3: Check if can make request
 */
export function canMakeStravaRequest(): boolean {
  return rateLimiter.canMakeRequest();
}
