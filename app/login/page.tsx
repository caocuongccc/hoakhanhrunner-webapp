// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    read: true,
    activityRead: true,
    activityWrite: false,
  });

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleStravaLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/strava/callback`;

    // Build scope based on permissions
    let scope = "read,activity:read_all";
    if (permissions.activityWrite) {
      scope += ",activity:write";
    }

    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

    window.location.href = stravaAuthUrl;
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <svg
                className="h-12 w-12 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Chào mừng đến Running Club
          </h2>
          <p className="mt-2 text-gray-600">
            Kết nối với Strava để bắt đầu hành trình chạy bộ của bạn
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8 space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Tham gia sự kiện
                </h3>
                <p className="text-sm text-gray-600">
                  Đăng ký và tham gia các sự kiện chạy bộ cá nhân và đội
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Theo dõi hoạt động
                </h3>
                <p className="text-sm text-gray-600">
                  Tự động đồng bộ các hoạt động chạy bộ từ Strava
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Xếp hạng và phần thưởng
                </h3>
                <p className="text-sm text-gray-600">
                  Cạnh tranh với bạn bè và nhận phần thưởng
                </p>
              </div>
            </div>
          </div>

          {/* Permissions Selection */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Quyền truy cập cần thiết
            </h3>
            <div className="space-y-3 text-sm">
              {/* Read Permission - Always required */}
              <label className="flex items-start space-x-3 cursor-not-allowed opacity-60">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 cursor-not-allowed"
                />
                <div>
                  <strong className="text-blue-900">
                    Đọc thông tin cá nhân (Bắt buộc)
                  </strong>
                  <p className="text-blue-700">
                    Tên, ảnh đại diện để tạo hồ sơ của bạn
                  </p>
                </div>
              </label>

              {/* Activity Read - Always required */}
              <label className="flex items-start space-x-3 cursor-not-allowed opacity-60">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 cursor-not-allowed"
                />
                <div>
                  <strong className="text-blue-900">
                    Đọc hoạt động chạy bộ (Bắt buộc)
                  </strong>
                  <p className="text-blue-700">
                    Xem các hoạt động chạy bộ của bạn để tính điểm sự kiện
                  </p>
                </div>
              </label>

              {/* Activity Write - Optional */}
              <label className="flex items-start space-x-3 cursor-pointer hover:bg-blue-100 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.activityWrite}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      activityWrite: e.target.checked,
                    })
                  }
                  className="mt-1 cursor-pointer"
                />
                <div>
                  <strong className="text-blue-900">
                    Ghi hoạt động (Tùy chọn)
                  </strong>
                  <p className="text-blue-700">
                    Cập nhật mô tả hoạt động với badge sự kiện. Bạn có thể bỏ
                    qua nếu không muốn.
                  </p>
                </div>
              </label>
            </div>
            <p className="text-xs text-blue-700 mt-3 bg-blue-100 p-2 rounded">
              <strong>Lưu ý:</strong> Bạn có thể thu hồi quyền truy cập bất cứ
              lúc nào trong{" "}
              <a
                href="https://www.strava.com/settings/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                cài đặt Strava
              </a>
              .
            </p>
          </div>

          {/* Strava Connect Button */}
          <button
            onClick={handleStravaLogin}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-[#FC4C02] hover:bg-[#E34402] text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            <span>Đăng nhập với Strava</span>
          </button>

          {/* Privacy Note */}
          <p className="text-xs text-gray-500 text-center">
            Bằng cách đăng nhập, bạn đồng ý với{" "}
            <a href="/terms" className="underline">
              Điều khoản sử dụng
            </a>{" "}
            và{" "}
            <a href="/privacy" className="underline">
              Chính sách bảo mật
            </a>
          </p>
        </div>

        {/* Admin Login Link */}
        <div className="text-center">
          <a
            href="/admin-login"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Bạn là quản trị viên?{" "}
            <span className="underline">Đăng nhập tại đây</span>
          </a>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <a
            href="/"
            className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            ← Quay lại trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
