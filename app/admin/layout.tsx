// app/admin/layout.tsx - FIXED: Remove top menu, fix logout button
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
  Award,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      {/* NO NAVIGATION WRAPPER - Admin doesn't use the main app Navigation */}
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
    { href: "/admin/events", label: "Sự kiện", icon: Calendar },
    { href: "/admin/teams", label: "Đội", icon: Users },
    { href: "/admin/members", label: "Thành viên", icon: Users },
    { href: "/admin/certificates", label: "Chứng chỉ", icon: Award },
    { href: "/admin/strava", label: "Strava", icon: Activity },
    { href: "/admin/settings", label: "Cài đặt", icon: Settings },
  ];

  const handleLogout = async () => {
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      await signOut();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      {/* <aside className="w-64 bg-white shadow-lg flex flex-col fixed h-full z-50"> */}
      <aside className="w-64 bg-white shadow-lg flex flex-col fixed top-0 left-0 h-screen z-[9999]">
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

        {/* Logout Button - Always visible at bottom */}
        <div className="p-4 border-t bg-white">
          <button
            onClick={handleLogout}
            // className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md z-[10000] relative"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-semibold">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content - NO TOP MENU */}
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
