"use client";
import React, { useState } from "react";
import { Prompts } from "@/utils/global";

type CreateSkillGroupProps = {
  skill_ids: string[];
  skill_names: string[];
  main_profile_id: string;
  onSuccess?: () => void;
};

export default function CreateSkillGroup({
  skill_ids,
  skill_names,
  main_profile_id,
  onSuccess,
}: CreateSkillGroupProps) {
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
  const [isMultiple, setIsMultiple] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);

  const sampleJSON = `{
  "description": "...",
  "skills_ids": { "skills_ids": ["<MATCHING_SKILL_ID>"] },
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
          skill_ids: {JSON.stringify(skill_ids)} <br />
          main_profile_id: {main_profile_id} <br />
          skill_names: {JSON.stringify(skill_names)}
        </div>
      </div>

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        onClick={async () => {
          // Build prompt for single or multiple skill names.
          const names = skill_names.join(", ");
          let prompt = (Prompts.SKILL_GROUP || "").replaceAll(
            "{main_profile_id}",
            main_profile_id
          );
          // Provide skill_name(s)
          prompt = prompt.replaceAll("{skill_name}", names);
          // Provide a mapping hint line at the end to correlate ids in order
          const mapping = skill_names
            .map((n, i) => `${n} => ${skill_ids[i] || "MISSING_ID"}`)
            .join("; ");
          const replaced = `${prompt}\n\nId Mapping (in order): ${mapping}`;
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
        onClick={() => {
          setMessage("");
          try {
            const parsed = JSON.parse(
              pasted.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) =>
                match.replace(/\r?\n/g, "\\n")
              )
            );
            const arrayInput = Array.isArray(parsed) ? parsed : [parsed];
            setIsMultiple(Array.isArray(parsed));

            // basic validation for each
            for (const obj of arrayInput) {
              // For skill_id validation: the object's skill_id should be one of the selected skill_ids
              const hasValidSkillId = 
                Array.isArray(obj.skills_ids?.skills_ids) &&
                obj.skills_ids.skills_ids.length >= 1 &&
                obj.skills_ids.skills_ids.some((id: string) => skill_ids.includes(id));
              
              const ok =
                obj &&
                typeof obj.description === "string" &&
                hasValidSkillId &&
                obj.main_profile_id === main_profile_id &&
                typeof obj.label === "string";
              if (!ok) {
                setVerified(false);
                setMessage("Pasted object structure or IDs are incorrect. Make sure each skill group has a valid skill_id from your selection.");
                return;
              }
            }

            if (Array.isArray(parsed)) {
              setGroups(parsed);
              setVerified(true);
              setMessage(`Verified ✅ (${parsed.length} groups)`);
            } else {
              const obj = parsed;
              setDescription(obj.description);
              setExperienceVariations(parseExperience(obj));
              setPortfolioVariations(parsePortfolio(obj));
              setLabel(obj.label);
              setVerified(true);
              setMessage("Verified ✅");
            }
          } catch {
            setVerified(false);
            setMessage("Invalid JSON");
          }
        }}
      >
        Verify
      </button>

      {verified && !isMultiple && (
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
                  skills_ids: { skills_ids: [skill_ids[0]] },
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
                // Use API handler (default base URL)
                const { addSkillGroup } = await import(
                  "@/app/api_handlers/api/skill_groups.api"
                );
                const data = await addSkillGroup(body);
                if (data && data.APIStatus === "success") {
                  setMessage("✅ Success");
                  onSuccess && onSuccess();
                } else setMessage(JSON.stringify(data?.message) || "Error ❌");
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

      {verified && isMultiple && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">
            {groups.length} Skill Group(s)
          </h3>

          {groups.map((group, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 flex flex-col gap-3 bg-gray-50"
            >
              <h4 className="font-medium text-gray-900">
                {index + 1}. {group.label}
              </h4>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Label
                </label>
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={group.label}
                  onChange={(e) => {
                    const updated = [...groups];
                    updated[index].label = e.target.value;
                    setGroups(updated);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[80px]"
                  value={group.description}
                  onChange={(e) => {
                    const updated = [...groups];
                    updated[index].description = e.target.value;
                    setGroups(updated);
                  }}
                />
              </div>

              {/* Experience Variations */}
              <div className="border-t pt-3 mt-2">
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Experience Variations (10)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <div key={num} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">
                        Experience {num}
                      </label>
                      <textarea
                        className="border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm min-h-[60px]"
                        value={group[`experience_variation${num}`] || ""}
                        onChange={(e) => {
                          const updated = [...groups];
                          updated[index][`experience_variation${num}`] = e.target.value;
                          setGroups(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Portfolio Variations */}
              <div className="border-t pt-3 mt-2">
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Portfolio Variations (10)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <div key={num} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">
                        Portfolio {num}
                      </label>
                      <textarea
                        className="border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm min-h-[60px]"
                        value={group.portfolio_variations?.[`portfolio_variation${num}`] || ""}
                        onChange={(e) => {
                          const updated = [...groups];
                          if (!updated[index].portfolio_variations) {
                            updated[index].portfolio_variations = {};
                          }
                          updated[index].portfolio_variations[`portfolio_variation${num}`] = e.target.value;
                          setGroups(updated);
                        }}
                      />
                    </div>
                  ))}
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
                const { addBulkSkillGroups } = await import(
                  "@/app/api_handlers/api/skill_groups.api"
                );
                const data = await addBulkSkillGroups(groups);
                if (data && data.APIStatus === "success") {
                  setMessage("✅ Success");
                  onSuccess && onSuccess();
                } else setMessage(JSON.stringify(data?.message) || "Error ❌");
              } catch {
                setMessage("Error ❌");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving..." : `Save ${groups.length} Skill Group(s)`}
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
