// components/JobCard.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  addSubmittedUPworkJobs,
  getALLUPworkJobs,
  getSubmittedUPworkJobs,
} from "../api_handlers/api/upwork.api";
import { matchJob } from "../api_handlers/api/detail_profiles.api";
import { useSearchParams } from "next/navigation";
import FilterForLatestUpworkJobs from "../components/upwork-jobs/FilterForLatestUpworkJobs";
import MatchResults from "../components/upwork-jobs/MatchResults";
import { useInterval } from "react-use";

const JobCard = () => {
  const searchParam = useSearchParams();
  const type = searchParam.get("type");
  // useEffect(() => {
  //   alert(type);
  // }, []);

  const [allUpworkJobs, setallUpworkJobs] = useState([]);
  const [newUpworkJobs, setNewUpworkJobs] = useState([]);
  const [filteredUpworkJobs, setfilteredUpworkJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterObject, setFilterObject] = useState(null);

  const [timer, setTimer] = useState(60);

  // NEW STATE: Tracks which job descriptions are expanded
  const [expandedJobs, setExpandedJobs] = useState({});

  // NEW STATE: Tracks match results for each job
  const [matchResults, setMatchResults] = useState({});
  const [matchLoadingState, setMatchLoadingState] = useState({});

  // Ref to the audio element for playing the sound
  const audioRef = useRef(null);

  // --- Utility Functions (TimeAgo, FormatAmount, isSkillMatch) ---

  async function showNotification(length, newJobs: any) {
    const randomSuffix = Math.floor(Math.random() * 1000);
    const uniqueTag = `event_${Date.now()}_${randomSuffix}`;
    const notificationOptions: NotificationOptions = {
      body: newJobs?.length > 0 ? newJobs[0].title : "",
      // icon: "/icon-192x192.png", // Optional: Path to an icon in your public folder
      tag: uniqueTag, // Optional: Allows you to replace an existing notification
      requireInteraction: false,
      // You can add an image, vibrate pattern, etc. here
    };

    new Notification(length + " New found", notificationOptions);
  }

  function filterJobs(jobs) {
    let tmpFIlteredJobs = JSON.parse(JSON.stringify(jobs));
    if (filterObject?.reviews) {
      tmpFIlteredJobs = tmpFIlteredJobs.filter((job) => {
        if (job.client?.totalFeedback >= filterObject.reviews) return true;
        else return false;
      });
    }
    if (filterObject?.selectedCategories.length > 0) {
      tmpFIlteredJobs = tmpFIlteredJobs.filter((job) => {
        if (filterObject.selectedCategories.includes(job.subcategory))
          return true;
        else return false;
      });
    }
    if (filterObject?.spent > 0) {
      tmpFIlteredJobs = tmpFIlteredJobs.filter((job) => {
        const value = Number(job.client?.totalSpent?.rawValue ?? 0);
        if (value >= filterObject.spent) return true;
        else return false;
      });
    }
    if (filterObject?.matchedSkills > 0) {
      tmpFIlteredJobs = tmpFIlteredJobs.filter((job) => {
        const value = Number(job.matchedSkillsPercentage ?? 0);
        if (value >= filterObject.matchedSkills) return true;
        else return false;
      });
    }

    // Apply job type filter (All, Fixed, or Hourly)
    if (filterObject?.jobType && filterObject.jobType !== "all") {
      tmpFIlteredJobs = tmpFIlteredJobs.filter((job) => {
        const isHourly = !!job.hourlyBudgetType;
        if (filterObject.jobType === "hourly") {
          return isHourly;
        } else if (filterObject.jobType === "fixed") {
          return !isHourly;
        }
        return true;
      });
    }

    // Apply hourly rate and fixed amount filters independently
    if (
      (filterObject?.hourlyRate ?? 0) > 0 ||
      (filterObject?.fixedAmount ?? 0) > 0
    ) {
      const hourlyThreshold = Number(filterObject?.hourlyRate ?? 0);
      const fixedThreshold = Number(filterObject?.fixedAmount ?? 0);

      tmpFIlteredJobs = tmpFIlteredJobs.filter((job) => {
        const isHourly = !!job.hourlyBudgetType;

        if (isHourly) {
          // If hourly filter provided, apply; else keep
          if (hourlyThreshold > 0) {
            const minRaw = Number(
              job.hourlyBudgetMin?.rawValue ??
                job.hourlyBudgetMin?.displayValue ??
                0,
            );
            // If min is missing, keep as earlier behavior
            if (!job.hourlyBudgetMin) return true;
            return minRaw >= hourlyThreshold;
          }
          return true;
        } else {
          // Fixed jobs
          if (fixedThreshold > 0) {
            const amountRaw = Number(
              job.amount?.rawValue ?? job.amount?.displayValue ?? 0,
            );
            // If amount missing, exclude from fixed filter
            if (!job.amount?.displayValue && job.amount?.rawValue === undefined)
              return false;
            return amountRaw >= fixedThreshold;
          }
          return true;
        }
      });
    }

    if (filterObject?.hiringRatio > 0) {
      tmpFIlteredJobs = tmpFIlteredJobs.filter((job) => {
        const value = Number(job.hiringRatio ?? 0);
        if (value >= filterObject.hiringRatio) return true;
        else return false;
      });
    }
    console.log({ tmpFIlteredJobs });

    return tmpFIlteredJobs;
  }
  useEffect(() => {
    setfilteredUpworkJobs(filterJobs(allUpworkJobs));
  }, [filterObject, allUpworkJobs]);

  async function onLoad() {
    setLoading(true);

    setError(null);
    try {
      const res =
        type == "all"
          ? await getALLUPworkJobs()
          : await getSubmittedUPworkJobs();

      if (!res) {
        setLoading(false);
        return;
      }

      let newlyFetchedJobs = res.data;
      const updatedData = newlyFetchedJobs.map((job) => {
        const totalHires = job.client?.totalHires;
        const totalPostedJobs = job.client?.totalPostedJobs;

        const hiringRatio =
          totalHires !== undefined && totalPostedJobs > 0
            ? `${Math.round((totalHires / totalPostedJobs) * 100)}`
            : null;

        return {
          ...job,
          matchedSkillsPercentage: calculateMatchPercentage(job.skills),
          hiringRatio: hiringRatio,
        };
      });
      newlyFetchedJobs = updatedData;
      console.log({ allUpworkJobs });
      if (allUpworkJobs.length === 0) {
        setallUpworkJobs(newlyFetchedJobs);
        setLoading(false);
        return;
      }

      const newlyFoundJobs = [];
      console.log({ allUpworkJobs });
      const prevJobIds = new Set(allUpworkJobs.map((job) => job.id));

      for (const job of newlyFetchedJobs) {
        if (!prevJobIds.has(job.id)) {
          newlyFoundJobs.push(job);
        }
      }
      // newlyFoundJobs.push({ go: "asdf" });
      const filteredNewJobs = filterJobs(newlyFoundJobs);
      if (filteredNewJobs.length > 0)
        showNotification(filteredNewJobs.length, filteredNewJobs);
      console.log({ newlyFoundJobs, filteredNewJobs, prevJobIds });
      setNewUpworkJobs(newlyFoundJobs);
      setallUpworkJobs(newlyFetchedJobs);
      setLoading(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const timeAgo = (dateString) => {
    if (!dateString) return "Date unavailable";
    const seconds = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / 1000,
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

    // Convert to number (handles "1.212905597E7" automatically)
    const numericValue = Number(amountString);
    if (isNaN(numericValue)) return null;

    if (numericValue >= 1_000_000_000) {
      return `$${(numericValue / 1_000_000_000)
        .toFixed(1)
        .replace(/\.0$/, "")}B`;
    }
    if (numericValue >= 1_000_000) {
      return `$${(numericValue / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (numericValue >= 1_000) {
      return `$${(numericValue / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
    }

    return `$${numericValue}`;
  };

  const myListedSkills = [
    "React",
    "Next.js",
    "JavaScript",
    "Node.js",
    "TypeScript",
    "API",
    "Web Development",
    "WordPress",
    "PHP",
    "CSS",
    "HTML5",
    "HTML",
    "Python",
    "Web Design",
    "API Integration",
  ];

  const isSkillMatch = (skillName) => {
    const normalizedSkill = skillName.toLowerCase();
    return myListedSkills.some(
      (listedSkill) => listedSkill.toLowerCase() === normalizedSkill,
    );
  };

  const calculateMatchPercentage = (jobSkills) => {
    if (!jobSkills || jobSkills.length === 0) return 0;

    // Normalize the user's list for efficient lookup
    const normalizedListedSkills = myListedSkills.map((s) => s.toLowerCase());

    // Count how many of the job's skills match the user's listed skills
    const matchedCount = jobSkills.reduce((count, skill) => {
      const normalizedJobSkill = skill.prettyName.toLowerCase();

      // Check if the job skill exists in the user's normalized list
      if (normalizedListedSkills.includes(normalizedJobSkill)) {
        return count + 1;
      }
      return count;
    }, 0);

    // Calculate the percentage based on the job's total required skills
    const percentage = (matchedCount / jobSkills.length) * 100;

    // Return the percentage, rounded to the nearest whole number
    return Math.round(percentage);
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
          </svg>,
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
          </svg>,
        );
      } else {
        stars.push(
          <svg
            key={i}
            className={`${starClass} text-gray-300 fill-current`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545-4.756-4.632 6.572-.955L10 0l2.889 5.858 6.572.955-4.756 4.632 1.123 6.545z" />
          </svg>,
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

  // NEW HANDLER: Handle job matching
  const handleMatchJob = async (jobData) => {
    const jobId = jobData.id;

    // If match results already exist, toggle them
    if (matchResults[jobId]) {
      setMatchResults((prev) => ({
        ...prev,
        [jobId]: prev[jobId] ? null : matchResults[jobId],
      }));
      return;
    }

    // Otherwise, fetch match results
    try {
      setMatchLoadingState((prev) => ({ ...prev, [jobId]: true }));

      const payload = {
        title: jobData.title,
        description: jobData.description,
        skills: jobData.skills || [],
      };

      const response = await matchJob(payload);

      setMatchResults((prev) => ({
        ...prev,
        [jobId]: response,
      }));
    } catch (err) {
      console.error("Error matching job:", err);
      alert("Failed to match job. Please try again.");
    } finally {
      setMatchLoadingState((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleOpenBestMatch = (jobData) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("currentJob", JSON.stringify(jobData));
      window.open("/best-match", "_blank");
    }
  };
  const handleMarkSubmitted = async (jobData) => {
    await addSubmittedUPworkJobs(jobData);
  };

  // --- Effects ---

  useInterval(() => {
    if (type == "all") onLoad();
  }, 60000);

  // const refreshInterval = setInterval(() => {
  //   onLoad();
  // }, 10000);

  // useInterval(() => {
  //   setTimer((prevTimer) => (prevTimer <= 1 ? 10 : prevTimer - 1));
  // }, 1000);
  // const timerInterval = setInterval(() => {
  //   setTimer((prevTimer) => (prevTimer <= 1 ? 10 : prevTimer - 1));
  // }, 1000);

  // return () => {
  //   // clearInterval(refreshInterval);
  //   clearInterval(timerInterval);
  // };
  // }
  useEffect(() => {
    onLoad();
  }, [type]);

  // --- Render ---

  // if (loading) {
  //   return (
  //     <div className="flex justify-center items-center h-screen text-2xl font-semibold">
  //       <p>Loading jobs...</p>
  //     </div>
  //   );
  // }
  const formatPostgresDate = (
    dateInput: string | Date | null | undefined,
  ): string => {
    // 1. Handle null or undefined input
    if (!dateInput) {
      return "N/A";
    }

    try {
      // 2. Convert input to a Date object.
      // new Date() handles both string and Date object input.
      const date = new Date(dateInput);

      // Check for an invalid date (e.g., if the string was malformed)
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      // 3. Define options for the date part (e.g., "14 Oct")
      const dateOptions: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "short",
      };

      // 4. Define options for the time part (e.g., "17:54")
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23", // Forces 24-hour format
      };

      // 5. Format and combine
      const formattedDate = date.toLocaleDateString("en-US", dateOptions);
      const formattedTime = date.toLocaleTimeString("en-US", timeOptions);

      return `${formattedDate}, ${formattedTime}`;
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-2xl font-semibold text-red-500">
        <p>An error occurred: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      {/* Timer and Refresh Button */}
      {type == "all" && (
        <div className="bg-gray-50 rounded-xl shadow-inner border border-gray-200">
          <FilterForLatestUpworkJobs setFilterObject={setFilterObject} />
        </div>
      )}

      <h1 className="text-3xl font-bold text-center my-8">
        {type == "all" ? "Freelance Platform Job Postings" : "Submitted Proposals"}(
        {filteredUpworkJobs.length})
      </h1>

      {filteredUpworkJobs.map((job) => {
        if (!job.id) return null;

        const isUK = job.client?.location?.country === "United Kingdom";

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
            className={`w-full p-6 my-4 rounded-xl border shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow ${
              isUK
                ? "bg-sky-100 border-sky-400 shadow-[0_10px_30px_rgba(56,189,248,0.25)]"
                : "bg-white border-indigo-100 shadow-[0_8px_24px_rgba(99,102,241,0.18)]"
            }`}
          >
            {/* Header Section */}
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <p className="text-gray-500 text-sm mb-1">
                  {type == "all" ? (
                    timeAgo(job.publishedDateTime)
                  ) : (
                    <div>
                      <span className="text-green-800 font-extrabold">
                        Submitted At:
                      </span>{" "}
                      {formatPostgresDate(job.job_submitted_date)}
                    </div>
                  )}
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
                <button
                  onClick={() => handleMatchJob(jobData)}
                  disabled={matchLoadingState[job.id]}
                  className="px-3 py-1 bg-blue-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {matchLoadingState[job.id] ? "Analyzing..." : "Analyze"}
                </button>
                {type == "all" ? (
                  <button
                    onClick={() => handleMarkSubmitted(job)}
                    className="px-3 py-1 bg-green-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Mark Submitted
                  </button>
                ) : (
                  ""
                )}
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
              {/* Subcategory */}
              {job.subcategory && (
                <span className="inline-flex items-center text-gray-700 font-semibold bg-blue-100 px-2 py-0.5 rounded-md">
                  {job.subcategory}
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
                  {formatAmount(job.client.totalSpent.rawValue)} Spent{" "}
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
                  Hiring Ratio: {job.hiringRatio}%
                </span>
              )}
              {job.matchedSkillsPercentage && (
                <span className="inline-flex items-center bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Skills Match: {job.matchedSkillsPercentage}%
                </span>
              )}

              {/* Client Location */}
              {job.client?.location?.country && (
                <span className="inline-flex items-center text-gray-500 gap-2">
                  {/* SVG for location icon */}
                  {job.client.location.country}
                  {job.description && job.description.length > 0 && (
                    <button
                      onClick={() => toggleDescription(job.id)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold focus:outline-none"
                    >
                      {isExpanded ? "Read Less" : "Read More"}
                    </button>
                  )}
                </span>
              )}
            </div>

            {/* DESCRIPTION SECTION (Expandable) */}
            {isExpanded && (
              <div className="py-3 mt-3 border-t border-gray-200">
                <div className="whitespace-pre-wrap text-gray-700">
                  {jobDescription}
                </div>
              </div>
            )}
            {/* END DESCRIPTION SECTION */}

            {/* Budget and Engagement Details */}
            <div className="pt-3 mt-3 border-t border-gray-200 text-gray-700 text-sm">
              {/* Hourly Budget Details */}
              {job.hourlyBudgetType && (
                <p className="font-semibold text-base mb-2 flex flex-wrap items-center gap-2">
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
                    <span className="inline-flex items-center bg-gray-200 text-gray-800 text-sm px-2 py-0.5 rounded-full font-medium">
                      {job.experienceLevel}
                    </span>
                  )}
                  {(job.engagementDuration?.label || job.engagement) && (
                    <span className="text-sm text-gray-700">
                      Est. time: {job.engagementDuration?.label || "N/A"},{" "}
                      {job.engagement || "N/A"}
                    </span>
                  )}
                </p>
              )}
              {/* Fixed Price Amount (If applicable) */}
              {job.amount?.displayValue &&
                job.amount.displayValue !== "0.0" &&
                !job.hourlyBudgetType && (
                  <p className="font-semibold text-base mb-2 flex flex-wrap items-center gap-2 text-indigo-600 font-bold">
                    <span>Fixed Price: {job.amount.displayValue}</span>
                    {(job.engagementDuration?.label || job.engagement) && (
                      <span className="text-sm text-gray-700 font-normal">
                        Est. time: {job.engagementDuration?.label || "N/A"},{" "}
                        {job.engagement || "N/A"}
                      </span>
                    )}
                  </p>
                )}
            </div>

            {/* Skills Tags */}
            {job.skills && (
              <div className="flex flex-wrap gap-2 mt-4">
                {job.skills.map((skill) => {
                  // Get matched skills from match results
                  const matchedSkillsFromAnalysis =
                    matchResults[job.id]?.data?.identity_check
                      ?.matched_skills || [];
                  const skillFrequency =
                    matchResults[job.id]?.data?.authority_validation
                      ?.skill_frequency_in_history || {};

                  const isAlreadyMatched = isSkillMatch(skill.prettyName);
                  const frequency = skillFrequency[skill.prettyName] || 0;
                  const isInFrequency = frequency > 0;

                  // Determine color: yellow if already matched, green if in frequency (>0) but not matched, gray otherwise
                  let bgColor = "bg-gray-200";
                  if (isAlreadyMatched) {
                    bgColor = "bg-yellow-300";
                  } else if (isInFrequency) {
                    bgColor = "bg-green-200";
                  }

                  return (
                    <span
                      key={skill.name}
                      className={`${bgColor} text-gray-800 text-xs px-3 py-1 rounded-full relative`}
                    >
                      {skill.prettyName}
                      {isInFrequency && (
                        <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {frequency}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Match Results */}
            {matchResults[job.id] && (
              <MatchResults
                matchData={matchResults[job.id]}
                jobTitle={job.title}
                jobDescription={jobDescription}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default JobCard;
