// src/utils/notificationService.tsx
"use client";

import toast, { Toaster } from "react-hot-toast";
import React, { useState } from "react";

type NotificationType = "success" | "error" | "info";

// --- Configuration for Icons and Colors ---
const configMap = {
  success: {
    icon: "check_circle",
    bgColor: "bg-green-50",
    ringColor: "ring-green-500",
    textColor: "text-green-800",
  },
  error: {
    icon: "error",
    bgColor: "bg-red-50",
    ringColor: "ring-red-500",
    textColor: "text-red-800",
  },
  info: {
    icon: "info",
    bgColor: "bg-blue-50",
    ringColor: "ring-blue-500",
    textColor: "text-blue-800",
  },
};

// --- Custom Component for the Toast Body ---
const CustomToastContent: React.FC<{
  message: string;
  details: string;
  t: any;
  type: NotificationType;
}> = ({ message, details, t, type }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { icon, bgColor, ringColor, textColor } = configMap[type];

  const handleDismiss = () => {
    toast.dismiss(t.id);
  };

  return (
    <div
      // Main container with shadow, border, and background color
      className={`
                ${bgColor} ${ringColor} ${textColor}
                ring-2 ring-opacity-70 p-4 rounded-xl shadow-2xl 
                text-sm max-w-sm w-full transition-all duration-300 
            `}
    >
      <div className="flex justify-between items-start">
        {/* Icon, Message, and Expand CTA */}
        <div
          className="flex-1 flex items-start cursor-pointer pr-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div>
            <strong className="block leading-snug font-semibold">
              {message}
            </strong>
            <small className="text-xs opacity-75 mt-1 block">
              {isExpanded
                ? "Click to collapse details"
                : "Click for details..."}
            </small>
          </div>
        </div>

        {/* Manual Close Button */}
        <button
          onClick={handleDismiss}
          className={`
                        text-gray-500 hover:text-gray-800 transition 
                        p-1 rounded-full ml-2 -mr-2 -mt-2
                    `}
          aria-label="Dismiss notification"
        >
          <span className="material-icons text-xl">close</span>
        </button>
      </div>

      {/* Expanded Details Area */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-300/50">
          <pre
            className="
                        whitespace-pre-wrap text-xs text-gray-700 font-mono 
                        max-h-32 overflow-y-auto p-2 bg-white rounded-lg border border-gray-200
                    "
          >
            {details}
          </pre>
        </div>
      )}
    </div>
  );
};

/**
 * The central function to trigger notifications, auto-hiding after 2 seconds.
 */
export const showAppNotification = (
  type: NotificationType,
  message: string,
  details?: string
) => {
  const finalDetails = details || message;

  toast.custom(
    (t) => (
      <CustomToastContent
        message={message}
        details={finalDetails}
        t={t}
        type={type}
      />
    ),
    {
      // Set duration to 2000ms for 2-second auto-hide
      duration: 3000,
    }
  );
};
