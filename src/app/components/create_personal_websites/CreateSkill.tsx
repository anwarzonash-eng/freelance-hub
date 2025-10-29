"use client";
import React, { useState, useEffect } from "react";
import { Prompts } from "@/utils/global";

export default function CreateSkill() {
  const [skillName, setSkillName] = useState("");
  const [pasted, setPasted] = useState("");
  const [verified, setVerified] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [variationInput, setVariationInput] = useState("");
  const [icon, setIcon] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPreviewSrc(icon);
  }, [icon]);

  const sampleJSON = `{
  "title": "Inertia.js",
  "url": "https://inertiajs.com",
  "variation": ["Inertia.js", "InertiaJS", "Inertia"],
  "icon": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/inertia.svg"
}`;

  const isValidUrl = (urlString) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const checkImageExists = async (url) => {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 p-6 bg-white rounded-2xl shadow">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Skill Name</label>
        <input
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          placeholder="Skill name"
        />
      </div>

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        disabled={!skillName}
        onClick={async () => {
          const replaced = (Prompts.GENERATE_SKILLS || "").replaceAll(
            "{skill_name}",
            skillName
          );
          await navigator.clipboard.writeText(replaced);
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
            const ok =
              obj &&
              typeof obj.title === "string" &&
              typeof obj.url === "string" &&
              Array.isArray(obj.variation) &&
              typeof obj.icon === "string";

            if (!ok) {
              setVerified(false);
              setMessage("Pasted object structure is incorrect");
              return;
            }

            if (!isValidUrl(obj.url)) {
              setVerified(false);
              setMessage("Invalid URL format");
              return;
            }

            const imageExists = await checkImageExists(obj.icon);
            if (!imageExists) {
              setVerified(false);
              setMessage("Icon image does not exist at provided URL");
              return;
            }

            setTitle(obj.title);
            setUrl(obj.url);
            setVariationInput(obj.variation.join(", "));
            setIcon(obj.icon);
            setVerified(true);
            setMessage("Verified ✅");
          } catch {
            setVerified(false);
            setMessage("Invalid JSON");
          }
        }}
      >
        Verify
      </button>

      {verified && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">URL</label>
            <input
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Variation (comma separated)
            </label>
            <input
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={variationInput}
              onChange={(e) => setVariationInput(e.target.value)}
              placeholder="Inertia.js, InertiaJS, Inertia"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Icon URL
            </label>
            <div className="flex items-center gap-3">
              <input
                className="border rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Icon URL"
              />
              <div className="w-12 h-12 border rounded-lg flex items-center justify-center bg-gray-50">
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt="icon"
                    className="max-w-full max-h-full rounded-md"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">N/A</span>
                )}
              </div>
            </div>
          </div>

          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            disabled={busy || !title || !url || !variationInput || !icon}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                const body = {
                  title,
                  url,
                  variation: variationInput
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  icon,
                };
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_PERSONAL_SITES_API_DOMAIN}skill/add`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  }
                );
                const data = await res.json();
                if (data.status === "Success") setMessage("✅ Success");
                else setMessage(JSON.stringify(data.message) || "Error ❌");
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
