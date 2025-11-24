import { supabase } from "./supabase";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_AUTH_BASE = "https://www.strava.com/oauth";

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

export type StravaAthlete = {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  weight: number;
};

export type StravaActivity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: {
    id: string;
    summary_polyline: string;
    polyline: string;
  };
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate: boolean;
};

/**
 * Get Strava OAuth authorization URL
 */
export function getStravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI!,
    response_type: "code",
    scope: "read,activity:read_all,activity:write,profile:read_all",
    approval_prompt: "auto",
  });

  return `${STRAVA_AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeStravaCode(code: string): Promise<{
  tokens: StravaTokens;
  athlete: StravaAthlete;
}> {
  const response = await fetch(`${STRAVA_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  const data = await response.json();

  return {
    tokens: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    },
    athlete: data.athlete,
  };
}

/**
 * Refresh Strava access token
 */
export async function refreshStravaToken(
  refreshToken: string
): Promise<StravaTokens> {
  const response = await fetch(`${STRAVA_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
}

/**
 * Get valid access token for user (refresh if needed)
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from("users")
    .select(
      "strava_access_token, strava_refresh_token, strava_token_expires_at"
    )
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new Error("User not found");
  }

  const expiresAt = new Date(user.strava_token_expires_at).getTime();
  const now = Date.now();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt - now < 5 * 60 * 1000) {
    const newTokens = await refreshStravaToken(user.strava_refresh_token);

    // Update tokens in database
    await supabase
      .from("users")
      .update({
        strava_access_token: newTokens.access_token,
        strava_refresh_token: newTokens.refresh_token,
        strava_token_expires_at: new Date(
          newTokens.expires_at * 1000
        ).toISOString(),
      })
      .eq("id", userId);

    return newTokens.access_token;
  }

  return user.strava_access_token;
}

/**
 * Fetch athlete activities from Strava
 */
export async function fetchStravaActivities(
  accessToken: string,
  after?: number,
  before?: number,
  page: number = 1,
  perPage: number = 30
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  if (after) params.append("after", after.toString());
  if (before) params.append("before", before.toString());

  const response = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch activities");
  }

  return response.json();
}

/**
 * Fetch detailed activity from Strava
 */
export async function fetchStravaActivity(
  activityId: number,
  accessToken: string
): Promise<StravaActivity> {
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch activity details");
  }

  return response.json();
}

/**
 * Get athlete profile from Strava
 */
export async function fetchStravaAthlete(
  accessToken: string
): Promise<StravaAthlete> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch athlete profile");
  }

  return response.json();
}

/**
 * Subscribe to Strava webhook
 */
export async function subscribeToStravaWebhook(
  callbackUrl: string,
  verifyToken: string
): Promise<any> {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
    callback_url: callbackUrl,
    verify_token: verifyToken,
  });

  const response = await fetch(`${STRAVA_API_BASE}/push_subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to subscribe to webhook: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * View current webhook subscription
 */
export async function viewWebhookSubscription(): Promise<any> {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
  });

  const response = await fetch(
    `${STRAVA_API_BASE}/push_subscriptions?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to view webhook subscription");
  }

  return response.json();
}

/**
 * Delete webhook subscription
 */
export async function deleteWebhookSubscription(
  subscriptionId: number
): Promise<void> {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
  });

  const response = await fetch(
    `${STRAVA_API_BASE}/push_subscriptions/${subscriptionId}?${params.toString()}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete webhook subscription");
  }
}
