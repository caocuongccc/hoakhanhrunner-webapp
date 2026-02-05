"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Admin = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
};

type AdminAuthContextType = {
  admin: Admin | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}

export default function AdminAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Chỉ load admin nếu không phải trang login
    if (pathname !== "/admin/login") {
      loadAdmin();
    } else {
      setLoading(false);
    }
  }, [pathname]);

  const loadAdmin = async () => {
    try {
      const response = await fetch("/api/admin/session");
      const data = await response.json();

      if (data.admin) {
        setAdmin(data.admin);
      } else {
        setAdmin(null);
      }
    } catch (error) {
      console.error("Error loading admin:", error);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshAdmin = async () => {
    setLoading(true);
    await loadAdmin();
  };

  const signOut = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setAdmin(null);
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    admin,
    loading,
    signOut,
    refreshAdmin,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
