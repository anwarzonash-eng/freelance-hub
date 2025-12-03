"use client";
import React, { useState } from "react";
import { Prompts } from "@/utils/global";
import {
  addCategory,
  addBulkCategories,
} from "@/app/api_handlers/api/categories.api";

interface CategoryData {
  label: string;
  title: string;
  designation: string;
  tagline: string;
  intro_heading?: string;
  intro?: string;
  mainIntro_heading?: string;
  mainIntro?: string;
  short_description?: string;
  thumbnail: string;
  skills_ids: { skills_ids: string[] };
  main_profile_id: string;
  experience_intro?: {
    intro1?: string;
    intro2?: string;
    intro3?: string;
    intro4?: string;
    intro5?: string;
    intro6?: string;
    intro7?: string;
    intro8?: string;
    intro9?: string;
    intro10?: string;
  };
}

interface CreateCategoryProps {
  main_profile_id: string;
  onSuccess?: () => void;
}

export default function CreateCategory({
  main_profile_id,
  onSuccess,
}: CreateCategoryProps) {
  const [category_name, setCategoryName] = useState("");
  const [pasted, setPasted] = useState("");
  const [verified, setVerified] = useState(false);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [isMultiple, setIsMultiple] = useState(false);

  const sampleSingleJSON = `{
  "label": "react-developer",
  "title": "React Developer",
  "designation": "Senior React Developer",
  "tagline": "Building modern web apps with React",
  "intro_heading": "Expert React Development Services",
  "intro": "<p>Specializing in <u>React.js</u> development...</p>",
  "mainIntro_heading": "Why Choose Me for React Development",
  "mainIntro": "<p>With years of experience in <u>React</u>...</p>",
  "short_description": "<p>Professional <u>React developer</u>...</p>",
  "thumbnail": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/react.svg",
  "skills_ids": { "skills_ids": [] },
  "main_profile_id": "4e567ac2-48d9-447f-a48e-635269db7802",
  "experience_intro": {
    "intro1": "<p>Developed <u>React applications</u>...</p>",
    "intro2": "<p>Built <u>single-page applications</u>...</p>",
    "intro3": "<p>Implemented <u>real-time features</u>...</p>",
    "intro4": "<p>Created <u>component libraries</u>...</p>",
    "intro5": "<p>Optimized <u>performance</u>...</p>",
    "intro6": "<p>Integrated <u>third-party APIs</u>...</p>",
    "intro7": "<p>Developed <u>admin dashboards</u>...</p>",
    "intro8": "<p>Implemented <u>authentication</u>...</p>",
    "intro9": "<p>Built <u>e-commerce platforms</u>...</p>",
    "intro10": "<p>Created <u>progressive web apps</u>...</p>"
  }
}`;

  const sampleMultipleJSON = `[
  {
    "label": "react-developer",
    "title": "React Developer",
    "designation": "Senior React Developer",
    "tagline": "Building modern web apps with React",
    "intro_heading": "Expert React Development Services",
    "intro": "<p>Specializing in <u>React.js</u>...</p>",
    "mainIntro_heading": "Why Choose Me",
    "mainIntro": "<p>With years of experience...</p>",
    "short_description": "<p>Professional developer...</p>",
    "thumbnail": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/react.svg",
    "skills_ids": { "skills_ids": [] },
    "main_profile_id": "4e567ac2-48d9-447f-a48e-635269db7802",
    "experience_intro": {
      "intro1": "<p>Developed applications...</p>",
      "intro2": "<p>Built SPAs...</p>",
      ...
      "intro10": "<p>Created PWAs...</p>"
    }
  }
]`;

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
          Category Title(s)
          <span className="text-xs text-gray-500 ml-2">
            (Separate multiple categories with commas)
          </span>
        </label>
        <input
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., React Developer, Node.js Developer"
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
            {category_name.includes(",")
              ? sampleMultipleJSON
              : sampleSingleJSON}
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
            const parsed = JSON.parse(
              pasted.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) =>
                match.replace(/\r?\n/g, "\\n")
              )
            );

            // Check if it's an array (multiple categories) or object (single category)
            const categoriesArray = Array.isArray(parsed) ? parsed : [parsed];
            setIsMultiple(Array.isArray(parsed));

            // Validate each category
            for (const cat of categoriesArray) {
              const thumbValid = await checkImageExists(cat.thumbnail);
              const ok =
                cat &&
                typeof cat.label === "string" &&
                typeof cat.title === "string" &&
                typeof cat.designation === "string" &&
                typeof cat.tagline === "string" &&
                typeof cat.thumbnail === "string" &&
                cat.main_profile_id === main_profile_id &&
                thumbValid &&
                // Optional fields
                (cat.intro_heading === undefined || typeof cat.intro_heading === "string") &&
                (cat.intro === undefined || typeof cat.intro === "string") &&
                (cat.mainIntro_heading === undefined || typeof cat.mainIntro_heading === "string") &&
                (cat.mainIntro === undefined || typeof cat.mainIntro === "string") &&
                (cat.short_description === undefined || typeof cat.short_description === "string") &&
                (cat.experience_intro === undefined || typeof cat.experience_intro === "object");

              if (!ok) {
                setVerified(false);
                setMessage(
                  `❌ Invalid structure for ${
                    cat.title || "unknown"
                  }: check image URL or main_profile_id`
                );
                return;
              }
            }

            setCategories(categoriesArray);
            setVerified(true);
            setMessage(`✅ Verified ${categoriesArray.length} category(ies)`);
          } catch {
            setVerified(false);
            setMessage("Invalid JSON format");
          }
        }}
      >
        Verify
      </button>

      {verified && categories.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">
            {isMultiple
              ? `${categories.length} Categories`
              : "Category Details"}
          </h3>

          {categories.map((cat, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 flex flex-col gap-3 bg-gray-50"
            >
              <h4 className="font-medium text-gray-900">
                {index + 1}. {cat.title}
              </h4>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Label
                </label>
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={cat.label}
                  onChange={(e) => {
                    const updated = [...categories];
                    updated[index].label = e.target.value;
                    setCategories(updated);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={cat.title}
                  onChange={(e) => {
                    const updated = [...categories];
                    updated[index].title = e.target.value;
                    setCategories(updated);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Designation
                </label>
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={cat.designation}
                  onChange={(e) => {
                    const updated = [...categories];
                    updated[index].designation = e.target.value;
                    setCategories(updated);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Tagline
                </label>
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={cat.tagline}
                  onChange={(e) => {
                    const updated = [...categories];
                    updated[index].tagline = e.target.value;
                    setCategories(updated);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Thumbnail URL
                </label>
                <div className="flex items-center gap-3">
                  <input
                    className="border rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={cat.thumbnail}
                    onChange={(e) => {
                      const updated = [...categories];
                      updated[index].thumbnail = e.target.value;
                      setCategories(updated);
                    }}
                  />
                  <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-white">
                    {cat.thumbnail ? (
                      <img
                        src={cat.thumbnail}
                        alt="thumbnail"
                        className="max-w-full max-h-full rounded-md object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Experience Intro Fields */}
              {cat.experience_intro && (
                <div className="flex flex-col gap-2 border-t pt-3 mt-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Experience Introduction (10 sections)
                  </label>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <div key={num} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">
                        Experience Intro {num}
                      </label>
                      <textarea
                        className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm min-h-[60px]"
                        value={cat.experience_intro?.[`intro${num}` as keyof typeof cat.experience_intro] || ''}
                        onChange={(e) => {
                          const updated = [...categories];
                          if (!updated[index].experience_intro) {
                            updated[index].experience_intro = {};
                          }
                          const key = `intro${num}`;
                          (updated[index].experience_intro as Record<string, string>)[key] = e.target.value;
                          setCategories(updated);
                        }}
                        placeholder={`<p>Experience description ${num}...</p>`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 font-medium"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                let response;
                if (isMultiple) {
                  response = await addBulkCategories(categories);
                } else {
                  response = await addCategory(categories[0]);
                }

                if (response && response.APIStatus === "success") {
                  setMessage(
                    `✅ Successfully created ${categories.length} category(ies)`
                  );
                  setCategoryName("");
                  setPasted("");
                  setVerified(false);
                  setCategories([]);
                  setIsMultiple(false);

                  if (onSuccess) {
                    setTimeout(() => {
                      onSuccess();
                    }, 1500);
                  }
                } else {
                  setMessage(
                    `❌ Error: ${response?.message || "Failed to create"}`
                  );
                }
              } catch (error) {
                setMessage("❌ Network error occurred");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving..." : `Save ${categories.length} Category(ies)`}
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
