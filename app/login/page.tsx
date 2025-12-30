"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, logout } from "@/lib/firebase/auth";
import { isUserWhitelisted, createOrUpdateUser } from "@/lib/firebase/users";
import { useAuth } from "@/lib/hooks/useAuth";

export const isStrictWebview = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isAndroidWebview = /Android.*(wv|\.0\.0\.0)/.test(ua);
  const isIosWebview = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua);
  const isInAppBrowser =
    /FBAN|FBAV|Instagram|Line|TikTok|Zalo|MicroMessenger|Messenger|Snapchat|Pinterest/i.test(
      ua
    );
  return isAndroidWebview || isIosWebview || isInAppBrowser;
};

export default function LoginPage() {
  const router = useRouter();
  const { firebaseUser, user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && firebaseUser && user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [firebaseUser, user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      setError(null);

      // Sign in with Google
      const { user: firebaseUser, error: signInError } =
        await signInWithGoogle();

      if (signInError || !firebaseUser) {
        setError(signInError || "Đăng nhập thất bại");
        setSigningIn(false);
        return;
      }

      // Check if user is whitelisted
      const { isWhitelisted, user: existingUser } = await isUserWhitelisted(
        firebaseUser.email || ""
      );

      if (!isWhitelisted) {
        // User is not whitelisted, sign them out
        await logout();
        setError(
          "Tài khoản của bạn chưa được cấp quyền truy cập. Vui lòng liên hệ quản trị viên."
        );
        setSigningIn(false);
      }
      // Create or update user in Firestore
      await createOrUpdateUser(
        firebaseUser.uid,
        firebaseUser.email || "",
        firebaseUser.displayName,
        existingUser?.role || "sale",
        true
      );

      // Redirect based on role
      if (existingUser?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi đăng nhập");
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Block login in in-app browsers
  if (isStrictWebview()) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 px-4 overflow-hidden">
        <div className="max-w-md w-full space-y-6 sm:space-y-8 p-6 sm:p-8 bg-white rounded-lg shadow-md text-center">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Không hỗ trợ trình duyệt này
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-700">
              Vui lòng mở bằng trình duyệt web để đăng nhập
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 px-4 overflow-hidden">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 p-6 sm:p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Đăng nhập hệ thống
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-600">
            Quản lý bán hàng - Sales Management
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-xs sm:text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 sm:mt-8">
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-white border border-gray-300 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Đăng nhập với Google</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center text-xs text-gray-500 mt-6">
          Chỉ các tài khoản được cấp quyền mới có thể đăng nhập
        </div>
      </div>
    </div>
  );
}
