"use client";

import React, { useState } from "react";
import { Copy } from "lucide-react";
import {
  uploadPortfolioImage,
  uploadPortfolioImages,
} from "@/app/api_handlers/api/portfolios.api";
import dynamic from "next/dynamic";

const ImageViewer = dynamic(() => import("../ImageViewer"), { ssr: false });
import { useImageViewer } from "../ImageViewer";

export default function MediaUpload() {
  const imageViewer = useImageViewer();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []));
  };

  // Upload files (images/videos)
  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    let urls: string[] = [];
    try {
      if (files.length === 1) {
        const formData = new FormData();
        formData.append("file", files[0]);
        const res: any = await uploadPortfolioImage(formData);
        if (res?.data?.url) {
          urls = [res.data.url];
        } else if (res?.url) {
          urls = [res.url];
        }
      } else {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        const res: any = await uploadPortfolioImages(formData);
        if (res?.data?.urls && Array.isArray(res.data.urls)) {
          urls = res.data.urls;
        } else if (res?.urls && Array.isArray(res.urls)) {
          urls = res.urls;
        }
      }
      setMediaUrls(urls);
    } catch (error) {
      setMediaUrls([]);
    }
    setUploading(false);
  };

  // Copy single URL
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Media Upload</h1>
      <div className="bg-white border-2 border-blue-100 rounded-lg p-6 mb-8 shadow flex flex-col md:flex-row gap-4 items-center">
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
          className="border-2 border-gray-300 px-4 py-2 rounded-lg w-full md:w-auto"
        />
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition w-full md:w-auto"
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {mediaUrls.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">
            Uploaded Media
          </h2>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg mb-4 font-semibold shadow hover:bg-green-700 transition"
            onClick={() => navigator.clipboard.writeText(mediaUrls.join("\n"))}
          >
            Copy All URLs
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mediaUrls.map((url, idx) => (
              <div
                key={url}
                className="border-2 border-gray-200 rounded-lg p-4 flex flex-col items-center bg-white shadow hover:border-blue-400 transition"
              >
                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <button
                    type="button"
                    onClick={() => imageViewer.openViewer([url], 0)}
                    className="cursor-pointer hover:opacity-80 transition mb-2"
                  >
                    <img
                      src={url}
                      alt="media"
                      className="h-40 w-40 object-cover rounded-lg shadow-lg"
                    />
                  </button>
                ) : url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video
                    src={url}
                    controls
                    className="h-56 w-full rounded-lg mb-2 shadow-lg bg-black"
                  />
                ) : (
                  <span className="text-xs text-gray-500">Unknown format</span>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    className="bg-gray-200 px-2 py-1 rounded-full text-xs flex items-center gap-1 hover:bg-blue-100"
                    onClick={() => handleCopyUrl(url)}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="mt-2 w-full break-all text-xs text-gray-700 text-center">
                  {url}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ImageViewer />
    </div>
  );
}
