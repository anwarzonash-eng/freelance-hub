"use client";

import { Job, queryJob } from "@/lib/job_matcher";
import { useEffect, useState } from "react";
import ExpandCollapse from "./ExpandCollapse";
import GenericPopup from "../components/popups/GenericPopup";
import CreateDynamicPersonalWebsite from "./create_personal_websites/createDynamicPersonalWebsite";
import WebsiteURLs from "./create_personal_websites/websiteUrls";
import PromptGenerator from "./upwork-jobs/PromptGenerator";

type MatchResult = {
  id: string;
  title: string;
  similarity: number;
  link: string;
  skills: string;
  earnings: string;
  description: string;
};

const myListedSkills = [
  "React",
  "AngularJS",
  "Next.js",
  "JavaScript",
  "Node.js",
  "TypeScript",
  "Front-End Development",
  "Back-End Development",
  "API",
  "Web Development",
  "PostgreSQL",
  "MongoDB",
  "WordPress",
  "Shopify",
  "Tailwind CSS",
];

function MatchedSkills({ str1, str2 }) {
  // Helper to normalize skill for matching
  const normalize = (s: string) =>
    s
      .replace(/\.js/gi, "")
      .replace(/-/g, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .toLowerCase()
      .trim();

  // Convert multiline string to array, trim and normalize
  const inputSkills = str1
    ? str1
        .split("\n")
        .map((s) => normalize(s))
        .filter((s) => s.length > 0)
    : [];

  // Also split input into words and normalize each word
  const inputWords = str1
    ? str1.split("\n").flatMap((skill) =>
        skill
          .replace(/,/g, " ")
          .split(" ")
          .map((w) => normalize(w))
          .filter((w) => w.length > 0)
      )
    : [];

  // Normalize listed skills for matching, but keep original for display
  const listedSkills = str2.map((s) => ({
    original: s,
    normalized: normalize(s),
  }));

  // Find matched skills: if any normalized input skill or word matches listed skill
  const matchedSet = new Set([...inputSkills, ...inputWords]);
  const matchedSkills = listedSkills.filter((skill) =>
    matchedSet.has(skill.normalized)
  );
  const totalMatched = matchedSkills.length;
  const matchPercentage =
    listedSkills.length > 0
      ? Math.round((totalMatched / listedSkills.length) * 100)
      : 0;

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {listedSkills.map((skill, index) => {
          const isMatched =
            matchedSet.has(skill.normalized) && matchedSet.size > 0;
          return (
            <div
              key={index}
              className={`px-4 py-2 rounded-xl shadow-sm text-sm font-medium ${
                isMatched
                  ? "bg-green-300 text-green-800"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              {skill.original}
            </div>
          );
        })}
      </div>
      <div className="text-gray-700 font-semibold">
        Total Matched: {totalMatched} / {listedSkills.length} ({matchPercentage}
        %)
      </div>
    </div>
  );
}
function DetailsModal({ item, onClose, currentJobSkill }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0  z-50 flex flex-col bg-white text-black">
      {/* Header */}
      <div className="flex  justify-between items-center p-4 border-b shadow">
        <div>
          <h2 className="text-xl font-bold ">{item.title}</h2>

          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View Job
            </a>
          ) : (
            <span className="text-gray-400">No link</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-red-600 font-bold text-2xl"
        >
          ✕
        </button>
      </div>

      {/* Content (scrollable if big) */}
      <div className="p-6 overflow-y-auto flex-1">
        <p className="mb-4">
          <span className="font-semibold">Earnings:</span> {item.earnings}
        </p>

        <div className="mb-4">
          <span className="font-semibold">Skills:</span>
          <div className="flex flex-wrap gap-2 mt-2">
            <MatchedSkills str1={currentJobSkill} str2={item.skills} />
          </div>
        </div>

        <p className="text-gray-700 whitespace-pre-line">{item.description}</p>
      </div>
    </div>
  );
}

export default function JobMatcher() {
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [description, setDescription] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [openCloseWebsiteCreatePopUP, setOpenCloseWebsiteCreatePopUP] =
    useState(false);
  const [openCloseGeneratePromptPopUP, setOpenCloseGeneratePromptPopUP] =
    useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedData = sessionStorage.getItem("currentJob");
      if (storedData) {
        try {
          const jobData = JSON.parse(storedData);

          // Populate the input fields with the retrieved data
          setTitle(jobData.title || "");
          setDescription(jobData.description || "");

          // Format skills from an array to a string with new lines
          if (Array.isArray(jobData.skills)) {
            setSkills(jobData.skills.join("\n"));
          } else {
            setSkills(jobData.skills || "");
          }

          // You can also clear the session storage item if you wish
          // to prevent the data from persisting across refreshes.
          // sessionStorage.removeItem("currentJob");
        } catch (e) {
          // console.error("Failed to parse stored job data:", e);
        }
      }
    }
  }, []);

  const handleSubmit = async () => {
    if (!title || !skills || !description) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    const newJob: any = { title, skills, description };
    try {
      const matches = await queryJob(newJob);
      setResults(matches);
    } catch (err) {
      console.error(err);
      alert("Error matching jobs. Check logs.");
    }

    setLoading(false);
  };

  const handleClear = () => {
    setTitle("");
    setSkills("");
    setDescription("");
    setResults([]);
    setSelectedWebsite(null);
  };

  return (
    <>
      {/* Modal */}
      {openCloseWebsiteCreatePopUP && (
        <GenericPopup
          title="Create Website"
          onClose={() => setOpenCloseWebsiteCreatePopUP(false)}
        >
          <CreateDynamicPersonalWebsite
            isCloseOnSelect={true}
            setOpenCloseWebsiteCreatePopUP={setOpenCloseWebsiteCreatePopUP}
            setSelectWebsite={setSelectedWebsite}
            selectedWebsite={selectedWebsite}
            description={
              "Title:" +
              title +
              "\r\n \r\n \r\n" +
              description +
              "\r\n  \r\n \r\n" +
              skills
            }
          />
        </GenericPopup>
      )}
      {openCloseGeneratePromptPopUP && (
        <GenericPopup
          title="Generate Prompt"
          onClose={() => setOpenCloseGeneratePromptPopUP(false)}
        >
          <PromptGenerator
            title={title}
            description={description}
            skills={skills}
            selectedWebsite={selectedWebsite}
          />
        </GenericPopup>
      )}

      {selectedJob && (
        <DetailsModal
          item={selectedJob}
          onClose={() => setSelectedJob(null)}
          currentJobSkill={skills}
        />
      )}
      <div className="w-full p-6 ">
        <h2 className="text-2xl font-bold mb-6">Job Matcher</h2>

        {/* Input Fields in Separate Rows */}
        <div className="flex flex-col gap-4 mb-6">
          <input
            type="text"
            placeholder="Title"
            className="border p-3 rounded w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex gap-4 mb-6">
            <textarea
              // type="text"
              placeholder="Skills (One Skill per Line)"
              className="border p-3 rounded w-full"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              rows={15}
            />

            <textarea
              placeholder="Description"
              className="border p-3 rounded w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:bg-blue-300"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Matching..." : "Find Matches"}
          </button>

          <button
            className="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-600"
            onClick={handleClear}
          >
            Clear
          </button>

          <button
            className="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-600"
            onClick={() => {
              setSelectedWebsite(null);
              setOpenCloseWebsiteCreatePopUP(true);
            }}
          >
            Create Website
          </button>

          {selectedWebsite !== null && (
            <button
              className="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-600"
              onClick={() => {
                setOpenCloseGeneratePromptPopUP(true);
              }}
            >
              Generate Prompt
            </button>
          )}
        </div>
        <WebsiteURLs data={selectedWebsite} setData={setSelectedWebsite} />
        <MatchedSkills str1={skills} str2={myListedSkills} />

        {/* <ExpandCollapse
          title={<span className="text-lg font-semibold">Matched Jobs</span>}
          defaultOpen={false}
        > */}
        {/* Results Table */}
        {results?.length > 0 && (
          <div className="w-full overflow-x-auto border rounded-lg shadow">
            <div className="grid grid-cols-5  font-semibold p-3 text-sm ">
              <div>Title</div>
              <div>Link</div>
              <div>Earnings</div>
              <div>Skills</div>
              <div className="text-right">Similarity</div>
            </div>

            {results?.map((job) => (
              <div
                key={job.id}
                className="grid grid-cols-5 border-t p-3 text-sm items-center"
              >
                <div
                  className="font-bold hover:scale-105 hover:underline transition-transform"
                  onClick={() => setSelectedJob(job)}
                >
                  {job.title}
                </div>

                <div>
                  {job.link ? (
                    <a
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Job
                    </a>
                  ) : (
                    <span className="text-gray-400">No link</span>
                  )}
                </div>
                <div className="font-medium">{job.earnings}</div>
                <MatchedSkills str1={skills} str2={job.skills} />
                {/* <div className="text-gray-700">{job.skills}</div> */}
                <div className="text-right">{job.similarity.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
        {/* </ExpandCollapse> */}
      </div>
    </>
  );
}
