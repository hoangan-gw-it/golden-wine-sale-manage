"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/hooks/useAuth";
import { UserRole } from "@/lib/types";

interface LayoutProps {
  children: React.ReactNode;
  role?: UserRole;
}

export default function Layout({ children, role }: LayoutProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check role if specified
  if (role && user.role !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">
            Không có quyền truy cập
          </h1>
          <p className="mt-2 text-gray-600">
            Bạn không có quyền truy cập trang này
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="w-full px-3 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 py-3 sm:py-0 gap-3 sm:gap-0">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                {user.role === "admin" ? "Quản trị viên" : user.role === "ipos" ? "IPOS" : "Bán hàng"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[150px] sm:max-w-none">
                {user.displayName || user.email}
              </span>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded whitespace-nowrap">
                {user.role === "admin" ? "Admin" : user.role === "ipos" ? "IPOS" : "Sale"}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-1 sm:py-2 rounded hover:bg-gray-100 whitespace-nowrap"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="w-full px-3 sm:px-6 lg:px-10 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}
