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
  const [rate, setRate] = useState(null);
  const [visible, setVisible] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [budgetType, setBudgetType] = useState("all");

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
      setRate(data.rate || null);
      setBudgetType(data.budgetType);
    }
  }, []);

  function clear() {
    setSelectedCategories([]);
    setMatchedSkills(null);
    setHiringRatio(null);
    setReviews(null);
    setSpent(null);
    setPastSkills(null);
    setRate(null);
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
    rate,
    budgetType,
  ]);

  const handleFilter = () => {
    const filterObj = {
      selectedCategories,
      matchedSkills,
      hiringRatio,
      reviews,
      spent,
      pastSkills,
      rate,
      budgetType,
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
    type = "text"
  ) => (
    <div className="flex flex-col min-w-[180px] mr-4 mb-4">
      <label className="mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        className="border rounded px-2 py-1"
      />
    </div>
  );
  const handleChangeBudget = (event) => {
    // The value of the selected option is available at event.target.value
    setBudgetType(event.target.value);
  };

  return (
    <div className="p-4 bg-white shadow rounded max-w-full mx-auto">
      <button
        onClick={() => setVisible(!visible)}
        className="mb-2 bg-gray-500 text-white py-1 px-3 rounded hover:bg-gray-600"
      >
        {visible ? "Hide Filters" : "Show Filters"}
      </button>

      {visible && (
        <div className="flex flex-wrap items-start">
          <div
            className="flex flex-col min-w-[220px] mr-4 mb-4 relative"
            ref={dropdownRef}
          >
            <label className="mb-1">Match Categories</label>
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="border rounded px-2 py-2 cursor-pointer bg-white flex flex-wrap min-h-[40px] items-center"
            >
              {selectedCategories.length === 0 ? (
                <span className="text-gray-400">Select categories...</span>
              ) : (
                selectedCategories.map((cat) => {
                  const text =
                    MATCH_CATEGORIES.find((c) => c.value === cat)?.text || cat;
                  return (
                    <span
                      key={cat}
                      className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded mr-1 mb-1 flex items-center"
                    >
                      {text}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(cat);
                        }}
                        className="ml-1 text-blue-500 hover:text-blue-700 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  );
                })
              )}
            </div>
            <div></div>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 border bg-white rounded shadow max-h-64 overflow-auto mt-1 z-10">
                {MATCH_CATEGORIES.map((cat) => (
                  <div
                    key={cat.value}
                    onClick={() => toggleCategory(cat.value)}
                    className={`px-2 py-1 cursor-pointer hover:bg-blue-100 ${
                      selectedCategories.includes(cat.value)
                        ? "bg-blue-100"
                        : ""
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
                e.target.value ? parseFloat(e.target.value) : null
              ),
            "number"
          )}
          {renderInput(
            "Hiring Ratio >",
            hiringRatio,
            (e) =>
              setHiringRatio(
                e.target.value ? parseFloat(e.target.value) : null
              ),
            "number"
          )}
          {renderInput(
            "Reviews",
            reviews,
            (e) =>
              setReviews(e.target.value ? parseFloat(e.target.value) : null),
            "number"
          )}
          {renderInput(
            "Spent",
            spent,
            (e) => setSpent(e.target.value ? parseFloat(e.target.value) : null),
            "number"
          )}
          {renderInput(
            "Past Skills (%)",
            pastSkills,
            (e) =>
              setPastSkills(e.target.value ? parseFloat(e.target.value) : null),
            "number"
          )}
          {renderInput(
            "Rate",
            rate,
            (e) => setRate(e.target.value ? parseFloat(e.target.value) : null),
            "number"
          )}

          <div className="flex flex-col min-w-[180px] mr-4 mb-4">
            <label className="mb-1">Budget Type</label>
            <select
              name="paymentType"
              value={budgetType} // Control the current selection with state
              onChange={handleChangeBudget} // Update state when selection changes
              className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {/* The first option's value should match the default state value */}
              <option value="all">All</option>

              <option value="fixed">Fixed</option>

              <option value="hourly">Hourly</option>
            </select>
          </div>

          {/* <button
            onClick={handleFilter}
            className="mt-2 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Filter
          </button> */}
          <button
            onClick={clear}
            className="mt-2 ml-2 bg-red-500 text-white py-2 px-4 rounded "
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
