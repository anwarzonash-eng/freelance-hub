import React, { FC, ReactNode } from "react";

// Define the Props for the generic popup
type GenericPopupProps = {
  // The content to be rendered inside the popup
  children: ReactNode;
  // Function called when the popup needs to be closed
  onClose: () => void;
  // Optional: A title for the popup header
  title?: string;
};

const GenericPopup: FC<GenericPopupProps> = ({
  children,
  onClose,
  title = "Popup",
}) => {
  return (
    // 1. Modal Overlay (Occupies Full Screen, Fixed Position, Dark Backdrop)
    <div
      className="fixed inset-0 h-full w-full bg-black bg-opacity-60 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      {/* 2. Modal Content Container (White background, centered, stops click propagation) */}
      <div
        className="bg-white p-6 rounded-lg shadow-2xl relative flex flex-col w-full h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Title and Close Button) */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-3xl font-light leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Content Area (Scrollable if content exceeds max height) */}
        <div className="overflow-y-auto flex-grow">{children}</div>
      </div>
    </div>
  );
};

export default GenericPopup;
