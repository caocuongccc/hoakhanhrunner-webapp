"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleStravaLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=auto&scope=read,activity:read_all,activity:write,profile:read_all`;

    window.location.href = authUrl;
  };

  useEffect(() => {
    // Check if user just authenticated successfully
    if (searchParams.get("auth") === "success") {
      router.push("/");
    }
  }, [searchParams, router]);

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "no_code":
        return "Không nhận được mã xác thực từ Strava";
      case "insufficient_scope":
        return "Bạn cần cấp đầy đủ quyền truy cập để sử dụng ứng dụng";
      case "user_creation_failed":
        return "Không thể tạo tài khoản. Vui lòng thử lại";
      case "callback_failed":
        return "Đăng nhập thất bại. Vui lòng thử lại";
      default:
        return errorCode ? `Lỗi: ${errorCode}` : null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Activity className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Đăng nhập</h2>
          <p className="mt-2 text-gray-600">Kết nối với Strava để bắt đầu</p>
        </div>

        {/* Login Form */}
        <div className="bg-white p-8 rounded-xl shadow-md space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{getErrorMessage(error)}</span>
            </div>
          )}

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

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Tại sao cần kết nối Strava?
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Tự động đồng bộ hoạt động chạy bộ của bạn</li>
              <li>• Không cần nhập dữ liệu thủ công</li>
              <li>• Theo dõi tiến độ trong các sự kiện</li>
              <li>• Chia sẻ thành tích với cộng đồng</li>
            </ul>
          </div>

          {/* Privacy Notice */}
          <p className="text-xs text-gray-500 text-center">
            Chúng tôi chỉ truy cập hoạt động chạy bộ của bạn. Dữ liệu của bạn
            được bảo mật và không chia sẻ với bên thứ ba.
          </p>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-600">
          <p>
            Chưa có tài khoản Strava?{" "}
            <a
              href="https://www.strava.com/register"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Đăng ký tại đây
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
