// app/layout.tsx - Root layout with Navigation
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navigation from "@/components/Navigation";
import AuthProvider from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "Hòa Khánh Runners - Chạy để sống tốt hơn",
  description:
    "Nền tảng quản lý sự kiện và hoạt động chạy bộ dành cho các runner của câu lạc bộ Hòa Khánh Runners. Tạo và tham gia các sự kiện chạy bộ, theo dõi hoạt động cá nhân, kết nối với cộng đồng runner.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="container mx-auto px-4 py-8">
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 2500,
                  style: {
                    fontSize: "16px",
                    borderRadius: "12px",
                  },
                }}
              />
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
