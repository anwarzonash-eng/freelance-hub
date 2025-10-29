"use client";
import React, { useState } from "react";
import { Prompts } from "@/utils/global";

export default function CreateSkillGroup({
  skill_id,
  main_profile_id,
  skill_name,
}) {
  const [pasted, setPasted] = useState("");
  const [verified, setVerified] = useState(false);
  const [description, setDescription] = useState("");
  const [experienceVariations, setExperienceVariations] = useState<string[]>(
    []
  );
  const [portfolioVariations, setPortfolioVariations] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const sampleJSON = `{
  "description": "...",
  "skills_ids": { "skills_ids": ["fba4d8fa-5af3-4291-840d-92823568ca08"] },
  "experience_variation1": "...",
  "experience_variation2": "...",
  "experience_variation3": "...",
  "experience_variation4": "...",
  "experience_variation5": "...",
  "experience_variation6": "...",
  "experience_variation7": "...",
  "experience_variation8": "...",
  "experience_variation9": "...",
  "experience_variation10": "...",
  "portfolio_variations": { "portfolio_variation1": "...", "portfolio_variation2": "...", "portfolio_variation3": "...", "portfolio_variation4": "...", "portfolio_variation5": "...", "portfolio_variation6": "...", "portfolio_variation7": "...", "portfolio_variation8": "...", "portfolio_variation9": "...", "portfolio_variation10": "..." },
  "main_profile_id": "...",
  "label": "..."
}`;

  const parseExperience = (obj) => {
    const ex: string[] = [];
    for (let i = 1; i <= 10; i++) {
      if (obj[`experience_variation${i}`])
        ex.push(obj[`experience_variation${i}`]);
    }
    return ex;
  };

  const parsePortfolio = (obj) => {
    const port: string[] = [];
    for (let i = 1; i <= 10; i++) {
      if (obj.portfolio_variations?.[`portfolio_variation${i}`])
        port.push(obj.portfolio_variations[`portfolio_variation${i}`]);
    }
    return port;
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 p-6 bg-white rounded-2xl shadow">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Props:</span>
        <div className="text-xs bg-gray-100 p-2 rounded font-mono text-gray-600">
          skill_id: {skill_id} <br />
          main_profile_id: {main_profile_id} <br />
          skill_name: {skill_name}
        </div>
      </div>

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        onClick={async () => {
          const replaced = (Prompts.SKILL_GROUP || "")
            .replaceAll("{skill_id}", skill_id)
            .replaceAll("{main_profile_id}", main_profile_id)
            .replaceAll("{skill_name}", skill_name);
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
        onClick={() => {
          setMessage("");
          try {
            const obj = JSON.parse(pasted);
            const ok =
              obj &&
              typeof obj.description === "string" &&
              obj.skills_ids?.skills_ids?.includes(skill_id) &&
              obj.main_profile_id === main_profile_id &&
              typeof obj.label === "string";

            if (!ok) {
              setVerified(false);
              setMessage("Pasted object structure or IDs are incorrect");
              return;
            }

            setDescription(obj.description);
            setExperienceVariations(parseExperience(obj));
            setPortfolioVariations(parsePortfolio(obj));
            setLabel(obj.label);
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
            <label className="text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {experienceVariations.map((ex, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Experience Variation {idx + 1}
              </label>
              <input
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={ex}
                onChange={(e) => {
                  const arr = [...experienceVariations];
                  arr[idx] = e.target.value;
                  setExperienceVariations(arr);
                }}
              />
            </div>
          ))}

          {portfolioVariations.map((pf, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Portfolio Variation {idx + 1}
              </label>
              <input
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={pf}
                onChange={(e) => {
                  const arr = [...portfolioVariations];
                  arr[idx] = e.target.value;
                  setPortfolioVariations(arr);
                }}
              />
            </div>
          ))}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Label</label>
            <input
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                const body = {
                  description,
                  skills_ids: { skills_ids: [skill_id] },
                  experience_variation1: experienceVariations[0] || "",
                  experience_variation2: experienceVariations[1] || "",
                  experience_variation3: experienceVariations[2] || "",
                  experience_variation4: experienceVariations[3] || "",
                  experience_variation5: experienceVariations[4] || "",
                  experience_variation6: experienceVariations[5] || "",
                  experience_variation7: experienceVariations[6] || "",
                  experience_variation8: experienceVariations[7] || "",
                  experience_variation9: experienceVariations[8] || "",
                  experience_variation10: experienceVariations[9] || "",
                  portfolio_variations: portfolioVariations.reduce(
                    (acc, pf, i) => {
                      acc[`portfolio_variation${i + 1}`] = pf;
                      return acc;
                    },
                    {}
                  ),
                  main_profile_id,
                  label,
                };
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_PERSONAL_SITES_API_DOMAIN}dynamicGeneration/add`,
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
