// components/Navigation.tsx
// Enhanced with integrated hamburger menu for mobile

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Activity,
  Users,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function Navigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 🔥 ẨN MENU CHO COMMENTS / TV / FORM
  if (pathname.startsWith("/comments") || pathname.startsWith("/auction")) {
    return null;
  }

  const handleLogout = async () => {
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      await signOut();
      setIsMobileMenuOpen(false);
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navItems = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/events", label: "Sự kiện", icon: Calendar },
    { href: "/members", label: "Thành viên", icon: Users },
  ];

  // Add user-specific items when logged in
  if (user) {
    navItems.push(
      { href: "/activities", label: "Hoạt động", icon: Activity },
      { href: "/feeds", label: "Bảng tin", icon: Users },
    );
  }

  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                Hòa Khánh Runners
              </span>
            </Link>

            {/* Navigation Items - Desktop */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
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

            {/* User Menu - Desktop */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  <Link
                    href="/activities"
                    className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-blue-600 font-bold text-sm">
                          {user.username?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">
                      {user.full_name || user.username}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Đăng xuất</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-medium transition-colors"
                >
                  Đăng nhập
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Slide Menu */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Menu Header with User Info */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center justify-between mb-4">
            <Activity className="h-8 w-8 text-white" />
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {user ? (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-blue-600 font-bold text-lg">
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-white">
                <p className="font-bold text-lg">
                  {user.full_name || user.username}
                </p>
                <p className="text-sm text-blue-100">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="text-white">
              <p className="font-bold text-lg">Hòa Khánh Runners</p>
              <p className="text-sm text-blue-100">Chưa đăng nhập</p>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg
                      transition-colors duration-200
                      ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Menu Footer - Settings & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          {user ? (
            <div className="space-y-2">
              <Link
                href="/settings"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User className="h-5 w-5" />
                <span>Cài đặt</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="block w-full px-6 py-3 bg-blue-600 text-white text-center hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
