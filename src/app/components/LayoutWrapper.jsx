// app/components/LayoutWrapper.jsx
"use client";
import { useEffect, useState } from "react";
import Header from "./Header"; // Adjust path if necessary

const COLLAPSED_WIDTH = "w-14"; // Matches w-14 in Header.jsx
const EXPANDED_WIDTH = "w-56"; // Matches w-56 in Header.jsx

const LayoutWrapper = ({ children, useData }) => {
  // useEffect(() => {
  //   console.log(isAuthenticated);
  // }, []);
  // Use state to track the sidebar's collapsed status
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Toggle function passed to the Header
  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Tailwind class for the main content margin
  const contentMarginClass = isCollapsed ? "ml-14" : "ml-56";

  return (
    // Flex container for the entire application layout
    <div className="flex h-screen overflow-hidden">
      {/* 1. Sidebar (Header) */}
      {useData.authenticated && (
        <Header
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          // Pass widths explicitly for Header to use
          collapsedWidth={COLLAPSED_WIDTH}
          expandedWidth={EXPANDED_WIDTH}
          useData={useData}
        />
      )}

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
