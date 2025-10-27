// components/ExpandCollapse.tsx

import React, { useState, ReactNode } from "react";

// Use an inline type for props instead of a separate interface
type ExpandCollapseProps = {
  title: string;
  children: ReactNode;
};

const ExpandCollapse = ({ title, children }: ExpandCollapseProps) => {
  // 1. State to manage the collapse/expand status
  const [isExpanded, setIsExpanded] = useState(false);

  // 2. Function to toggle the state
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border border-gray-300 rounded-lg shadow-sm w-full  o my-4 bg-white">
      {/* Header (The Clickable Area) */}
      <button
        className="flex justify-between items-center w-full p-4 text-left font-semibold text-gray-700 hover:bg-gray-50 transition duration-150 ease-in-out"
        onClick={toggleExpand}
        aria-expanded={isExpanded}
        aria-controls="content-panel"
      >
        <span>{title}</span>
        {/* Simple Chevron Icon */}
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${
            isExpanded ? "rotate-180" : "rotate-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>

      {/* Content Area */}
      <div
        id="content-panel"
        // Use Tailwind's max-h and overflow for a smooth CSS-only transition
        // This is a minimal implementation. For true height transition, React libraries or JS are often needed.
        // max-h-0 is a common trick for collapse/expand with overflow-hidden.
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100 p-4 pt-0"
            : "grid-rows-[0fr] opacity-0 p-0"
        }`}
      >
        <div className="overflow-hidden text-gray-600 border-t pt-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ExpandCollapse;
