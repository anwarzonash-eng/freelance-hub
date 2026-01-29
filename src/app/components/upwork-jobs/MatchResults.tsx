"use client";

import React, { useState, useEffect } from "react";

interface MatchResultsProps {
  matchData: any;
  jobTitle: string;
  jobDescription: string;
}

const MatchResults: React.FC<MatchResultsProps> = ({
  matchData,
  jobTitle,
  jobDescription,
}) => {
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
  const [activeHighlightKeywords, setActiveHighlightKeywords] = useState<
    string[] | null
  >(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("usman");
  const [selectedCategoryData, setSelectedCategoryData] = useState<any>(null);

  if (!matchData?.data) {
    return null;
  }

  const data = matchData.data;
  const results = data.results || [];

  // Update selected category data when component mounts or data changes
  useEffect(() => {
    if (results && results.length > 0) {
      // Find the category (default to "usman" or first available)
      const categoryData =
        results.find((r: any) => r.category === selectedCategory) ||
        results.find((r: any) => r.category === "usman") ||
        results[0];

      if (categoryData) {
        setSelectedCategory(categoryData.category);
        setSelectedCategoryData(categoryData);
      }
    }
  }, [data, results]);

  const toggleDescription = (index: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleAnalysisExpand = () => {
    setIsAnalysisExpanded((prev) => !prev);
  };

  const handleCategoryChange = (categoryName: string) => {
    setSelectedCategory(categoryName);
    const categoryData = results.find((r: any) => r.category === categoryName);
    if (categoryData) {
      setSelectedCategoryData(categoryData);
    }
  };

  // Helper function to highlight matched words in text
  const highlightText = (text: string, matchedWords: string[]) => {
    if (!matchedWords || matchedWords.length === 0) {
      return text;
    }

    // Create a regex pattern that matches any of the words (case-insensitive)
    const pattern = new RegExp(`\\b(${matchedWords.join("|")})\\b`, "gi");
    const parts = text.split(pattern);

    return parts.map((part, index) => {
      const isMatch = matchedWords.some(
        (word) => part.toLowerCase() === word.toLowerCase(),
      );

      if (isMatch) {
        return (
          <span key={index} className="bg-yellow-300 font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (!selectedCategoryData) {
    return null;
  }

  const identityChecks = selectedCategoryData.identity_checks || [];
  const authorityValidation = selectedCategoryData.authority_validation || {};

  return (
    <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-blue-100 transition"
        onClick={toggleAnalysisExpand}
      >
        <h3 className="text-lg font-bold text-blue-900">
          📊 Job Match Analysis
        </h3>
        <button className="text-blue-900 font-bold text-2xl leading-none">
          {isAnalysisExpanded ? "−" : "+"}
        </button>
      </div>

      {isAnalysisExpanded && (
        <div className="p-4 pt-0">
          {/* Category Selector */}
          <div className="mb-4 p-3 bg-white rounded border border-blue-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Category:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              {results.map((category: any) => (
                <option key={category.category} value={category.category}>
                  {category.category} ({category.profiles_in_category} profiles)
                </option>
              ))}
            </select>
          </div>

          {/* Identity Checks Section - Show all profiles in selected category */}
          <div className="mb-4 p-3 bg-white rounded border border-blue-100">
            <h4 className="font-bold text-blue-800 mb-3">
              ✓ Identity Check - All Profiles ({identityChecks.length})
            </h4>
            <div className="space-y-3">
              {identityChecks.map((check: any, idx: number) => (
                <div
                  key={idx}
                  className="ml-4 p-3 border-l-4 border-indigo-300 bg-indigo-50 rounded"
                >
                  <p className="font-semibold text-indigo-900 mb-2">
                    {check.profile_title}
                  </p>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-semibold text-gray-700">
                        Profile ID:
                      </span>{" "}
                      <span className="text-indigo-600">
                        {check.profile_id}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-gray-700">
                        Title Match:
                      </span>{" "}
                      <span className="text-indigo-600">
                        {check.title_match_pct}%
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-gray-700">
                        Description Match:
                      </span>{" "}
                      <span className="text-indigo-600">
                        {check.description_match_pct}%
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-gray-700">
                        Skill Coverage:
                      </span>{" "}
                      <span className="text-indigo-600">
                        {check.skill_coverage_pct}%
                      </span>
                    </p>

                    {/* Matched Skills */}
                    {check.matched_skills &&
                      check.matched_skills.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">
                            Matched Skills ({check.matched_skills.length})
                          </p>
                          <div className="flex flex-wrap gap-2 ml-2">
                            {check.matched_skills.map((skill: string) => (
                              <span
                                key={skill}
                                className="bg-green-200 text-green-800 text-xs px-3 py-1 rounded-full font-semibold"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AUTHORITY VALIDATION SECTION */}
          <div className="space-y-3 p-3 bg-white rounded border border-blue-100">
            <h4 className="font-bold text-blue-800 mb-2">
              🔍 Authority Validation
            </h4>

            {/* Historical Title Overlap */}
            <div className="ml-4 border-l-2 border-blue-300 pl-3">
              <p className="font-semibold text-gray-700">
                Historical Title Overlap (
                {authorityValidation.historical_title_overlap?.count || 0})
              </p>
              {authorityValidation.historical_title_overlap?.details &&
                authorityValidation.historical_title_overlap.details.length >
                  0 && (
                  <div className="mt-2 ml-2 space-y-1">
                    {authorityValidation.historical_title_overlap.details
                      .slice(
                        0,
                        expandedDescriptions["titles_all"] ? undefined : 3,
                      )
                      .map((detail: any, idx: number) => (
                        <div
                          key={idx}
                          className="text-sm text-gray-700 bg-gray-50 p-2 rounded"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="flex-grow">
                              •{" "}
                              {highlightText(
                                detail.title,
                                detail.matched_words || [],
                              )}
                            </span>
                            <span className="text-indigo-600 font-semibold text-xs ml-2 flex-shrink-0">
                              {detail.title_match_pct}%
                            </span>
                          </div>
                        </div>
                      ))}
                    {authorityValidation.historical_title_overlap.details
                      .length > 3 && (
                      <button
                        onClick={() => toggleDescription("titles_all")}
                        className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer"
                      >
                        {expandedDescriptions["titles_all"]
                          ? "− Show less"
                          : `+ Show ${authorityValidation.historical_title_overlap.details.length - 3} more`}
                      </button>
                    )}
                  </div>
                )}
            </div>

            {/* Historical Description Overlap */}
            <div className="ml-4 border-l-2 border-blue-300 pl-3 mt-3">
              <p className="font-semibold text-gray-700">
                Historical Description Overlap (
                {authorityValidation.historical_description_overlap?.count || 0}
                )
              </p>
              {authorityValidation.historical_description_overlap?.details &&
                authorityValidation.historical_description_overlap.details
                  .length > 0 && (
                  <div className="mt-2 ml-2 space-y-2">
                    {authorityValidation.historical_description_overlap.details
                      .slice(
                        0,
                        expandedDescriptions["descriptions_all"]
                          ? undefined
                          : 3,
                      )
                      .map((detail: any, idx: number) => {
                        const isActive =
                          activeHighlightKeywords ===
                          detail.matched_context_words;
                        return (
                          <div
                            key={idx}
                            className="bg-gray-50 p-2 rounded text-sm"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-grow">
                                <p className="font-semibold text-gray-800">
                                  {highlightText(
                                    detail.title,
                                    detail.matched_context_words || [],
                                  )}
                                </p>
                                <p className="text-gray-600 text-xs mt-1">
                                  Match:{" "}
                                  <span className="text-indigo-600">
                                    {detail.description_match_pct}%
                                  </span>
                                </p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    if (isActive) {
                                      setActiveHighlightKeywords(null);
                                    } else {
                                      setActiveHighlightKeywords(
                                        detail.matched_context_words || [],
                                      );
                                    }
                                  }}
                                  className={`text-xs font-semibold px-2 py-1 rounded transition ${
                                    isActive
                                      ? "bg-green-600 text-white hover:bg-green-700"
                                      : "bg-green-100 text-green-700 hover:bg-green-200"
                                  }`}
                                >
                                  {isActive ? "✓ Highlighted" : "Highlight"}
                                </button>
                                {detail.description && (
                                  <button
                                    onClick={() =>
                                      toggleDescription(`desc_${idx}`)
                                    }
                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                                  >
                                    {expandedDescriptions[`desc_${idx}`]
                                      ? "Hide"
                                      : "Show"}{" "}
                                    Desc
                                  </button>
                                )}
                              </div>
                            </div>
                            {expandedDescriptions[`desc_${idx}`] &&
                              detail.description && (
                                <div className="mt-2 bg-white p-2 rounded text-gray-700 text-xs border border-gray-200">
                                  <p className="whitespace-pre-wrap">
                                    {highlightText(
                                      detail.description,
                                      detail.matched_context_words || [],
                                    )}
                                  </p>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    {authorityValidation.historical_description_overlap.details
                      .length > 3 && (
                      <button
                        onClick={() => toggleDescription("descriptions_all")}
                        className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer"
                      >
                        {expandedDescriptions["descriptions_all"]
                          ? "− Show less"
                          : `+ Show ${authorityValidation.historical_description_overlap.details.length - 3} more`}
                      </button>
                    )}
                  </div>
                )}
            </div>

            {/* Skill Frequency */}
            <div className="ml-4 border-l-2 border-blue-300 pl-3 mt-3">
              <p className="font-semibold text-gray-700 mb-2">
                Skill Frequency in History
              </p>
              {authorityValidation.skill_frequency_in_history &&
                Object.keys(authorityValidation.skill_frequency_in_history)
                  .length > 0 && (
                  <div className="mt-2 ml-2 space-y-1">
                    {Object.entries(
                      authorityValidation.skill_frequency_in_history,
                    )
                      .filter(([, count]: any) => count > 0)
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .map(([skill, count]: any) => (
                        <div
                          key={skill}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-700">{skill}</span>
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs font-semibold">
                            {count} times
                          </span>
                        </div>
                      ))}
                  </div>
                )}
            </div>

            {/* Mirror Job */}
            <div className="ml-4 border-l-2 border-blue-300 pl-3 mt-3 bg-gradient-to-br from-yellow-50 to-amber-50 p-2 rounded">
              <p className="font-bold text-amber-900 mb-2">
                🎯 Mirror Job (Best Match)
              </p>
              {authorityValidation.mirror_job && (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-700">Title:</span>{" "}
                    {authorityValidation.mirror_job.title}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold text-gray-700">
                      Similarity:
                    </span>{" "}
                    <span className="text-amber-700 font-bold">
                      {authorityValidation.mirror_job.similarity_pct}%
                    </span>
                  </p>
                  {authorityValidation.mirror_job.relevant_past_skills &&
                    authorityValidation.mirror_job.relevant_past_skills.length >
                      0 && (
                      <div>
                        <p className="font-semibold text-gray-700 text-sm mb-1">
                          Relevant Skills:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {authorityValidation.mirror_job.relevant_past_skills.map(
                            (skill: string) => (
                              <span
                                key={skill}
                                className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold"
                              >
                                {skill}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Highlighted Job Description */}
            {activeHighlightKeywords && activeHighlightKeywords.length > 0 && (
              <div className="ml-4 border-l-2 border-green-300 pl-3 mt-3 bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-bold text-green-900">
                    📝 Job Description with Highlighted Keywords
                  </p>
                  <button
                    onClick={() => setActiveHighlightKeywords(null)}
                    className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded font-semibold"
                  >
                    Clear
                  </button>
                </div>
                <div className="bg-white p-3 rounded text-sm text-gray-700 border border-green-200">
                  <p className="whitespace-pre-wrap">
                    {highlightText(jobDescription, activeHighlightKeywords)}
                  </p>
                </div>
                <p className="text-xs text-green-700 mt-2 italic">
                  Highlighting {activeHighlightKeywords.length} keyword(s) from
                  selected historical match
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchResults;
