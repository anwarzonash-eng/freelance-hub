"use client";

import { useState } from "react"; // 1. Import useState
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  // 2. Initialize loading state
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    // 3. Start loading immediately
    setLoading(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });

      // On success:
      // The loading state remains TRUE until the new page loads,
      // covering the router.refresh() (which forces a re-render/middleware check)
      // and the final router.push("/login") redirect.
      router.refresh();
      router.push("/login");

      // We don't need to set loading to false here, as the component
      // will be unmounted when the user is redirected to the login page.
    } catch (error) {
      // 4. Stop loading on error
      console.error("Logout failed:", error);
      setLoading(false);
      // Optionally, show an error message to the user here
    }
  };

  return (
    <button
      onClick={handleLogout}
      // 5. Disable the button while loading
      disabled={loading}
      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-wait transition-colors"
    >
      {/* 6. Display dynamic text based on the loading state */}
      {loading ? "Logging Out..." : "Logout"}
    </button>
  );
}
