"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Activity, Users, User, LogOut } from "lucide-react";
import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export default function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const supabase = createSupabaseClient();

  // Check auth status
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  };

  const navItems = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/events/individual", label: "Sự kiện cá nhân", icon: Calendar },
    { href: "/events/team", label: "Sự kiện đội", icon: Users },
    { href: "/activities", label: "Hoạt động", icon: Activity },
    { href: "/feed", label: "Bảng tin", icon: Users },
    { href: "/members", label: "Thành viên", icon: Users },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">
              Running Club
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden md:inline">Tài khoản</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden md:inline">Đăng xuất</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex overflow-x-auto space-x-1 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md whitespace-nowrap text-sm ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
