// components/MobileMenu.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Menu, Home, Trophy, Calendar, User, Settings } from "lucide-react";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  {
    label: "Trang chủ",
    href: "/",
    icon: <Home className="w-5 h-5" />,
  },
  {
    label: "Sự kiện",
    href: "/events",
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    label: "Bảng xếp hạng",
    href: "/leaderboard",
    icon: <Trophy className="w-5 h-5" />,
  },
  {
    label: "Hồ sơ",
    href: "/profile",
    icon: <User className="w-5 h-5" />,
  },
  {
    label: "Cài đặt",
    href: "/settings",
    icon: <Settings className="w-5 h-5" />,
  },
];

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger Button - Fixed top right */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 right-4 z-50 lg:hidden p-3 rounded-lg bg-white shadow-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Overlay - Darkens background when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Slide-in Menu */}
      <div
        className={`
          fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-40
          transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Menu Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Menu</h2>
        </div>

        {/* Menu Items */}
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-colors duration-200
                      ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Menu Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            HKR Running Club © 2026
          </p>
        </div>
      </div>
    </>
  );
}
