"use client";
import dynamic from "next/dynamic";

const MediaUpload = dynamic(() => import("../components/media/MediaUpload"), {
  ssr: false,
});

export default function MediaUploadPage() {
  return <MediaUpload />;
}
