"use client";

import { useState } from "react";
import DropdownTableSearch from "../ui/DropdownTableSearch";

const PromptGenerator = (props) => {
  const [prompt, setPrompt] = useState("");
  const [selectedPortfolios, setSelectedPortfolios] = useState([]);
  const generatePrompt = () => {
    const { title, description, skills } = props;
    console.log({ selectedPortfolios });

    const upworkJobDetails = `
Job Title: ${title}
Job Description: ${description}
Required Skills: ${skills}
`;

    const sophisticatedPrompt = `
You are an expert copywriter with a friendly, conversational, and human tone.
Your task is to write a compelling cover letter for the following Freelance Platform job post.

**Job Details:**
${upworkJobDetails}

Please Attach the following Portfolio URLs to showcase relevant experience: 
${selectedPortfolios.join("\n")}

**Instructions:**
1.  **Tone and Style:** Write the cover letter in a conversational, human, and professional tone. Avoid generic or overly formal language.
2.  **Structure:** The letter should be structured to immediately grab the client's attention.
    * **Opening:** Start with a brief, punchy acknowledgment of the job, demonstrating you've read the details.
    * **Value Proposition:** Clearly and concisely explain why you are the perfect fit, directly linking your skills (from the 'Required Skills' list) to the 'Job Description'.
    * **Experience Examples:** Briefly mention how your past projects relate to the client's needs.
    * **Call to Action:** End with a specific, friendly call to action (e.g., suggesting a quick 10-minute chat).
3.  **Skill Explanation:** For the skill list provided, briefly explain why each skill is crucial for this specific project.
4.  **Portfolios:** For the Portfolio list provided, attach them as they are.

4.  **Final Output:** Present ONLY the cover letter first, followed by the skill explanation section.

    `;

    setPrompt(sophisticatedPrompt.trim());
  };

  const copyPrompt = () => {
    if (prompt) {
      navigator.clipboard.writeText(prompt);
      alert("Prompt copied to clipboard!");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-lg space-y-4">
      <div className="flex flex-col gap-4 justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Prompt Generator</h2>
        <DropdownTableSearch
          data={props.selectedWebsite.urls.filter(
            (profile) => profile.is_portfolio_detail
          )}
          valueKey="tiny_link_with_u"
          displayKeys={["page"]} // Columns to show in the dropdown
          imageKeys={[]} // No images in this case
          isMultiSelect={true}
          mainDisplayKey="page" // Text to show in the button after selection
          initialSelectValue={selectedPortfolios}
          setInitialSelectValue={setSelectedPortfolios}
        />

        <div className="flex space-x-2 text-sm text-gray-500">
          <p>
            Job: <span className="font-semibold">{props.title}</span>
          </p>
          <p>
            Skills: <span className="font-semibold">{props.skills.length}</span>
          </p>
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Click 'Generate Prompt' to create a sophisticated cover letter request for Gemini or ChatGPT..."
        rows={15}
        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm font-mono whitespace-pre-wrap"
      />

      <div className="flex space-x-4">
        <button
          onClick={generatePrompt}
          className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-150 shadow-md"
        >
          Generate Prompt
        </button>
        <button
          onClick={copyPrompt}
          disabled={!prompt}
          className={`w-1/3 py-2 px-4 rounded-lg font-medium transition duration-150 ${
            prompt
              ? "bg-green-500 text-white hover:bg-green-600 shadow-md"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Copy Prompt
        </button>
      </div>
    </div>
  );
};

export default PromptGenerator;
