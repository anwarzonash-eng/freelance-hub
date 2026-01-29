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
      localStorage.removeItem("authToken");
      router.push("/login");

      // On success:
      // The loading state remains TRUE until the new page loads,
      // covering the router.refresh() (which forces a re-render/middleware check)
      // and the final router.push("/login") redirect.

      // We don't need to set loading to false here, as the component
      // will be unmounted when the user is redirected to the login page.
    } catch (error) {
      // 4. Stop loading on error
      // console.error("Logout failed:", error);
      setLoading(false);
      // Optionally, show an error message to the user here
    }
  };

  return (
    <button
      onClick={handleLogout}
      // 5. Disable the button while loading
      disabled={loading}
      className=""
    >
      {/* 6. Display dynamic text based on the loading state */}
      {loading ? "Logging Out..." : "Logout"}
    </button>
  );
}
