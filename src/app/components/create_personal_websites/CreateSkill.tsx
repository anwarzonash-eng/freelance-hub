"use client";
import React, { useState, useEffect } from "react";
import { Prompts } from "@/utils/global";
import {
  addSkill,
  addBulkSkills,
} from "@/app/api_handlers/api/skills.api";

interface SkillData {
  title: string;
  url: string;
  variation: string[];
  icon: string;
}

interface CreateSkillProps {
  onSuccess?: () => void;
}

export default function CreateSkill({ onSuccess }: CreateSkillProps = {}) {
  const [skillName, setSkillName] = useState("");
  const [pasted, setPasted] = useState("");
  const [verified, setVerified] = useState(false);
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isMultiple, setIsMultiple] = useState(false);

  const sampleSingleJSON = `{
  "title": "Inertia.js",
  "url": "https://inertiajs.com",
  "variation": ["Inertia.js", "InertiaJS", "Inertia"],
  "icon": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/inertia.svg"
}`;

  const sampleMultipleJSON = `[
  {
    "title": "React",
    "url": "https://react.dev",
    "variation": ["React", "React.js", "ReactJS"],
    "icon": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/react.svg"
  },
  {
    "title": "Vue.js",
    "url": "https://vuejs.org",
    "variation": ["Vue", "Vue.js", "VueJS"],
    "icon": "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/vuedotjs.svg"
  }
]`;

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
        <label className="text-sm font-medium text-gray-700">
          Skill Name(s)
          <span className="text-xs text-gray-500 ml-2">
            (Separate multiple skills with commas: React, Vue.js, Angular)
          </span>
        </label>
        <input
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          placeholder="e.g., React, Vue.js, Angular"
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
            {skillName.includes(",") ? sampleMultipleJSON : sampleSingleJSON}
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

            // Check if it's an array (multiple skills) or object (single skill)
            const skillsArray = Array.isArray(parsed) ? parsed : [parsed];
            setIsMultiple(Array.isArray(parsed));

            // Validate each skill
            for (const skill of skillsArray) {
              const ok =
                skill &&
                typeof skill.title === "string" &&
                typeof skill.url === "string" &&
                Array.isArray(skill.variation) &&
                typeof skill.icon === "string";

              if (!ok) {
                setVerified(false);
                setMessage(`Invalid structure for skill: ${skill.title || "unknown"}`);
                return;
              }

              if (!isValidUrl(skill.url)) {
                setVerified(false);
                setMessage(`Invalid URL for ${skill.title}`);
                return;
              }

              const imageExists = await checkImageExists(skill.icon);
              if (!imageExists) {
                setVerified(false);
                setMessage(`Icon does not exist for ${skill.title}`);
                return;
              }
            }

            setSkills(skillsArray);
            setVerified(true);
            setMessage(`✅ Verified ${skillsArray.length} skill(s)`);
          } catch {
            setVerified(false);
            setMessage("Invalid JSON");
          }
        }}
      >
        Verify
      </button>

      {verified && skills.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">
            {isMultiple ? `${skills.length} Skills` : "Skill Details"}
          </h3>

          {skills.map((skill, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 flex flex-col gap-3 bg-gray-50"
            >
              <h4 className="font-medium text-gray-900">
                {index + 1}. {skill.title}
              </h4>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={skill.title}
                  onChange={(e) => {
                    const updated = [...skills];
                    updated[index].title = e.target.value;
                    setSkills(updated);
                  }}
                  placeholder="Title"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">URL</label>
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={skill.url}
                  onChange={(e) => {
                    const updated = [...skills];
                    updated[index].url = e.target.value;
                    setSkills(updated);
                  }}
                  placeholder="URL"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Variation (comma separated)
                </label>
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={skill.variation.join(", ")}
                  onChange={(e) => {
                    const updated = [...skills];
                    updated[index].variation = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setSkills(updated);
                  }}
                  placeholder="Inertia.js, InertiaJS, Inertia"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Icon URL
                </label>
                <div className="flex items-center gap-3">
                  <input
                    className="border rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={skill.icon}
                    onChange={(e) => {
                      const updated = [...skills];
                      updated[index].icon = e.target.value;
                      setSkills(updated);
                    }}
                    placeholder="Icon URL"
                  />
                  <div className="w-12 h-12 border rounded-lg flex items-center justify-center bg-white">
                    {skill.icon ? (
                      <img
                        src={skill.icon}
                        alt="icon"
                        className="max-w-full max-h-full rounded-md"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </div>
                </div>
              </div>
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
                  // Use bulk API
                  response = await addBulkSkills(skills);
                } else {
                  // Use single API
                  response = await addSkill(skills[0]);
                }

                if (response && response.APIStatus === "success") {
                  setMessage(
                    `✅ Successfully created ${skills.length} skill(s)`
                  );
                  // Reset form
                  setSkillName("");
                  setPasted("");
                  setVerified(false);
                  setSkills([]);
                  setIsMultiple(false);
                  
                  // Call onSuccess callback if provided
                  if (onSuccess) {
                    setTimeout(() => {
                      onSuccess();
                    }, 1500);
                  }
                } else {
                  setMessage(
                    `❌ Error: ${response?.message || "Failed to create skill(s)"}`
                  );
                }
              } catch (error) {
                setMessage("❌ Network error occurred");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving..." : `Save ${skills.length} Skill(s)`}
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
