import { Prompts } from "@/utils/global";

import React, { useState, useEffect } from "react";

interface CopyPromptComponentProps {
  jobDescriptionRaw: any;
  selectedSkills: string[];
  setCV4Content: (content: any) => void;
  yearsOfExperience: number;
  setTextArea: (content: any) => void;
  textArea: string;
}
const experienceYearsMap: any = {
  1: 1,
  2: 1,
  3: 2,
  4: 3,
  5: 3,
  6: 4,
  7: 5,
  8: 5,
};
const CopyPromptComponent: React.FC<CopyPromptComponentProps> = ({
  jobDescriptionRaw,
  selectedSkills,
  setCV4Content,
  yearsOfExperience,
  setTextArea,
  textArea,
}) => {
  const [input, setInput] = useState("");

  const [inputSummary, setInputSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [form, setForm] = useState<any | null>(null);

  const validateJson = (json: any) => {
    if (
      Object.keys(json).length != (experienceYearsMap[yearsOfExperience] || 5)
    )
      return (
        "Each experience length must be " +
        experienceYearsMap[yearsOfExperience]
      );
    for (let i = 1; i <= experienceYearsMap[yearsOfExperience]; i++) {
      const key = `experience${i}`;
      if (
        !json[key] ||
        !Array.isArray(json[key]) ||
        (json[key].length !== 3 && json[key].length !== 4)
      ) {
        return `Each experience must have exactly 3 or 4 points. Issue with ${key}`;
      }
      for (const item of json[key]) {
        if (!item.point || typeof item.point !== "string") {
          return `Each point in ${key} must have a 'point' string.`;
        }
      }
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setError(null);
  };

  const handleBlur = () => {
    try {
      console.log(input);
      const parsed = JSON.parse(input);
      const validationError = validateJson(parsed);
      if (validationError) {
        setError(validationError);
        setCV4Content(null);
        setForm(null);
        return;
      }
      setForm(parsed);
      setCV4Content(parsed);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setCV4Content(null);
      setForm(null);
    }
  };

  const handleInputChangeSummary = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInputSummary(e.target.value);
    setErrorSummary(null);
  };

  const validateJsonSummary = (json: any) => {
    if (!json.summary) return "Summary Doesn't Exist!";

    return null;
  };

  const handleBlurSummary = () => {
    try {
      const parsed = JSON.parse(inputSummary);
      const validationError = validateJsonSummary(parsed);
      if (validationError) {
        setErrorSummary(validationError);
        setTextArea(null);
        return;
      }

      setTextArea(parsed.summary);
      setErrorSummary(null);
    } catch (err) {
      console.error(err);
      setErrorSummary(err.message);
      setTextArea(null);
    }
  };

  useEffect(() => {
    handleBlur();
  }, [yearsOfExperience]);

  const handleFormChange = (expKey: string, idx: number, value: string) => {
    if (!form) return;
    const updated = { ...form };
    updated[expKey][idx].point = value;
    setForm(updated);
    setCV4Content(updated);
  };
  function copyPrompt(type: string) {
    const muSkillsList = selectedSkills
      .map((skill: any) => {
        return skill.title;
      })
      .join("\n");

    const jobDescription =
      typeof jobDescriptionRaw === "object"
        ? `Job Tiltle:
    ${jobDescriptionRaw?.title}}

Job Description:
    ${jobDescriptionRaw?.description}
        `
        : jobDescriptionRaw;

    let prompt = (
      type == "cv_summary_and_job_titles"
        ? Prompts.GENERATE_SUMMARY_DESCRIPTION_SKILLS
        : Prompts.GENERATE_CV4_EXPERIENCES_CONTENT
    ).replace("{selected_skills}", muSkillsList);

    prompt = prompt.replace("{job_description}", jobDescription);
    prompt = prompt.replace(
      "{years_of_experience}",
      experienceYearsMap[yearsOfExperience] || "5",
    );
    navigator.clipboard.writeText(prompt);
  }

  return (
    <div className="flex gap-3">
      <div className=" w-full bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Experience Content
          </h3>
          <button
            type="button"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition font-semibold text-sm"
            onClick={() => {
              copyPrompt("experience_title");
            }}
          >
            Copy Experience Content Generation Prompt
          </button>
        </div>
        <label
          className="block text-sm font-medium text-gray-700 mb-2"
          htmlFor="cv4-json-input"
        >
          Paste your JSON below:
        </label>
        <textarea
          id="cv4-json-input"
          rows={16}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono bg-gray-50 resize-y transition"
          value={input}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="Paste your JSON here..."
        />
        {error && (
          <div className="mt-2 text-red-600 font-medium text-sm border border-red-200 bg-red-50 rounded p-2">
            {error}
          </div>
        )}

        {/* Render dynamic form if JSON is valid */}
        {form && !error && (
          <form className="mt-8 space-y-8">
            {Object.keys(form).map((expKey, expIdx) => (
              <div key={expKey} className="mb-6">
                <h4 className="text-lg font-semibold text-indigo-700 mb-2">
                  {expKey.replace("experience", "Experience ")}
                </h4>
                <div className="space-y-4">
                  {form[expKey].map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <label className="text-gray-600 font-medium mt-2">
                        Point {idx + 1}:
                      </label>
                      <textarea
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono bg-gray-50 resize-y transition"
                        rows={2}
                        value={item.point}
                        onChange={(e) =>
                          handleFormChange(expKey, idx, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </form>
        )}
      </div>
      <div className=" w-full bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Summary & Job Titles
          </h3>
          <button
            type="button"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition font-semibold text-sm"
            onClick={() => {
              copyPrompt("cv_summary_and_job_titles");
            }}
          >
            Copy CV Summary & Experience Title Prompt
          </button>
        </div>
        <label
          className="block text-sm font-medium text-gray-700 mb-2"
          htmlFor="cv4-json-input"
        >
          Paste your JSON below:
        </label>
        <textarea
          id="cv4-json-input"
          rows={16}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono bg-gray-50 resize-y transition"
          value={inputSummary}
          onChange={handleInputChangeSummary}
          onBlur={handleBlurSummary}
          placeholder="Paste your JSON here..."
        />
        {errorSummary && (
          <div className="mt-2 text-red-600 font-medium text-sm border border-red-200 bg-red-50 rounded p-2">
            {errorSummary}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            AI CV Description
          </label>
          <textarea
            value={textArea}
            onChange={(e) => setTextArea(e.target.value)}
            rows={3}
            placeholder="Enter your CV description..."
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default CopyPromptComponent;
