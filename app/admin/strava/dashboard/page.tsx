// app/admin/strava/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Zap,
  RefreshCw,
} from "lucide-react";

type CacheStats = {
  total: number;
  valid: number;
  expired: number;
  hitRate: number;
};

type RateLimitStatus = {
  used: number;
  limit: number;
  percentage: number;
  resetTime?: string;
};

export default function StravaDashboardPage() {
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    total: 0,
    valid: 0,
    expired: 0,
    hitRate: 0,
  });

  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({
    used: 0,
    limit: 90,
    percentage: 0,
  });

  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      const cacheResponse = await fetch("/api/strava/cache-stats");
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        setCacheStats(cacheData);
      }

      const rateLimitResponse = await fetch("/api/strava/rate-limit-status");
      if (rateLimitResponse.ok) {
        const rateLimitData = await rateLimitResponse.json();
        setRateLimitStatus(rateLimitData);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanCache = async () => {
    if (!confirm("Xóa tất cả cache entries đã hết hạn?")) return;

    setCleaning(true);
    try {
      const response = await fetch("/api/strava/clean-cache", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Đã xóa ${data.deleted} cache entries`);
        loadStats();
      } else {
        alert("❌ Không thể xóa cache");
      }
    } catch (error) {
      console.error("Clean cache error:", error);
      alert("❌ Lỗi khi xóa cache");
    } finally {
      setCleaning(false);
    }
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage < 60)
      return { icon: CheckCircle, label: "Healthy", color: "green" };
    if (percentage < 80)
      return { icon: AlertCircle, label: "Warning", color: "yellow" };
    return { icon: AlertCircle, label: "Critical", color: "red" };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Strava Performance Monitor
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const usageStatus = getUsageStatus(rateLimitStatus.percentage);
  const StatusIcon = usageStatus.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Strava Performance Monitor
        </h1>
        <p className="text-gray-600 mt-1">
          Theo dõi cache performance và rate limit usage
        </p>
      </div>

      {/* Rate Limit Monitor */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">
              Strava API Rate Limit
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 text-${usageStatus.color}-600`} />
            <span
              className={`text-sm font-medium text-${usageStatus.color}-600`}
            >
              {usageStatus.label}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              15-minute Window Usage
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {rateLimitStatus.used}/{rateLimitStatus.limit}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                rateLimitStatus.percentage < 60
                  ? "bg-green-500"
                  : rateLimitStatus.percentage < 80
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${rateLimitStatus.percentage}%` }}
            ></div>
          </div>

          <p className="text-xs text-gray-500">
            {rateLimitStatus.percentage.toFixed(1)}% of limit used
          </p>
        </div>

        {rateLimitStatus.percentage > 80 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  ⚠️ Rate Limit Warning
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Đang ở {rateLimitStatus.percentage.toFixed(0)}% giới hạn.
                  Requests mới sẽ được queue.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cache Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-900">
              Activity Cache Performance
            </h3>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Total Cached</p>
            <p className="text-2xl font-bold text-gray-900">
              {cacheStats.total}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-700 mb-1">Valid</p>
            <p className="text-2xl font-bold text-green-600">
              {cacheStats.valid}
            </p>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-xs text-red-700 mb-1">Expired</p>
            <p className="text-2xl font-bold text-red-600">
              {cacheStats.expired}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-700 mb-1">Hit Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {cacheStats.hitRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleCleanCache}
            disabled={cleaning || cacheStats.expired === 0}
            className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cleaning ? "Đang xóa..." : `Xóa ${cacheStats.expired} Expired`}
          </button>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-bold text-gray-900 mb-4">📊 Cache System Impact</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">API Calls Saved (24h)</p>
            <p className="text-3xl font-bold text-green-600">
              ~{Math.floor((cacheStats.hitRate / 100) * cacheStats.total)}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Cache Efficiency</p>
            <p className="text-3xl font-bold text-blue-600">
              {cacheStats.hitRate.toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Rate Limit Buffer</p>
            <p className="text-3xl font-bold text-purple-600">
              {rateLimitStatus.limit - rateLimitStatus.used}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
