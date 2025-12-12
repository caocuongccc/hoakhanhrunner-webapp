// app/privacy/page.tsx
"use client";

import { Shield, Lock, Eye, Database, Users, Mail } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Quay lại trang chủ
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-10 w-10 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900">
            Chính sách bảo mật
          </h1>
        </div>
        <p className="text-gray-600">
          Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}
        </p>
      </div>

      <div className="prose prose-lg max-w-none space-y-8">
        {/* Introduction */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" />
            Giới thiệu
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Running Club ("chúng tôi", "của chúng tôi") cam kết bảo vệ quyền
            riêng tư của bạn. Chính sách bảo mật này giải thích cách chúng tôi
            thu thập, sử dụng, chia sẻ và bảo vệ thông tin cá nhân của bạn khi
            bạn sử dụng dịch vụ của chúng tôi.
          </p>
        </section>

        {/* Data Collection */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            Thông tin chúng tôi thu thập
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">
                1. Thông tin từ Strava
              </h3>
              <p className="text-gray-700 mb-2">
                Khi bạn kết nối với Strava, chúng tôi thu thập:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Tên, ảnh đại diện, email</li>
                <li>
                  Hoạt động chạy bộ (khoảng cách, thời gian, pace, GPS route)
                </li>
                <li>Best efforts và personal records</li>
                <li>Thống kê hoạt động (tổng km, số lần chạy)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">
                2. Thông tin sử dụng
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Sự kiện bạn tham gia</li>
                <li>Đội bạn tham gia (nếu có)</li>
                <li>Thành tích và xếp hạng</li>
                <li>Tương tác với nội dung (likes, comments)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Use Data */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Cách chúng tôi sử dụng thông tin
          </h2>

          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Tạo và quản lý tài khoản của bạn</li>
            <li>Hiển thị hoạt động và thống kê của bạn</li>
            <li>Tính điểm và xếp hạng trong sự kiện</li>
            <li>Tạo chứng chỉ hoàn thành sự kiện</li>
            <li>Cải thiện và phát triển dịch vụ</li>
            <li>Gửi thông báo quan trọng về sự kiện</li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            Chia sẻ thông tin
          </h2>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mb-2">
                ✅ Thông tin được hiển thị công khai:
              </h3>
              <ul className="list-disc list-inside text-green-800 space-y-1 ml-4">
                <li>Tên, ảnh đại diện</li>
                <li>Hoạt động chạy bộ và thống kê</li>
                <li>Xếp hạng trong sự kiện</li>
                <li>Personal records (nếu bạn chia sẻ)</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-900 mb-2">
                🔒 Thông tin KHÔNG chia sẻ:
              </h3>
              <ul className="list-disc list-inside text-red-800 space-y-1 ml-4">
                <li>Thông tin liên hệ cá nhân (email, số điện thoại)</li>
                <li>Strava access tokens</li>
                <li>Thông tin thanh toán (nếu có)</li>
                <li>Dữ liệu với bên thứ ba không được phép</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Strava Integration */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Tích hợp Strava
          </h2>

          <div className="space-y-4">
            <p className="text-gray-700">
              Hoa Khanh Runners Club sử dụng Strava API và tuân thủ{" "}
              <a
                href="https://www.strava.com/legal/api"
                target="_blank"
                className="text-blue-600 underline hover:text-blue-700"
              >
                Strava API Agreement
              </a>
              .
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 font-medium mb-2">Quyền của bạn:</p>
              <ul className="list-disc list-inside text-blue-800 space-y-1 ml-4">
                <li>
                  Bạn có thể thu hồi quyền truy cập bất cứ lúc nào tại{" "}
                  <a
                    href="https://www.strava.com/settings/apps"
                    target="_blank"
                    className="underline hover:text-blue-900"
                  >
                    Strava Settings → Apps
                  </a>
                </li>
                <li>
                  Khi thu hồi, chúng tôi sẽ không thể truy cập hoạt động mới
                </li>
                <li>Dữ liệu đã đồng bộ trước đó vẫn được giữ lại</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Security */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bảo mật dữ liệu
          </h2>

          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Sử dụng mã hóa HTTPS cho tất cả kết nối</li>
            <li>Lưu trữ dữ liệu trên Supabase (platform bảo mật cao)</li>
            <li>Access tokens được mã hóa</li>
            <li>Không lưu mật khẩu (chỉ dùng OAuth)</li>
            <li>Định kỳ kiểm tra bảo mật hệ thống</li>
          </ul>
        </section>

        {/* Your Rights */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Quyền của bạn
          </h2>

          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>
              <strong>Truy cập:</strong> Xem dữ liệu cá nhân của bạn
            </li>
            <li>
              <strong>Chỉnh sửa:</strong> Cập nhật thông tin cá nhân
            </li>
            <li>
              <strong>Xóa:</strong> Yêu cầu xóa tài khoản và dữ liệu
            </li>
            <li>
              <strong>Xuất dữ liệu:</strong> Tải xuống dữ liệu của bạn
            </li>
            <li>
              <strong>Thu hồi quyền:</strong> Ngắt kết nối với Strava bất cứ lúc
              nào
            </li>
          </ul>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Liên hệ
          </h2>

          <p className="text-gray-700 mb-4">
            Nếu bạn có câu hỏi về chính sách bảo mật này, vui lòng liên hệ:
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-gray-700">
              <strong>Email:</strong>{" "}
              <a
                href="mailto:hoakhanhrunners@gmail.com"
                className="text-blue-600 underline"
              >
                hoakhanhrunners@gmail.com
              </a>
            </p>
            <p className="text-gray-700">
              <strong>Website:</strong>{" "}
              <a
                href="https://hoakhanhrunners.vercel.app/"
                className="text-blue-600 underline"
              >
                https://hoakhanhrunners.vercel.app
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
