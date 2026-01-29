"use client";

import { useState, useEffect, useRef } from "react";

const MATCH_CATEGORIES = [
  { value: "web_development", text: "Web Development" },
  { value: "web_mobile_design", text: "Web Mobile Design" },
  { value: "ecommerce_development", text: "Ecommerce Development" },
  { value: "mobile_development", text: "Mobile Development" },
  { value: "scripts_utilities", text: "Scripts Utilities" },
  { value: "qa_testing", text: "Qa Testing" },
  { value: "ai_apps_integration", text: "Ai Apps Integration" },
  { value: "other_software_development", text: "Other Software Development" },
  { value: "game_design_development", text: "Game Design Development" },
  {
    value: "desktop_application_development",
    text: "Desktop Application Development",
  },
  { value: "product_management_scrum", text: "Product Management Scrum" },
  {
    value: "blockchain_nft_cryptocurrency",
    text: "Blockchain Nft Cryptocurrency",
  },
];

export default function FilterForLatestUpworkJobs({ setFilterObject }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [matchedSkills, setMatchedSkills] = useState(null);
  const [hiringRatio, setHiringRatio] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [spent, setSpent] = useState(null);
  const [pastSkills, setPastSkills] = useState(null);
  const [hourlyRate, setHourlyRate] = useState(null);
  const [fixedAmount, setFixedAmount] = useState(null);
  const [jobType, setJobType] = useState("all");
  const [visible, setVisible] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("upworkFilters");
    if (saved) {
      const data = JSON.parse(saved);
      setSelectedCategories(data.selectedCategories || []);
      setMatchedSkills(data.matchedSkills || null);
      setHiringRatio(data.hiringRatio || null);
      setReviews(data.reviews || null);
      setSpent(data.spent || null);
      setPastSkills(data.pastSkills || null);
      setHourlyRate(data.hourlyRate || null);
      setFixedAmount(data.fixedAmount || null);
      setJobType(data.jobType || "all");
    }
  }, []);

  function clear() {
    setSelectedCategories([]);
    setMatchedSkills(null);
    setHiringRatio(null);
    setReviews(null);
    setSpent(null);
    setPastSkills(null);
    setHourlyRate(null);
    setFixedAmount(null);
    setJobType("all");
    handleFilter();
  }
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    handleFilter();
  }, [
    selectedCategories,
    matchedSkills,
    hiringRatio,
    reviews,
    spent,
    pastSkills,
    hourlyRate,
    fixedAmount,
    jobType,
  ]);

  const handleFilter = () => {
    const filterObj = {
      selectedCategories,
      matchedSkills,
      hiringRatio,
      reviews,
      spent,
      pastSkills,
      hourlyRate,
      fixedAmount,
      jobType,
    };
    localStorage.setItem("upworkFilters", JSON.stringify(filterObj));
    setFilterObject(filterObj);

    // alert("Filters saved!");
  };

  const toggleCategory = (value: string) => {
    if (selectedCategories.includes(value)) {
      setSelectedCategories(selectedCategories.filter((v) => v !== value));
    } else {
      setSelectedCategories([...selectedCategories, value]);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (e: any) => void,
    type = "text",
  ) => (
    <div className="flex flex-col min-w-[180px] w-[200px] mr-2 mb-3">
      <label className="mb-1 text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
  // Removed Budget Type selector in favor of separate hourly/fixed inputs

  return (
    <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl max-w-full mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold text-gray-800">Filters</div>
        <button
          onClick={() => setVisible(!visible)}
          className="inline-flex items-center gap-2 rounded-full bg-gray-800 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {visible && (
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="flex flex-col min-w-[240px] mr-2 mb-2 relative"
            ref={dropdownRef}
          >
            <label className="mb-1 text-sm font-medium text-gray-700">
              Match Categories
            </label>
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="border rounded-lg px-3 py-2 cursor-pointer bg-white flex flex-wrap min-h-[44px] items-center gap-2 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
            >
              {selectedCategories.length === 0 ? (
                <span className="text-gray-400 text-sm">
                  Select categories...
                </span>
              ) : (
                selectedCategories.map((cat) => {
                  const text =
                    MATCH_CATEGORIES.find((c) => c.value === cat)?.text || cat;
                  return (
                    <span
                      key={cat}
                      className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full flex items-center"
                    >
                      {text}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(cat);
                        }}
                        className="ml-1 text-blue-600 hover:text-blue-800 font-bold"
                        aria-label="Remove category"
                      >
                        ×
                      </button>
                    </span>
                  );
                })
              )}
            </div>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 border bg-white rounded-lg shadow-lg max-h-64 overflow-auto mt-1 z-10">
                {MATCH_CATEGORIES.map((cat) => (
                  <div
                    key={cat.value}
                    onClick={() => toggleCategory(cat.value)}
                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                      selectedCategories.includes(cat.value) ? "bg-blue-50" : ""
                    }`}
                  >
                    {cat.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {renderInput(
            "Matched Skills (%)",
            matchedSkills,
            (e) =>
              setMatchedSkills(
                e.target.value ? parseFloat(e.target.value) : null,
              ),
            "number",
          )}
          {renderInput(
            "Hiring Ratio >",
            hiringRatio,
            (e) =>
              setHiringRatio(
                e.target.value ? parseFloat(e.target.value) : null,
              ),
            "number",
          )}
          {renderInput(
            "Reviews",
            reviews,
            (e) =>
              setReviews(e.target.value ? parseFloat(e.target.value) : null),
            "number",
          )}
          {renderInput(
            "Spent",
            spent,
            (e) => setSpent(e.target.value ? parseFloat(e.target.value) : null),
            "number",
          )}
          {renderInput(
            "Past Skills (%)",
            pastSkills,
            (e) =>
              setPastSkills(e.target.value ? parseFloat(e.target.value) : null),
            "number",
          )}
          {renderInput(
            "Hourly Rate",
            hourlyRate,
            (e) =>
              setHourlyRate(e.target.value ? parseFloat(e.target.value) : null),
            "number",
          )}
          {renderInput(
            "Fixed Amount",
            fixedAmount,
            (e) =>
              setFixedAmount(
                e.target.value ? parseFloat(e.target.value) : null,
              ),
            "number",
          )}

          <div className="flex flex-col min-w-[180px] w-[200px] mr-2 mb-3">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Job Type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All</option>
              <option value="fixed">Fixed</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>

          <div className="w-full flex justify-end items-center gap-2 mt-2">
            <button
              onClick={handleFilter}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Apply Filters
            </button>
            <button
              onClick={clear}
              className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-sm text-sm font-semibold hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
