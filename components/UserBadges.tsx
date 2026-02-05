// components/UserBadges.tsx
// Display user's earned badges

"use client";

import { useEffect, useState } from "react";
import { Award, Lock } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge_type: string;
  earned?: boolean;
  earned_at?: string;
  event_name?: string;
}

type UserBadgesProps = {
  userId?: string; // If not provided, shows current user's badges
  eventId?: string; // If provided, filters badges for this event
  showLocked?: boolean; // Show locked badges that can be earned
};

export default function UserBadges({
  userId,
  eventId,
  showLocked = true,
}: UserBadgesProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId, eventId]);

  const fetchBadges = async () => {
    try {
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (eventId) params.append("eventId", eventId);
      if (showLocked) params.append("showLocked", "true");

      const response = await fetch(`/api/badges?${params.toString()}`);
      const data = await response.json();

      setBadges(data.badges || []);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Award className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Huy hiệu ({earnedBadges.length})
          </h3>
        </div>
      </div>

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Đã đạt được
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4 text-center hover:shadow-lg transition-all transform hover:scale-105"
              >
                <div className="text-5xl mb-2">{badge.icon}</div>
                <h5 className="font-bold text-gray-900 mb-1">{badge.name}</h5>
                <p className="text-xs text-gray-600 mb-2">
                  {badge.description}
                </p>
                {badge.event_name && (
                  <div className="text-xs text-blue-600 font-medium">
                    📍 {badge.event_name}
                  </div>
                )}
                {badge.earned_at && (
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(badge.earned_at).toLocaleDateString("vi-VN")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {showLocked && lockedBadges.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Có thể đạt được
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lockedBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-gray-100 border-2 border-gray-300 rounded-xl p-4 text-center opacity-60 hover:opacity-80 transition-opacity"
              >
                <div className="relative">
                  <div className="text-5xl mb-2 filter grayscale">
                    {badge.icon}
                  </div>
                  <Lock className="absolute top-0 right-0 h-4 w-4 text-gray-500" />
                </div>
                <h5 className="font-bold text-gray-700 mb-1">{badge.name}</h5>
                <p className="text-xs text-gray-600">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {earnedBadges.length === 0 && (
        <div className="text-center py-12">
          <Award className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">Chưa có huy hiệu nào</p>
          <p className="text-sm text-gray-400">
            Hoàn thành sự kiện để nhận huy hiệu đầu tiên!
          </p>
        </div>
      )}
    </div>
  );
}
