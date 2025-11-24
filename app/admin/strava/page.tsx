"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Webhook,
} from "lucide-react";

export default function AdminStravaPage() {
  const [webhookStatus, setWebhookStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    checkWebhookStatus();
  }, []);

  const checkWebhookStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/strava-webhook");
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        setWebhookStatus(data.data[0]);
      } else {
        setWebhookStatus(null);
      }
    } catch (error) {
      console.error("Error checking webhook:", error);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/strava-webhook", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Webhook đã được tạo thành công!",
        });
        await checkWebhookStatus();
      } else {
        setMessage({
          type: "error",
          text: data.error || "Không thể tạo webhook",
        });
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteWebhook = async () => {
    if (!webhookStatus?.id) return;

    if (!confirm("Bạn có chắc muốn xóa webhook subscription?")) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/strava-webhook?id=${webhookStatus.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Webhook đã được xóa!" });
        setWebhookStatus(null);
      } else {
        setMessage({
          type: "error",
          text: data.error || "Không thể xóa webhook",
        });
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const syncActivities = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/strava/sync-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: 1,
          perPage: 50,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Đã đồng bộ ${data.data.running} hoạt động chạy bộ từ ${data.data.total} hoạt động!`,
        });
      } else {
        setMessage({ type: "error", text: data.error || "Không thể đồng bộ" });
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cấu hình Strava</h1>
        <p className="text-gray-600 mt-1">Quản lý tích hợp Strava và webhook</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Webhook Status */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Webhook className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Webhook Status</h2>
          </div>
          <button
            onClick={checkWebhookStatus}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading && !webhookStatus ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : webhookStatus ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Webhook đang hoạt động</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subscription ID:</span>
                <span className="font-mono">{webhookStatus.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Callback URL:</span>
                <span className="font-mono text-sm">
                  {webhookStatus.callback_url}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span>
                  {new Date(webhookStatus.created_at * 1000).toLocaleString(
                    "vi-VN"
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={deleteWebhook}
              disabled={loading}
              className="w-full py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Xóa Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Chưa có webhook</span>
            </div>

            <p className="text-gray-600 text-sm">
              Webhook cho phép hệ thống tự động nhận thông báo khi có hoạt động
              mới trên Strava.
            </p>

            <button
              onClick={createWebhook}
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Tạo Webhook
            </button>
          </div>
        )}
      </div>

      {/* Manual Sync */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Activity className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Đồng bộ thủ công</h2>
        </div>

        <p className="text-gray-600 mb-4">
          Đồng bộ các hoạt động chạy bộ gần đây từ Strava của bạn vào hệ thống.
        </p>

        <button
          onClick={syncActivities}
          disabled={syncing}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
        >
          {syncing ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Đang đồng bộ...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5" />
              <span>Đồng bộ hoạt động</span>
            </>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">Hướng dẫn cấu hình</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
          <li>
            Đảm bảo bạn đã tạo Strava API Application tại{" "}
            <a
              href="https://www.strava.com/settings/api"
              target="_blank"
              className="underline"
            >
              strava.com/settings/api
            </a>
          </li>
          <li>Thêm Client ID và Client Secret vào file .env.local</li>
          <li>
            Đảm bảo webhook callback URL có thể truy cập từ internet (sử dụng
            ngrok cho local development)
          </li>
          <li>Nhấn "Tạo Webhook" để kích hoạt tự động đồng bộ</li>
          <li>
            Tất cả hoạt động chạy bộ mới sẽ tự động được đồng bộ về hệ thống
          </li>
        </ol>
      </div>
    </div>
  );
}
