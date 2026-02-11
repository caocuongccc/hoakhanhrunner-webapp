// components/SimpleHamburgerMenu.tsx
// Lightweight mobile menu without external icon dependencies

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuItem {
  label: string;
  href: string;
}

// Customize your menu items here
const menuItems: MenuItem[] = [
  { label: "Trang chủ", href: "/" },
  { label: "Sự kiện", href: "/events" },
  { label: "Bảng xếp hạng", href: "/leaderboard" },
  { label: "Hồ sơ", href: "/profile" },
  { label: "Cài đặt", href: "/settings" },
];

export default function SimpleHamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 right-4 z-50 md:hidden p-2 rounded-md bg-white shadow-md hover:shadow-lg transition-shadow"
        aria-label="Menu"
      >
        <div className="w-6 h-5 flex flex-col justify-between">
          <span
            className={`block h-0.5 bg-gray-700 transition-transform duration-300 ${
              isOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block h-0.5 bg-gray-700 transition-opacity duration-300 ${
              isOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 bg-gray-700 transition-transform duration-300 ${
              isOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Slide Menu */}
      <nav
        className={`
          fixed top-0 right-0 h-full w-64 bg-white shadow-xl z-40
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Menu</h2>
        </div>

        {/* Menu Items */}
        <ul className="p-4 space-y-2">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={closeMenu}
                className={`
                  block px-4 py-3 rounded-md transition-colors
                  ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
