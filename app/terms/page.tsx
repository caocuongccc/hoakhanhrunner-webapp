// app/terms/page.tsx
"use client";

import { FileText, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function TermsOfServicePage() {
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
          <FileText className="h-10 w-10 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900">
            Điều khoản sử dụng
          </h1>
        </div>
        <p className="text-gray-600">
          Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}
        </p>
      </div>

      <div className="prose prose-lg max-w-none space-y-8">
        {/* Acceptance */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            1. Chấp nhận điều khoản
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Bằng việc truy cập và sử dụng Running Club, bạn đồng ý tuân thủ các
            điều khoản này. Nếu bạn không đồng ý, vui lòng không sử dụng dịch vụ
            của chúng tôi.
          </p>
        </section>

        {/* Account */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            2. Tài khoản và đăng ký
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">
                2.1 Yêu cầu tài khoản
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Bạn phải có tài khoản Strava hợp lệ</li>
                <li>
                  Bạn phải từ 13 tuổi trở lên (hoặc theo quy định pháp luật địa
                  phương)
                </li>
                <li>Một người chỉ được tạo một tài khoản</li>
                <li>Thông tin đăng ký phải chính xác và đầy đủ</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">
                2.2 Bảo mật tài khoản
              </h3>
              <p className="text-gray-700">
                Bạn chịu trách nhiệm về mọi hoạt động dưới tài khoản của mình.
                Vui lòng bảo vệ thông tin đăng nhập và thông báo ngay nếu phát
                hiện truy cập trái phép.
              </p>
            </div>
          </div>
        </section>

        {/* Acceptable Use */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            3. Quy tắc sử dụng
          </h2>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Được phép:
              </h3>
              <ul className="list-disc list-inside text-green-800 space-y-1 ml-4">
                <li>Tham gia sự kiện và thử thách</li>
                <li>Chia sẻ hoạt động chạy bộ từ Strava</li>
                <li>Tương tác với cộng đồng</li>
                <li>Theo dõi thống kê và tiến độ cá nhân</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Nghiêm cấm:
              </h3>
              <ul className="list-disc list-inside text-red-800 space-y-1 ml-4">
                <li>Gian lận (fake activities, GPS manipulation)</li>
                <li>Tạo nhiều tài khoản để lợi dụng hệ thống</li>
                <li>Spam, quấy rối, hoặc nội dung xúc phạm</li>
                <li>Hack, reverse engineer, hoặc can thiệp hệ thống</li>
                <li>Sử dụng bot hoặc tự động hóa không được phép</li>
                <li>Chia sẻ tài khoản với người khác</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Events */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            4. Sự kiện và thử thách
          </h2>

          <div className="space-y-3">
            <p className="text-gray-700">
              <strong>4.1 Tham gia:</strong> Khi tham gia sự kiện, bạn đồng ý
              tuân thủ các luật chơi cụ thể của sự kiện đó.
            </p>
            <p className="text-gray-700">
              <strong>4.2 Xếp hạng:</strong> Xếp hạng dựa trên dữ liệu từ Strava
              và các luật chơi. Quyết định của ban tổ chức là cuối cùng.
            </p>
            <p className="text-gray-700">
              <strong>4.3 Gian lận:</strong> Mọi hành vi gian lận sẽ bị loại
              khỏi sự kiện và có thể bị khóa tài khoản vĩnh viễn.
            </p>
            <p className="text-gray-700">
              <strong>4.4 Giải thưởng:</strong> Giải thưởng (nếu có) chỉ trao
              cho người chơi hợp lệ. Chúng tôi có quyền hủy giải thưởng nếu phát
              hiện vi phạm.
            </p>
          </div>
        </section>

        {/* Strava Integration */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            5. Tích hợp Strava
          </h2>

          <div className="space-y-3">
            <p className="text-gray-700">
              <strong>5.1 Quyền truy cập:</strong> Bạn cho phép Running Club
              truy cập hoạt động Strava của bạn để tính điểm và hiển thị thống
              kê.
            </p>
            <p className="text-gray-700">
              <strong>5.2 Private activities:</strong> Các hoạt động riêng tư
              trên Strava sẽ KHÔNG được đồng bộ và không tính điểm trong sự
              kiện.
            </p>
            <p className="text-gray-700">
              <strong>5.3 Tuân thủ Strava:</strong> Bạn phải tuân thủ{" "}
              <a
                href="https://www.strava.com/legal/terms"
                target="_blank"
                className="text-blue-600 underline hover:text-blue-700"
              >
                Strava Terms of Service
              </a>{" "}
              khi sử dụng dịch vụ của chúng tôi.
            </p>
            <p className="text-gray-700">
              <strong>5.4 Thu hồi quyền:</strong> Bạn có thể thu hồi quyền truy
              cập bất cứ lúc nào tại Strava Settings. Khi thu hồi, bạn sẽ không
              thể tham gia sự kiện mới.
            </p>
          </div>
        </section>

        {/* Intellectual Property */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            6. Quyền sở hữu trí tuệ
          </h2>

          <div className="space-y-3">
            <p className="text-gray-700">
              <strong>6.1 Nội dung của chúng tôi:</strong> Tất cả nội dung,
              thiết kế, logo, và mã nguồn của Running Club thuộc quyền sở hữu
              của chúng tôi.
            </p>
            <p className="text-gray-700">
              <strong>6.2 Nội dung của bạn:</strong> Bạn vẫn sở hữu nội dung mà
              bạn đăng tải. Bằng việc đăng tải, bạn cho phép chúng tôi hiển thị
              và sử dụng nội dung đó trong dịch vụ.
            </p>
            <p className="text-gray-700">
              <strong>6.3 Strava branding:</strong> Logo Strava, màu cam Strava
              (#FC4C02), và các tài sản thương hiệu khác thuộc quyền sở hữu của
              Strava, Inc.
            </p>
          </div>
        </section>

        {/* Liability */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            7. Giới hạn trách nhiệm
          </h2>

          <div className="space-y-3">
            <p className="text-gray-700">
              <strong>7.1 Không bảo đảm:</strong> Dịch vụ được cung cấp "nguyên
              trạng". Chúng tôi không đảm bảo dịch vụ không có lỗi hoặc luôn khả
              dụng 100%.
            </p>
            <p className="text-gray-700">
              <strong>7.2 Rủi ro cá nhân:</strong> Bạn tham gia hoạt động chạy
              bộ và sự kiện với rủi ro cá nhân. Chúng tôi không chịu trách nhiệm
              về chấn thương hoặc tai nạn.
            </p>
            <p className="text-gray-700">
              <strong>7.3 Mất dữ liệu:</strong> Chúng tôi không chịu trách nhiệm
              về mất mát dữ liệu do lỗi kỹ thuật, hack, hoặc nguyên nhân bất khả
              kháng.
            </p>
            <p className="text-gray-700">
              <strong>7.4 Nội dung người dùng:</strong> Chúng tôi không chịu
              trách nhiệm về nội dung mà người dùng khác đăng tải.
            </p>
          </div>
        </section>

        {/* Termination */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            8. Chấm dứt dịch vụ
          </h2>

          <div className="space-y-3">
            <p className="text-gray-700">
              <strong>8.1 Bởi bạn:</strong> Bạn có thể xóa tài khoản bất cứ lúc
              nào trong phần cài đặt hoặc liên hệ chúng tôi.
            </p>
            <p className="text-gray-700">
              <strong>8.2 Bởi chúng tôi:</strong> Chúng tôi có quyền tạm ngừng
              hoặc xóa tài khoản của bạn nếu vi phạm điều khoản này, không cần
              thông báo trước.
            </p>
            <p className="text-gray-700">
              <strong>8.3 Hiệu lực sau chấm dứt:</strong> Các điều khoản về
              quyền sở hữu trí tuệ và giới hạn trách nhiệm vẫn có hiệu lực sau
              khi chấm dứt.
            </p>
          </div>
        </section>

        {/* Changes */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            9. Thay đổi điều khoản
          </h2>

          <p className="text-gray-700">
            Chúng tôi có quyền cập nhật điều khoản này bất cứ lúc nào. Thay đổi
            quan trọng sẽ được thông báo qua email hoặc thông báo trong app.
            Việc bạn tiếp tục sử dụng dịch vụ sau khi thay đổi có hiệu lực đồng
            nghĩa với việc chấp nhận điều khoản mới.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Liên hệ</h2>

          <p className="text-gray-700 mb-4">
            Nếu bạn có câu hỏi về điều khoản này, vui lòng liên hệ:
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
                https://hoakhanhrunners.vercel.app/
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
