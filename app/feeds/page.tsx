"use client";

import { useEffect, useState } from "react";
import {
  Heart,
  MessageCircle,
  Calendar,
  TrendingUp,
  Clock,
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

type FeedPost = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  users: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  activities?: {
    id: string;
    distance_km: number;
    duration_seconds: number;
    pace_min_per_km: number;
    activity_date: string;
    events: {
      name: string;
    };
  };
};

export default function FeedPage() {
  const { user } = useAuth();
  const supabase = createSupabaseClient();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFeed();
    if (user) {
      loadUserLikes();
    }
  }, [user]);

  const loadFeed = async () => {
    try {
      // Get recent activities from all users
      const { data: activities, error } = await supabase
        .from("activities")
        .select(
          `
          id,
          user_id,
          distance_km,
          duration_seconds,
          pace_min_per_km,
          activity_date,
          description,
          created_at,
          events!inner(name),
          users!activities_user_id_fkey(username, full_name, avatar_url)
        `
        )
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      // Check if posts exist for these activities
      const feedPosts = await Promise.all(
        (activities || []).map(async (activity) => {
          // Check if post exists
          let { data: post } = await supabase
            .from("posts")
            .select("*")
            .eq("activity_id", activity.id)
            .single();

          // Create post if doesn't exist
          if (!post) {
            const content = `đã hoàn thành ${activity.distance_km.toFixed(2)} km trong sự kiện ${activity.events.name}`;
            const { data: newPost } = await supabase
              .from("posts")
              .insert([
                {
                  user_id: activity.user_id,
                  activity_id: activity.id,
                  content,
                },
              ])
              .select()
              .single();
            post = newPost;
          }

          return {
            ...post,
            users: activity.users,
            activities: {
              ...activity,
              events: activity.events,
            },
          };
        })
      );

      setPosts(feedPosts.filter(Boolean));
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserLikes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const liked = new Set((data || []).map((l) => l.post_id));
      setLikedPosts(liked);
    } catch (error) {
      console.error("Error loading likes:", error);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;

    try {
      if (likedPosts.has(postId)) {
        // Unlike
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        await supabase.rpc("decrement_likes", { post_id: postId });

        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });

        setPosts(
          posts.map((p) =>
            p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p
          )
        );
      } else {
        // Like
        await supabase
          .from("likes")
          .insert([{ post_id: postId, user_id: user.id }]);

        await supabase.rpc("increment_likes", { post_id: postId });

        setLikedPosts((prev) => new Set(prev).add(postId));

        setPosts(
          posts.map((p) =>
            p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
          )
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bảng tin</h1>
        <p className="text-gray-600">Hoạt động mới nhất của cộng đồng</p>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md p-6 animate-pulse"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Chưa có hoạt động nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* User Info */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                  {post.users.avatar_url ? (
                    <img
                      src={post.users.avatar_url}
                      alt={post.users.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-bold text-lg">
                      {post.users.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {post.users.username}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(post.created_at), "dd/MM/yyyy HH:mm", {
                      locale: vi,
                    })}
                  </p>
                </div>
              </div>

              {/* Content */}
              <p className="text-gray-700 mb-4">{post.content}</p>

              {/* Activity Card */}
              {post.activities && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {post.activities.events.name}
                      </span>
                    </div>
                    <span className="text-xs text-blue-700">
                      {format(
                        new Date(post.activities.activity_date),
                        "dd/MM/yyyy",
                        { locale: vi }
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Khoảng cách</p>
                      <p className="text-lg font-bold text-blue-900">
                        {post.activities.distance_km.toFixed(2)} km
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Thời gian</p>
                      <p className="text-lg font-bold text-blue-900">
                        {formatDuration(post.activities.duration_seconds)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Pace</p>
                      <p className="text-lg font-bold text-blue-900">
                        {post.activities.pace_min_per_km
                          ? post.activities.pace_min_per_km.toFixed(2)
                          : "-"}{" "}
                        min/km
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-6 pt-3 border-t">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center space-x-2 transition-colors ${
                    likedPosts.has(post.id)
                      ? "text-red-600"
                      : "text-gray-600 hover:text-red-600"
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 ${likedPosts.has(post.id) ? "fill-current" : ""}`}
                  />
                  <span className="text-sm font-medium">
                    {post.likes_count}
                  </span>
                </button>

                <div className="flex items-center space-x-2 text-gray-600">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {post.comments_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
