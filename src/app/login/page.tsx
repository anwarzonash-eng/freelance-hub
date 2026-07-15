"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../api_handlers/api/auth.api";

export default function LoginPage() {
  const [userName, setUserName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  // 1. Add loading state to manage UI feedback
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // 2. Start loading immediately upon form submission
    setLoading(true);

    try {
      const res = await login({ userid: userName, password });

      if (res) {
        console.log("login success", res);
        localStorage.setItem("authToken", res.data.user.access_token);
        localStorage.setItem("roles", JSON.stringify(res.data.user.roles));
        localStorage.setItem("userRole", res.data.user.role || "user");
        localStorage.setItem("userId", userName);

        router.push("/");
        // window.location.reload();
        // Successful login:
        // Loading state remains TRUE until the new page loads.
        // router.refresh();
        // router.push("/"); // redirect to home/dashboard
        // We do NOT set setLoading(false) here. The new page loading
        // will naturally unmount this component, ending the loading state.
      } else {
        // Failed login attempt
        setError("Invalid username or password");
        // 3. Stop loading on failure so the user can try again
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      // Handle network/other errors
      setError("An error occurred during login.");
      // 3. Stop loading on error
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm">
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* 4. Inputs are disabled while loading to prevent re-submission */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded disabled:bg-gray-100"
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded disabled:bg-gray-100"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          // 4. Button is disabled while loading
          disabled={loading}
        >
          {/* 5. Show dynamic text feedback */}
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      {/* 6. Optional: Add a simple, centrally placed spinner or overlay for a better effect */}
      {loading && (
        <div className="mt-4 p-2">
          {/* Replace this with a proper CSS spinner for a professional look */}
          <div className="w-6 h-6 border-4 border-t-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
