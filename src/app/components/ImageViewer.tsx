"use client";
import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageViewerContextType {
  openViewer: (images: string[], startIndex?: number) => void;
}

let imageViewerCallback:
  | ((images: string[], startIndex?: number) => void)
  | null = null;

export const useImageViewer = (): ImageViewerContextType => {
  return {
    openViewer: (images: string[], startIndex = 0) => {
      if (imageViewerCallback) {
        imageViewerCallback(images, startIndex);
      }
    },
  };
};

export default function ImageViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    imageViewerCallback = (images: string[], startIndex = 0) => {
      setImages(images);
      setCurrentIndex(startIndex);
      setIsOpen(true);
    };

    return () => {
      imageViewerCallback = null;
    };
  }, []);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleImageLoad = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "Escape") setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, images.length]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 bg-white z-9999 flex items-center justify-center p-4">
      {/* Close Button */}
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-full transition z-10 shadow-lg"
        title="Close (ESC)"
      >
        <X size={28} strokeWidth={2.5} />
      </button>

      {/* Main Image */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={currentImage}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          onLoad={handleImageLoad}
        />
      </div>

      {/* Navigation Controls - Only show if multiple images */}
      {images.length > 1 && (
        <>
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-full transition z-10 shadow-lg"
            title="Previous (← Arrow)"
          >
            <ChevronLeft size={32} strokeWidth={2.5} />
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-full transition z-10 shadow-lg"
            title="Next (→ Arrow)"
          >
            <ChevronRight size={32} strokeWidth={2.5} />
          </button>

          {/* Image Counter */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-85 text-white px-6 py-3 rounded-full font-semibold text-lg shadow-lg">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Thumbnail Strip */}
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex gap-2 flex-wrap justify-center max-w-4xl bg-gray-100 p-3 rounded-lg shadow-lg border border-gray-300">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                  idx === currentIndex
                    ? "border-blue-600 scale-105 shadow-md"
                    : "border-gray-400 hover:border-blue-500"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Image Properties */}
      {imageDimensions && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-85 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg">
          {imageDimensions.width} × {imageDimensions.height} pixels
        </div>
      )}

      {/* Keyboard Hints */}
      {images.length > 1 && (
        <div className="absolute bottom-6 right-6 text-gray-800 text-sm bg-gray-100 px-4 py-2 rounded-lg text-right shadow-lg border border-gray-300">
          <div>← → or Click to navigate</div>
          <div>ESC to close</div>
        </div>
      )}
    </div>
  );
}
