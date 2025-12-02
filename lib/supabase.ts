import { createClient } from "@supabase/supabase-js";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// For server-side
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// For client-side components
export const createSupabaseClient = () => {
  return createClientComponentClient();
};

// Database types
export type User = {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  full_name?: string;
  bio?: string;
  pr_5k?: string;
  pr_10k?: string;
  pr_hm?: string;
  pr_fm?: string;
  created_at: string;
  updated_at: string;
};

export type EventType = "team" | "individual";
// UPDATED: Status is now ENUM type
export type EventStatus = "pending" | "active" | "completed" | "cancelled";

export type Event = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  password?: string;
  max_team_members?: number;
  max_teams?: number;
  created_by?: string | null; // Now nullable
  created_by_admin_email?: string | null; // Track admin creator
  status: EventStatus; // ENUM type
  created_at: string;
  updated_at: string;
};

export type Rule = {
  id: string;
  name: string;
  description?: string;
  rule_type: string;
  config: Record<string, any>;
  created_at: string;
};

export type Team = {
  id: string;
  event_id: string;
  name: string;
  captain_id: string;
  total_points: number;
  created_at: string;
  updated_at: string;
};

export type Activity = {
  id: string;
  user_id: string;
  event_id: string;
  activity_date: string;
  distance_km: number;
  duration_seconds?: number;
  pace_min_per_km?: number;
  route_data?: any;
  image_url?: string;
  description?: string;
  points_earned: number;
  rules_passed?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  activity_id?: string;
  content?: string;
  image_urls?: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
};
