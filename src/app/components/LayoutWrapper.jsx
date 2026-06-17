// app/components/LayoutWrapper.jsx
"use client";
import { useEffect, useState } from "react";
import Header from "./Header";
import { pathAllowed } from "./Header";
import { usePathname, useRouter } from "next/navigation";

const COLLAPSED_WIDTH = "w-14";
const EXPANDED_WIDTH = "w-44";
const SIDEBAR_STORAGE_KEY = "sidebar_collapsed";

const LayoutWrapper = ({ children, useData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Read localStorage after mount — avoids SSR/hydration mismatch where
  // the server renders with false but the client initializer sees localStorage.
  useEffect(() => {
    setIsCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const isStandalonePage = pathname?.startsWith("/viewCV");

  useEffect(() => {
    setIsLoggedIn(checkAuth());
  }, [pathname]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  function checkAuth() {
    // Standalone pages are fully public — no token or role required
    if (isStandalonePage) {
      return true;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/login");
      return false;
    }
    if (pathname === "/login") {
      router.push("/");
      return true;
    }
    const roles = JSON.parse(localStorage.getItem("roles") || '["*"]');
    if (!roles.includes("*")) {
      const allowedPaths = roles.map((p) => p.replace(/\/$/, "") || "/");
      if (pathname !== "/" && !pathAllowed(pathname, allowedPaths)) {
        router.push("/");
        return false;
      }
    }
    return true;
  }

  // Tailwind class for the main content margin
  const contentMarginClass = isCollapsed ? "ml-14" : "ml-44";

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    // Flex container for the entire application layout
    <div className="flex h-screen overflow-hidden">
      {/* 1. Sidebar (Header) */}
      {/* {useData.authenticated && ( */}
      {isLoggedIn && (
        <Header
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          // Pass widths explicitly for Header to use
          collapsedWidth={COLLAPSED_WIDTH}
          expandedWidth={EXPANDED_WIDTH}
          useData={useData}
        />
      )}
      {/* )} */}

      {/* {!useData.authenticated && <h1>Hello</h1>} */}

      {/* 2. Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 ${contentMarginClass} overflow-y-auto`}
      >
        {children}
      </main>
    </div>
  );
};

export default LayoutWrapper;
