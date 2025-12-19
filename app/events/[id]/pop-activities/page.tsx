"use client";

import { useEffect, useState } from "react";
import { X, MapPin, Calendar, Clock, TrendingUp, Activity } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import dynamic from "next/dynamic";

// Dynamic import Leaflet để tránh SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

type ActivityLog = {
  id: string;
  activity_date: string;
  distance_km: number;
  duration_seconds: number;
  pace_min_per_km: number;
  route_data: { polyline?: string };
  description: string;
  points_earned: number;
};

type ActivityTracklogModalProps = {
  userId: string;
  username: string;
  eventId: string;
  onClose: () => void;
};

export default function ActivityTracklogModal({
  userId,
  username,
  eventId,
  onClose,
}: ActivityTracklogModalProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(
    null
  );

  useEffect(() => {
    loadActivities();
  }, [userId, eventId]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/events/${eventId}/user-activities?userId=${userId}`
      );

      if (!response.ok) throw new Error("Failed to load activities");

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
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

  const decodePolyline = (polyline: string): [number, number][] => {
    if (!polyline) return [];

    const coordinates: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < polyline.length) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = polyline.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = polyline.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coordinates.push([lat / 1e5, lng / 1e5]);
    }

    return coordinates;
  };

  const renderMap = (activity: ActivityLog) => {
    if (!activity.route_data?.polyline) {
      return (
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Không có dữ liệu route</p>
        </div>
      );
    }

    const coordinates = decodePolyline(activity.route_data.polyline);

    if (coordinates.length === 0) {
      return (
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Không thể hiển thị route</p>
        </div>
      );
    }

    return (
      <MapContainer
        center={coordinates[0]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Polyline positions={coordinates} color="blue" weight={3} />
      </MapContainer>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Hoạt động của {username}
          </h2>
          <p className="text-gray-600 mb-6">
            Tất cả các hoạt động được ghi nhận trong sự kiện này
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Chưa có hoạt động nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activities List */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedActivity?.id === activity.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900">
                        {activity.description || "Chạy bộ"}
                      </h3>
                      <span className="text-sm font-semibold text-blue-600">
                        {activity.points_earned.toFixed(1)} đ
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(
                            new Date(activity.activity_date),
                            "dd/MM/yyyy",
                            { locale: vi }
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{activity.distance_km.toFixed(2)} km</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatDuration(activity.duration_seconds)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>
                            {activity.pace_min_per_km
                              ? activity.pace_min_per_km.toFixed(2)
                              : "-"}{" "}
                            min/km
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Map Preview */}
              <div className="sticky top-4">
                {selectedActivity ? (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4">
                      Route: {selectedActivity.description || "Chạy bộ"}
                    </h3>
                    {renderMap(selectedActivity)}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Ngày chạy:</p>
                          <p className="font-semibold text-gray-900">
                            {format(
                              new Date(selectedActivity.activity_date),
                              "dd/MM/yyyy HH:mm",
                              { locale: vi }
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Khoảng cách:</p>
                          <p className="font-semibold text-gray-900">
                            {selectedActivity.distance_km.toFixed(2)} km
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Thời gian:</p>
                          <p className="font-semibold text-gray-900">
                            {formatDuration(selectedActivity.duration_seconds)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Pace:</p>
                          <p className="font-semibold text-gray-900">
                            {selectedActivity.pace_min_per_km
                              ? selectedActivity.pace_min_per_km.toFixed(2)
                              : "-"}{" "}
                            min/km
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Chọn một hoạt động để xem route
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
