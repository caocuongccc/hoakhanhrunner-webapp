// components/UserTracklogModal.tsx
// Full-screen modal to view user's complete tracklog

"use client";

import { useEffect, useState } from "react";
import {
  X,
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  Activity,
  Award,
} from "lucide-react";
import { formatTime } from "@/lib/utils";

interface ActivityData {
  id: string;
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  average_speed: number;
  max_speed: number;
  total_elevation_gain: number;
  map?: {
    summary_polyline?: string;
  };
}

interface TracklogData {
  event: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  };
  userId: string;
  activities: ActivityData[];
  stats: {
    totalActivities: number;
    totalDistance: number;
    totalMovingTime: number;
    uniqueDays: number;
    averageDistance: number;
    averagePace: number;
  };
}

type UserTracklogModalProps = {
  eventId: string;
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function UserTracklogModal({
  eventId,
  userId,
  userName,
  isOpen,
  onClose,
}: UserTracklogModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TracklogData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTracklog();
    }
  }, [isOpen, eventId, userId]);

  const fetchTracklog = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/events/${eventId}/activities?userId=${userId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tracklog");
      }

      const result = await response.json();
      console.log("Tracklog data fetched:", result);
      setData(result);
    } catch (err: any) {
      console.error("Error fetching tracklog:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const formatPace = (distanceMeters: number, movingTimeSeconds: number) => {
    if (distanceMeters === 0 || movingTimeSeconds === 0) return "N/A";
    const paceSeconds = (movingTimeSeconds / distanceMeters) * 1000;
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  Tracklog của {userName}
                </h2>
                {data && (
                  <p className="text-blue-100 text-sm">{data.event.name}</p>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Stats Summary */}
            {data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">
                    {data.stats.totalActivities}
                  </div>
                  <div className="text-xs text-blue-100">Hoạt động</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">
                    {data.stats.totalDistance.toFixed(1)}
                  </div>
                  <div className="text-xs text-blue-100">Tổng km</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">
                    {data.stats.uniqueDays}
                  </div>
                  <div className="text-xs text-blue-100">Ngày chạy</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">
                    {/* {data.stats.averagePace.toFixed(1)} */}
                    {Math.floor(data.stats.averagePace)}:
                    {Math.round((data.stats.averagePace % 1) * 60)
                      .toString()
                      .padStart(2, "0")}{" "}
                  </div>
                  <div className="text-xs text-blue-100">Pace TB (min/km)</div>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-250px)] p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-2">Lỗi: {error}</div>
                <button
                  onClick={fetchTracklog}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Thử lại
                </button>
              </div>
            )}

            {data && data.activities.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Chưa có hoạt động nào</p>
              </div>
            )}

            {data && data.activities.length > 0 && (
              <div className="space-y-4">
                {data.activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">
                          {activity.name || `Hoạt động #${index + 1}`}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(
                                activity.activity_date,
                              ).toLocaleDateString("vi-VN", {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {new Date(
                                activity.activity_date,
                              ).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {activity.distance_km.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-600">km</div>
                      </div>
                    </div>

                    {/* Activity Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">
                          Thời gian
                        </div>
                        <div className="font-semibold text-gray-900">
                          {formatTime(Math.floor(activity.duration_seconds))}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">
                          Pace TB
                        </div>
                        <div className="font-semibold text-gray-900">
                          {/* {activity.distance_km > 0
                            ? activity.pace_min_per_km.toFixed(1)
                            : "0.0"}{" "}
                          min/km */}
                          {formatPace(
                            activity.distance_km * 1000,
                            activity.duration_seconds,
                          )}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">
                          Tốc độ TB
                        </div>
                        <div className="font-semibold text-gray-900">
                          {formatPace(
                            activity.distance_km * 1000,
                            activity.duration_seconds,
                          )}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Độ cao</div>
                        <div className="font-semibold text-gray-900">
                          {activity.total_elevation_gain?.toFixed(0) || 0} m
                        </div>
                      </div>
                    </div>

                    {/* Map Preview (if available) */}
                    {activity.map?.summary_polyline && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center space-x-2 text-sm text-blue-600">
                          <MapPin className="h-4 w-4" />
                          <span>Có bản đồ tracklog</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {data && data.activities.length > 0 && (
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  Tổng cộng {data.activities.length} hoạt động •{" "}
                  {data.stats.totalDistance.toFixed(2)} km
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="text-gray-700 font-medium">
                    Trung bình {data.stats.averageDistance.toFixed(2)} km/ngày
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
