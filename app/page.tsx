"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect to appropriate dashboard based on role
        if (user.role === "admin") {
          router.push("/admin");
        } else if (user.role === "ipos") {
          router.push("/ipos");
        } else {
          router.push("/dashboard");
        }
      } else {
        // Redirect to login if not authenticated
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="h-screen flex items-center justify-center overflow-hidden">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  );
}
