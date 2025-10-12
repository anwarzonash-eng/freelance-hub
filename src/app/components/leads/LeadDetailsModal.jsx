// components/leads/LeadDetailsModal.jsx

import React, { useState } from "react";
import { IconClose, IconEdit } from "../ui/icon-components";
// Assuming the rest of your imports are correct

// --- Helper Components for LeadDetailsModal (moved up for clarity) ---

// The Multi-Select Component:
const CustomMultiSelect = ({ label, values, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select
      // CRITICAL: The 'multiple' attribute enables multi-selection
      multiple
      value={values}
      onChange={(e) =>
        // CRITICAL: Collect all selected options into an array
        onChange(Array.from(e.target.selectedOptions, (option) => option.value))
      }
      className="w-full p-2 border border-gray-300 rounded-md text-sm h-32 focus:ring-indigo-500 focus:border-indigo-500"
    >
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.name}
        </option>
      ))}
    </select>
    <p className="text-xs text-gray-500 mt-1">
      Hold **Ctrl** (Windows) or **Cmd** (Mac) to select multiple categories.
    </p>
  </div>
);

const CustomSelect = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
    >
      <option value="">-- Select --</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.name}
        </option>
      ))}
    </select>
  </div>
);

const ExpandableSection = ({ title, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        className="w-full text-left p-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-semibold text-sm text-gray-700">{title}</span>
        <span className="text-gray-500 transform transition-transform duration-200">
          {isExpanded ? "−" : "+"}
        </span>
      </button>
      {isExpanded && <div className="p-4">{children}</div>}
    </div>
  );
};

// Reuses the display logic from LeadRow expanded view for consistency
const LeadDetailsContent = ({ lead }) => {
  // ... (This content remains unchanged)
  const formattedCreatedAt = new Date(lead.createdAt).toLocaleString();

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
          Description
        </h4>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {lead.description}
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">
          Skills ({lead.skills.length})
        </h4>
        <div className="flex flex-wrap gap-1">
          {lead.skills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-800 rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
          Details
        </h4>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Company:</span>{" "}
          {lead.company_details?.name}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Type:</span> {lead.type}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Link:</span>{" "}
          <a
            href={lead.link}
            target="_blank"
            className="text-indigo-600 hover:underline truncate inline-block max-w-full"
          >
            {lead.link}
          </a>
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Created:</span> {formattedCreatedAt}
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">
          Contacts ({lead.contact_details.length})
        </h4>
        {lead.contact_details.map((contact, index) => (
          <div
            key={index}
            className="mb-2 p-2 border border-gray-100 rounded bg-white"
          >
            <p className="text-sm font-medium text-gray-900">
              {contact.name} ({contact.designation})
            </p>
            <p className="text-xs text-gray-600">
              Email:{" "}
              <a
                href={`mailto:${contact.email}`}
                className="text-indigo-600 hover:underline"
              >
                {contact.email}
              </a>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Renders a full-screen modal for viewing all lead details and performing actions
export const LeadDetailsModal = ({ lead, onClose, onEdit }) => {
  // --- State Variables (No Change) ---
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [selectedChildCategories, setSelectedChildCategories] = useState([]); // This holds an array of selected IDs/values
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [coverLetterPrompt, setCoverLetterPrompt] = useState("");
  const [selectedPortfolios, setSelectedPortfolios] = useState([]);

  // --- Mock Data (No Change) ---
  const MOCK_MAIN_CATEGORIES = [
    { id: "web", name: "Web Development" },
    { id: "cloud", name: "Cloud Engineering" },
  ];
  const MOCK_CHILD_CATEGORIES = [
    { id: "front", name: "Frontend" },
    { id: "back", name: "Backend" },
    { id: "devops", name: "DevOps" },
  ];
  // ... (MOCK_SKILLS_DATA, MOCK_PORTFOLIO_DATA remain unchanged)

  // --- Action Handlers (No Change) ---
  const handleMatchSkills = () =>
    console.log("Action: Match Skills", selectedSkills);
  const handleMatchCategories = () =>
    console.log("Action: Match Categories", selectedChildCategories);
  const handleGetCoverLetterPrompt = () =>
    console.log("Action: Get Cover Letter Prompt", coverLetterPrompt);
  const handleSendEmail = () => console.log("Action: Send Email");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex justify-center items-center">
      {/* Full screen container */}
      <div className="bg-white shadow-2xl relative w-full h-full overflow-y-auto">
        {/* Header (No Change) */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h2
            className="text-xl font-bold text-gray-800 truncate pr-12"
            title={lead.title}
          >
            Lead Details: {lead.title}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors"
              title="Edit Lead"
            >
              <IconEdit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900"
              title="Close"
            >
              <IconClose />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Column 1: Lead Details (No Change) */}
          <div className="lg:col-span-1 border-r border-gray-200 pr-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-700 pb-1 border-b">
              Job & Company Info
            </h3>
            <LeadDetailsContent lead={lead} />
          </div>

          {/* Column 2: Matching & Customization */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-semibold text-gray-700 pb-1 border-b">
              Matching & Customization
            </h3>

            {/* 1. Main Category Select (No Change) */}
            <CustomSelect
              label="Select Main Category"
              value={selectedMainCategory}
              onChange={setSelectedMainCategory}
              options={MOCK_MAIN_CATEGORIES}
            />

            {/* 2. Child Categories Multi-Select (Uses UPDATED Component) */}
            <CustomMultiSelect
              label="Select Child Categories"
              values={selectedChildCategories}
              onChange={setSelectedChildCategories}
              options={MOCK_CHILD_CATEGORIES}
            />

            {/* 3. Skills Selection Area (No Change) */}
            <ExpandableSection
              title="Select Skills for Match"
              defaultExpanded={false}
            >
              <div className="bg-white p-4 border rounded-md">
                <p className="text-sm text-gray-500">
                  *Complex Skill Selection Component Placeholder*
                </p>
                <p className="text-sm">
                  Current Skills: {lead.skills.join(", ")}
                </p>
              </div>
            </ExpandableSection>

            {/* 4. Portfolios Selection Area (No Change) */}
            <ExpandableSection
              title="Select Portfolios"
              defaultExpanded={false}
            >
              <div className="bg-white p-4 border rounded-md">
                <p className="text-sm text-gray-500">
                  *Complex Portfolio Selection Component Placeholder*
                </p>
                <p className="text-sm">
                  Current Portfolios: {selectedPortfolios.join(", ")}
                </p>
              </div>
            </ExpandableSection>

            {/* 5. Cover Letter Prompt (No Change) */}
            <ExpandableSection
              title="Select Prompt for Cover Letter (Rich Text)"
              defaultExpanded={false}
            >
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                rows="3"
                placeholder="Enter or select a prompt..."
                value={coverLetterPrompt}
                onChange={(e) => setCoverLetterPrompt(e.target.value)}
              />
            </ExpandableSection>

            {/* 6. Actions (No Change) */}
            <div className="pt-4 border-t flex flex-wrap gap-3">
              <button
                onClick={handleMatchSkills}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Match Skills
              </button>
              <button
                onClick={handleMatchCategories}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Match Categories
              </button>
              <button
                onClick={handleGetCoverLetterPrompt}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
              >
                Get Cover Letter Prompt
              </button>
              <button
                onClick={handleSendEmail}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
