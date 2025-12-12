// components/WebhookStatusChecker.tsx - Add to admin dashboard
"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

type WebhookStatus = {
  isRegistered: boolean;
  subscriptionId?: number;
  callbackUrl?: string;
  createdAt?: string;
  isWorking?: boolean;
  lastEvent?: string;
};

export default function WebhookStatusChecker() {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkWebhookStatus();
  }, []);

  const checkWebhookStatus = async () => {
    setLoading(true);
    try {
      // Check if webhook is registered with Strava
      const response = await fetch("/api/admin/strava-webhook");
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        const subscription = data.data[0];

        // Check last webhook event
        const eventsResponse = await fetch("/api/admin/webhook-events?limit=1");
        const eventsData = await eventsResponse.json();

        setStatus({
          isRegistered: true,
          subscriptionId: subscription.id,
          callbackUrl: subscription.callback_url,
          createdAt: new Date(subscription.created_at * 1000).toISOString(),
          isWorking: eventsData.events?.length > 0,
          lastEvent: eventsData.events?.[0]?.created_at,
        });
      } else {
        setStatus({
          isRegistered: false,
          isWorking: false,
        });
      }
    } catch (error) {
      console.error("Error checking webhook:", error);
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setTesting(true);
    try {
      // Simulate a test by checking if recent activities were synced
      const response = await fetch("/api/strava/sync-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, perPage: 1 }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          "✅ Manual sync works! Check if new activities auto-sync via webhook."
        );
      } else {
        alert("❌ Sync failed: " + data.error);
      }
    } catch (error: any) {
      alert("❌ Test failed: " + error.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Strava Webhook Status
        </h3>
        <button
          onClick={checkWebhookStatus}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Registration Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium text-gray-700">Webhook Registered</span>
          <div className="flex items-center gap-2">
            {status?.isRegistered ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-600 font-medium">Yes</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-600 font-medium">No</span>
              </>
            )}
          </div>
        </div>

        {/* Working Status */}
        {status?.isRegistered && (
          <>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">
                Receiving Events
              </span>
              <div className="flex items-center gap-2">
                {status?.isWorking ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium">Working</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-yellow-600 font-medium">
                      No events yet
                    </span>
                  </>
                )}
              </div>
            </div>

            {status?.lastEvent && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Last Event: </span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(status.lastEvent).toLocaleString("vi-VN")}
                </span>
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Callback URL:</strong>
                <br />
                <code className="text-xs">{status?.callbackUrl}</code>
              </p>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {!status?.isRegistered && (
            <button
              onClick={() => (window.location.href = "/admin/strava")}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Setup Webhook
            </button>
          )}

          <button
            onClick={testWebhook}
            disabled={testing}
            className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Manual Sync"}
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-bold text-yellow-900 mb-2">📖 How to verify:</h4>
          <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
            <li>Go to Strava and upload a new run activity</li>
            <li>Wait 30 seconds</li>
            <li>Check if activity appears in your feed automatically</li>
            <li>
              If not, check webhook events in Supabase:{" "}
              <code>strava_webhook_events</code> table
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
