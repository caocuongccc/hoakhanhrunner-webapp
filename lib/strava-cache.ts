// lib/strava-cache.ts - Activity Cache to reduce API calls
import { supabase } from "./supabase";

type CachedActivity = {
  activity_id: number;
  data: any;
  cached_at: string;
  expires_at: string;
};

class StravaActivityCache {
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get activity from cache or Strava API
   */
  async getActivity(
    activityId: number,
    userId: string,
    accessToken: string
  ): Promise<any> {
    // Check cache first
    const cached = await this.getCachedActivity(activityId);

    if (cached && !this.isExpired(cached.expires_at)) {
      console.log(`✅ Cache HIT for activity ${activityId}`);
      return cached.data;
    }

    console.log(`❌ Cache MISS for activity ${activityId} - fetching from API`);

    // Fetch from Strava API
    const activity = await this.fetchFromStrava(activityId, accessToken);

    // Cache it
    await this.cacheActivity(activityId, activity);

    return activity;
  }

  /**
   * Get cached activity from database
   */
  private async getCachedActivity(
    activityId: number
  ): Promise<CachedActivity | null> {
    try {
      const { data, error } = await supabase
        .from("strava_activity_cache")
        .select("*")
        .eq("activity_id", activityId)
        .single();

      if (error || !data) return null;

      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  /**
   * Fetch activity from Strava API
   */
  private async fetchFromStrava(
    activityId: number,
    accessToken: string
  ): Promise<any> {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch activity: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Cache activity in database
   */
  private async cacheActivity(activityId: number, data: any): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_DURATION_MS);

    try {
      await supabase.from("strava_activity_cache").upsert(
        {
          activity_id: activityId,
          data,
          cached_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "activity_id" }
      );

      console.log(
        `💾 Cached activity ${activityId} until ${expiresAt.toISOString()}`
      );
    } catch (error) {
      console.error("Failed to cache activity:", error);
    }
  }

  /**
   * Invalidate cache for an activity
   */
  async invalidateActivity(activityId: number): Promise<void> {
    await supabase
      .from("strava_activity_cache")
      .delete()
      .eq("activity_id", activityId);

    console.log(`🗑️ Invalidated cache for activity ${activityId}`);
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpired(): Promise<number> {
    const { data, error } = await supabase
      .from("strava_activity_cache")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select();

    const deletedCount = data?.length || 0;
    console.log(`🧹 Cleaned up ${deletedCount} expired cache entries`);

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    total: number;
    valid: number;
    expired: number;
  }> {
    const now = new Date().toISOString();

    const { count: total } = await supabase
      .from("strava_activity_cache")
      .select("*", { count: "exact", head: true });

    const { count: valid } = await supabase
      .from("strava_activity_cache")
      .select("*", { count: "exact", head: true })
      .gte("expires_at", now);

    return {
      total: total || 0,
      valid: valid || 0,
      expired: (total || 0) - (valid || 0),
    };
  }
}

// Singleton instance
export const activityCache = new StravaActivityCache();

// ============================================
// SQL MIGRATION - Run this in Supabase
// ============================================

/*
-- Create activity cache table
CREATE TABLE IF NOT EXISTS strava_activity_cache (
  activity_id BIGINT PRIMARY KEY,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX idx_cache_expires ON strava_activity_cache(expires_at);

-- Auto-cleanup old entries (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM strava_activity_cache
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
*/
