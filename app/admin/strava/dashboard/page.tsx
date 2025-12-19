import React, { useState, useEffect } from "react";
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function StravaMonitoringDashboard() {
  const [stats, setStats] = useState({
    currentUsage: { used: 0, limit: 90, percentage: 0 },
    cacheStats: { total: 0, valid: 0, expired: 0, hitRate: 0 },
    queueStatus: { pending: 0, processing: false },
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      // Simulate API calls - replace with real endpoints
      setStats({
        currentUsage: {
          used: Math.floor(Math.random() * 90),
          limit: 90,
          percentage: Math.random() * 100,
        },
        cacheStats: {
          total: 1234,
          valid: 1150,
          expired: 84,
          hitRate: 78.5,
        },
        queueStatus: {
          pending: Math.floor(Math.random() * 10),
          processing: Math.random() > 0.5,
        },
      });
      setLoading(false);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage < 60) return "text-green-600 bg-green-50";
    if (percentage < 80) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getUsageStatus = (percentage) => {
    if (percentage < 60)
      return { icon: CheckCircle, label: "Healthy", color: "green" };
    if (percentage < 80)
      return { icon: AlertCircle, label: "Warning", color: "yellow" };
    return { icon: AlertCircle, label: "Critical", color: "red" };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const usageStatus = getUsageStatus(stats.currentUsage.percentage);
  const StatusIcon = usageStatus.icon;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">
            Strava API Monitor
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 text-${usageStatus.color}-600`} />
          <span className={`text-sm font-medium text-${usageStatus.color}-600`}>
            {usageStatus.label}
          </span>
        </div>
      </div>

      {/* Rate Limit Usage */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Rate Limit Usage (15 min window)
          </span>
          <span className="text-2xl font-bold text-gray-900">
            {stats.currentUsage.used}/{stats.currentUsage.limit}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              stats.currentUsage.percentage < 60
                ? "bg-green-500"
                : stats.currentUsage.percentage < 80
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${stats.currentUsage.percentage}%` }}
          ></div>
        </div>

        <p className="text-xs text-gray-500">
          {stats.currentUsage.percentage.toFixed(1)}% of limit used
        </p>
      </div>

      {/* Cache Statistics */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          Cache Performance
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Total Cached</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.cacheStats.total}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-700 mb-1">Hit Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.cacheStats.hitRate}%
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-700 mb-1">Valid Entries</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.cacheStats.valid}
            </p>
          </div>

          <div className="bg-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Expired</p>
            <p className="text-2xl font-bold text-gray-700">
              {stats.cacheStats.expired}
            </p>
          </div>
        </div>
      </div>

      {/* Request Queue */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          Request Queue
        </h4>

        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-600">Pending Requests</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.queueStatus.pending}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-2">Status</p>
            {stats.queueStatus.processing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-blue-600">
                  Processing
                </span>
              </div>
            ) : (
              <span className="text-sm font-medium text-green-600">Idle</span>
            )}
          </div>
        </div>
      </div>

      {/* Estimated Savings */}
      <div className="border-t pt-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">
          💰 Optimization Impact
        </h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">API Calls Saved (24h):</span>
            <span className="font-bold text-green-600">
              ~
              {Math.floor(
                (stats.cacheStats.hitRate / 100) * stats.cacheStats.total
              )}{" "}
              requests
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cache Hit Rate:</span>
            <span className="font-bold text-blue-600">
              {stats.cacheStats.hitRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t pt-4 flex gap-3">
        <button
          onClick={() => {
            // Add cleanup logic
            alert("🧹 Cleaning up expired cache entries...");
          }}
          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          Clean Cache
        </button>
        <button
          onClick={loadStats}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
        >
          Refresh Stats
        </button>
      </div>

      {/* Warning if near limit */}
      {stats.currentUsage.percentage > 80 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Rate Limit Warning
              </p>
              <p className="text-xs text-red-700 mt-1">
                You're at {stats.currentUsage.percentage.toFixed(0)}% of your
                rate limit. New requests will be queued to avoid hitting the
                limit.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
