"use client";
import React, { useState } from "react";
import { Prompts } from "@/utils/global";
import { addCategory } from "@/app/api_handlers/api/categories.api";

export default function CreateCategory({ main_profile_id }) {
  const [category_name, setCategoryName] = useState("");
  const [pasted, setPasted] = useState("");
  const [verified, setVerified] = useState(false);
  const [label, setLabel] = useState("");
  const [title, setTitle] = useState("");
  const [designation, setDesignation] = useState("");
  const [tagline, setTagline] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const sampleJSON = `{
  "label": "abc label",
  "title": "abc title",
  "designation": "abc designation",
  "tagline": "abc tagline",
  "thumbnail": "https://example.com/image.png",
  "skills_ids": { "skills_ids": [] },
  "main_profile_id": "4e567ac2-48d9-447f-a48e-635269db7802"
}`;

  const checkImageExists = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 p-6 bg-white rounded-2xl shadow">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Props:</span>
        <div className="text-xs bg-gray-100 p-2 rounded font-mono text-gray-600">
          main_profile_id: {main_profile_id}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Category Title
        </label>
        <input
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter category title"
          value={category_name}
          onChange={(e) => setCategoryName(e.target.value)}
        />
      </div>

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        disabled={!category_name}
        onClick={async () => {
          const replaced = (Prompts.CATEGORY || "")
            .replaceAll("{main_profile_id}", main_profile_id)
            .replaceAll("{service_name}", category_name);
          await navigator.clipboard.writeText(replaced);
          setMessage("📋 Prompt copied to clipboard");
        }}
      >
        Copy Prompt
      </button>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Paste ChatGPT JSON Here
          <div className="mt-1 text-xs bg-gray-100 p-2 rounded font-mono text-gray-600 whitespace-pre-wrap">
            {sampleJSON}
          </div>
        </label>
        <textarea
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[140px]"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste ChatGPT JSON here"
        />
      </div>

      <button
        className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg transition"
        onClick={async () => {
          setMessage("");
          try {
            const obj = JSON.parse(pasted);
            const thumbValid = await checkImageExists(obj.thumbnail);
            const ok =
              obj &&
              typeof obj.label === "string" &&
              typeof obj.title === "string" &&
              typeof obj.designation === "string" &&
              typeof obj.tagline === "string" &&
              typeof obj.thumbnail === "string" &&
              obj.main_profile_id === main_profile_id &&
              thumbValid;

            if (!ok) {
              setVerified(false);
              setMessage(
                "❌ Incorrect structure, invalid image URL, or mismatched main_profile_id"
              );
              return;
            }

            setLabel(obj.label);
            setTitle(obj.title);
            setDesignation(obj.designation);
            setTagline(obj.tagline);
            setThumbnail(obj.thumbnail);
            setPreview(obj.thumbnail);
            setVerified(true);
            setMessage("✅ Verified — you can now edit and save");
          } catch {
            setVerified(false);
            setMessage("Invalid JSON format");
          }
        }}
      >
        Verify
      </button>

      {verified && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Label</label>
            <input
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Designation
            </label>
            <input
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tagline</label>
            <input
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Thumbnail URL
            </label>
            <input
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={thumbnail}
              onChange={async (e) => {
                const val = e.target.value;
                setThumbnail(val);
                const ok = await checkImageExists(val);
                setPreview(ok ? val : "");
              }}
            />
            {preview && (
              <img
                src={preview}
                alt="Thumbnail Preview"
                className="w-32 h-32 object-contain mt-2 border rounded-lg"
              />
            )}
          </div>

          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                const payload = {
                  label,
                  title,
                  designation,
                  tagline,
                  thumbnail,
                  skills_ids: { skills_ids: [] },
                  main_profile_id,
                };
                const res = await addCategory(payload);

                if (!res) {
                  setMessage("✅ Saved");
                  setBusy(false);
                }
              } catch {
                setMessage("Error ❌");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {message && (
        <div
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            message.includes("Success") || message.includes("✅")
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
