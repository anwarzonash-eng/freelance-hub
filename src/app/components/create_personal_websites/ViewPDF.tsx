"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface ViewPDFProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName?: string;
}

export default function ViewPDF({
  isOpen,
  onClose,
  pdfUrl,
  fileName = "Document.pdf",
}: ViewPDFProps) {
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validate PDF URL
  if (!pdfUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Error</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
              title="Close"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-red-600 font-semibold">No PDF URL provided</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0">
      <div className="bg-white w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 truncate">
            {fileName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* PDF Viewer - Using iframe */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <iframe
            src={`${pdfUrl}#view=FitH`}
            className="w-full h-full border-none"
            title={fileName}
            onError={() => setError("Failed to load PDF")}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <p className="text-red-600 font-semibold">{error}</p>
            <p className="text-red-500 text-sm mt-1">
              Try downloading the PDF instead or open in a new tab
            </p>
          </div>
        )}

        {/* Download Button */}
        <div className="p-4 border-t border-gray-200 bg-white flex gap-2 justify-end">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            📖 Open in new tab
          </a>
          <a
            href={pdfUrl}
            download={fileName}
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            ⬇️ Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
