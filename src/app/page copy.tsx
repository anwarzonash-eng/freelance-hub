// components/JobCard.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const JobCard = () => {
  const [upworkJobs, setUpworkJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(60);

  // NEW STATE: Tracks which job descriptions are expanded
  const [expandedJobs, setExpandedJobs] = useState({});

  // Ref to the audio element for playing the sound
  const audioRef = useRef(null);

  // --- Utility Functions (TimeAgo, FormatAmount, isSkillMatch) ---

  const timeAgo = (dateString) => {
    if (!dateString) return "Date unavailable";
    const seconds = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / 1000
    );
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} years ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} months ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)} days ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)} hours ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)} minutes ago`;
    return `${Math.floor(seconds)} seconds ago`;
  };

  const formatAmount = (amountString) => {
    if (!amountString) return null;
    const numericValue = parseFloat(amountString.replace(/[^0-9.]/g, ""));

    if (numericValue >= 1000) {
      const formatted = (numericValue / 1000).toFixed(0);
      return `$${formatted}k`;
    }
    return `$${numericValue}`;
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

  const isSkillMatch = (skillName) => {
    const normalizedSkill = skillName.toLowerCase();
    return myListedSkills.some(
      (listedSkill) => listedSkill.toLowerCase() === normalizedSkill
    );
  };

  // Helper component for Star Rating (using totalFeedback)
  const StarRating = ({ rating }) => {
    if (rating === undefined || rating === null) return null;
    const fullStars = Math.floor(rating);
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      let starClass = "w-4 h-4";
      if (i <= fullStars) {
        stars.push(
          <svg
            key={i}
            className={`${starClass} text-yellow-400 fill-current`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545-4.756-4.632 6.572-.955L10 0l2.889 5.858 6.572.955-4.756 4.632 1.123 6.545z" />
          </svg>
        );
      } else if (i === fullStars + 1 && rating - fullStars >= 0.25) {
        // Simple visual indicator for a fractional star (e.g., 4.5 star rating will show 5 yellow stars)
        // For simplicity in this large component, we use Math.round(rating) logic for star visuals.
        stars.push(
          <svg
            key={i}
            className={`${starClass} text-yellow-400 fill-current`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545-4.756-4.632 6.572-.955L10 0l2.889 5.858 6.572.955-4.756 4.632 1.123 6.545z" />
          </svg>
        );
      } else {
        stars.push(
          <svg
            key={i}
            className={`${starClass} text-gray-300 fill-current`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545-4.756-4.632 6.572-.955L10 0l2.889 5.858 6.572.955-4.756 4.632 1.123 6.545z" />
          </svg>
        );
      }
    }

    return (
      <div className="flex items-center">
        {stars.slice(0, 5)} {/* Ensure only 5 stars are drawn */}
        <span className="ml-1 font-semibold text-gray-700">
          {rating.toFixed(2)}/5
        </span>
      </div>
    );
  };

  // --- Handlers ---

  // NEW HANDLER: Toggles the expanded state for a specific job ID
  const toggleDescription = (jobId) => {
    setExpandedJobs((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  async function onLoad() {
    setLoading(true);

    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_PATH}upwork-job/latest`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch jobs.");
      }
      const fetchedCacheFile = await res.json();
      const newlyFetchedJobs = fetchedCacheFile.data;

      setUpworkJobs((prevUpworkJobs) => {
        const prevJobIds = new Set(prevUpworkJobs.map((job) => job.id));
        const newlyFoundJobs = [];

        for (const job of newlyFetchedJobs) {
          if (!prevJobIds.has(job.id)) {
            newlyFoundJobs.push(job);
          }
        }

        return newlyFetchedJobs;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenBestMatch = (jobData) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("currentJob", JSON.stringify(jobData));
      window.open("/best-match", "_blank");
    }
  };

  // --- Effects ---

  useEffect(() => {
    onLoad();

    const refreshInterval = setInterval(() => {
      onLoad();
    }, 60000);

    const timerInterval = setInterval(() => {
      setTimer((prevTimer) => (prevTimer <= 1 ? 60 : prevTimer - 1));
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(timerInterval);
    };
  }, []);

  // --- Render ---

  // if (loading) {
  //   return (
  //     <div className="flex justify-center items-center h-screen text-2xl font-semibold">
  //       <p>Loading jobs...</p>
  //     </div>
  //   );
  // }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-2xl font-semibold text-red-500">
        <p>An error occurred: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      {/* Timer and Refresh Button */}
      <div className="flex justify-between items-center my-4 p-4 bg-gray-100 rounded-lg shadow-inner">
        <div className="flex items-center space-x-2">
          <p className="font-semibold text-gray-700">Next Refresh:</p>
          <span className="text-lg font-bold text-indigo-600">{timer}s</span>
        </div>
        <button
          onClick={onLoad}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Refresh Now
        </button>
      </div>
      <h1 className="text-3xl font-bold text-center my-8">
        Freelance Platform Job Postings
      </h1>

      {upworkJobs.map((job) => {
        if (!job.id) return null;

        const jobUrl = `https://www.upwork.com/jobs/${job.ciphertext}`;

        const jobData = {
          id: job.id,
          ciphertext: job.ciphertext,
          title: job.title,
          description: job.description || "No description available.",
          skills: job.skills?.map((skill) => skill.prettyName),
        };

        const clientFeedback = job.client?.totalFeedback;
        const totalHires = job.client?.totalHires;
        const totalPostedJobs = job.client?.totalPostedJobs;

        const hiringRatio =
          totalHires !== undefined && totalPostedJobs > 0
            ? `${Math.round((totalHires / totalPostedJobs) * 100)}%`
            : null;

        // Check if the current job's description is expanded
        const isExpanded = expandedJobs[job.id];
        const jobDescription = job.description || "No description available.";

        return (
          <div
            key={job.id}
            className="max-w-4xl mx-auto p-6 my-4 bg-white rounded-lg shadow-md border border-gray-200"
          >
            {/* Header Section */}
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <p className="text-gray-500 text-sm mb-1">
                  {timeAgo(job.publishedDateTime)}
                </p>
                <h2 className="text-xl font-semibold text-gray-800">
                  {job.title}
                </h2>
              </div>
              <div className="flex-shrink-0 flex gap-2">
                <button
                  onClick={() => handleOpenBestMatch(jobData)}
                  className="px-3 py-1 bg-green-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Match
                </button>
                {job.ciphertext && (
                  <Link
                    href={jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-indigo-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Freelance Platform
                  </Link>
                )}
              </div>
            </div>

            {/* Client Metrics */}
            <div className="flex items-center flex-wrap gap-y-2 gap-x-4 text-sm text-gray-600 my-2">
              {/* Category from occupations */}
              {job.occupations?.category?.prefLabel && (
                <span className="inline-flex items-center text-gray-700 font-semibold bg-blue-100 px-2 py-0.5 rounded-md">
                  {job.occupations.category.prefLabel}
                </span>
              )}

              {/* Client Verification Status */}
              {job.client?.verificationStatus === "VERIFIED" && (
                <span className="inline-flex items-center bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {/* SVG for verified icon */}
                  Payment verified
                </span>
              )}

              {/* Total Feedback/Rating */}
              <StarRating rating={clientFeedback} />

              {/* Total Reviews */}
              {job.client?.totalReviews !== undefined && (
                <span className="text-gray-500 font-medium">
                  {job.client.totalReviews} Reviews
                </span>
              )}

              {/* Total Spent */}
              {job.client?.totalSpent?.displayValue && (
                <span className="text-gray-500 font-medium">
                  {formatAmount(job.client.totalSpent.rawValue)} Spent
                </span>
              )}

              {/* Total Posted Jobs */}
              {totalPostedJobs !== undefined && (
                <span className="text-gray-500 font-medium">
                  {totalPostedJobs} Jobs Posted
                </span>
              )}

              {/* Total Hires */}
              {totalHires !== undefined && (
                <span className="text-gray-500 font-medium">
                  {totalHires} Hires
                </span>
              )}

              {/* Hiring Ratio */}
              {hiringRatio && (
                <span className="inline-flex items-center bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  Hiring Ratio: {hiringRatio}
                </span>
              )}

              {/* Client Location */}
              {job.client?.location?.country && (
                <span className="inline-flex items-center text-gray-500">
                  {/* SVG for location icon */}
                  {job.client.location.country}
                </span>
              )}
            </div>

            {/* DESCRIPTION SECTION (Expandable) */}
            <div className="py-3 mt-3 border-t border-gray-200">
              {isExpanded ? (
                <div className="whitespace-pre-wrap text-gray-700">
                  {jobDescription}
                </div>
              ) : (
                // Show a snippet if not expanded, preventing error if description is missing
                <div className="text-gray-700 italic">
                  {jobDescription.length > 200
                    ? `${jobDescription.substring(0, 200)}...`
                    : jobDescription}
                </div>
              )}

              {/* Toggle Button */}
              {job.description && job.description.length > 0 && (
                <button
                  onClick={() => toggleDescription(job.id)}
                  className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none"
                >
                  {isExpanded ? "Read Less" : "Read More"}
                </button>
              )}
            </div>
            {/* END DESCRIPTION SECTION */}

            {/* Budget and Engagement Details */}
            <div className="pt-3 mt-3 border-t border-gray-200 text-gray-700 text-sm">
              {/* Hourly Budget Details */}
              {job.hourlyBudgetType && (
                <p className="font-semibold text-base mb-2">
                  <span className="text-indigo-600 font-bold">
                    Hourly:{" "}
                    {job.hourlyBudgetMin?.displayValue &&
                      `$${job.hourlyBudgetMin.displayValue}`}{" "}
                    {job.hourlyBudgetMin?.displayValue &&
                      job.hourlyBudgetMax?.displayValue &&
                      ` - `}
                    {job.hourlyBudgetMax?.displayValue &&
                      `$${job.hourlyBudgetMax.displayValue}`}
                  </span>
                  {job.experienceLevel && (
                    <span className="ml-2 inline-flex items-center bg-gray-200 text-gray-800 text-sm px-2 py-0.5 rounded-full font-medium">
                      {job.experienceLevel}
                    </span>
                  )}
                </p>
              )}
              {/* Fixed Price Amount (If applicable) */}
              {job.amount?.displayValue &&
                job.amount.displayValue !== "0.0" &&
                !job.hourlyBudgetType && (
                  <p className="font-semibold text-base mb-2 text-indigo-600 font-bold">
                    Fixed Price: {job.amount.displayValue}
                  </p>
                )}

              {/* Engagement Duration */}
              {(job.engagementDuration?.label || job.engagement) && (
                <p className="mt-1">
                  Est. time: {job.engagementDuration?.label || "N/A"},{" "}
                  {job.engagement || "N/A"}
                </p>
              )}
            </div>

            {/* Skills Tags */}
            {job.skills && (
              <div className="flex flex-wrap gap-2 mt-4">
                {job.skills.map((skill) => (
                  <span
                    key={skill.name}
                    className={`bg-gray-200 text-gray-800 text-xs px-3 py-1 rounded-full ${
                      isSkillMatch(skill.prettyName) ? "bg-yellow-300" : ""
                    }`}
                  >
                    {skill.prettyName}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default JobCard;
