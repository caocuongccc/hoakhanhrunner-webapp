// app/admin/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import AdminAuthProvider, {
  useAdminAuth,
} from "@/components/AdminAuthProvider";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Activity,
  ChevronRight,
  LogOut,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { admin, loading, signOut } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    if (pathname !== "/admin-login" && !loading && !admin) {
      router.push("/admin-login");
    }
  }, [admin, loading, router, pathname]);

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  // Nếu đang ở trang login, không cần layout
  if (pathname === "/admin-login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/events", label: "Quản lý sự kiện", icon: Calendar },
    { href: "/admin/teams", label: "Quản lý đội", icon: Users },
    { href: "/admin/members", label: "Thành viên", icon: Users },
    { href: "/admin/strava", label: "Cấu hình Strava", icon: Activity },
    { href: "/admin/settings", label: "Cài đặt", icon: Settings },
  ];

  const handleLogout = async () => {
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      await signOut();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Full height */}
      <aside className="w-64 bg-white shadow-md flex flex-col fixed h-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
          <p className="text-sm text-gray-600 mt-1">{admin.email}</p>
          <p className="text-xs text-gray-500 mt-1">
            Role: {admin.role === "super_admin" ? "Super Admin" : "Admin"}
          </p>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.href ||
              (activeTab.startsWith(item.href) && item.href !== "/admin");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Offset by sidebar width */}
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
