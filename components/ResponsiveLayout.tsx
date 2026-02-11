// components/ResponsiveLayout.tsx
"use client";

import { ReactNode } from "react";
import MobileMenu from "./MobileMenu";

interface ResponsiveLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode; // Optional sidebar for desktop
}

export default function ResponsiveLayout({
  children,
  sidebar,
}: ResponsiveLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu */}
      <MobileMenu />

      {/* Desktop Layout */}
      <div className="lg:flex">
        {/* Desktop Sidebar */}
        {sidebar && (
          <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0">
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {/* Add padding-top for mobile to avoid hamburger button overlap */}
          <div className="lg:pt-0 pt-2">{children}</div>
        </main>
      </div>
    </div>
  );
}

// =====================================================
// Alternative: Simpler Mobile Menu (Bottom Navigation)
// =====================================================

export function BottomNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40">
      <div className="flex justify-around items-center h-16">
        <NavItem href="/" icon="🏠" label="Home" />
        <NavItem href="/events" icon="📅" label="Events" />
        <NavItem href="/leaderboard" icon="🏆" label="Top" />
        <NavItem href="/profile" icon="👤" label="Profile" />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-1 px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </a>
  );
}
