// components/leads/LeadDetailsModal.jsx

import React, { useState } from "react";
import { IconClose, IconEdit } from "../ui/icon-components";

// Helper: Expandable Section (Collapsible)
const ExpandableSection = ({ title, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        className="w-full text-left p-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-semibold text-sm text-gray-700">{title}</span>
        <span
          className={`text-gray-500 transform transition-transform duration-200 ${
            isExpanded ? "" : "rotate-180"
          }`}
        >
          {isExpanded ? "−" : "+"}
        </span>
      </button>
      {isExpanded && <div className="p-4">{children}</div>}
    </div>
  );
};

// Helper: render array fields as small tags
const TagsArray = ({ items }) => {
  if (!items || items.length === 0)
    return <span className="text-gray-500">N/A</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, idx) => (
        <span
          key={idx}
          className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-800 rounded-full"
        >
          {item}
        </span>
      ))}
    </div>
  );
};

export const LeadDetailsModal = ({ lead, onClose, onEdit }) => {
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [selectedChildCategories, setSelectedChildCategories] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [coverLetterPrompt, setCoverLetterPrompt] = useState("");
  const [selectedPortfolios, setSelectedPortfolios] = useState([]);

  // Mock categories
  const MOCK_MAIN_CATEGORIES = [
    { id: "web", name: "Web Development" },
    { id: "cloud", name: "Cloud Engineering" },
  ];
  const MOCK_CHILD_CATEGORIES = [
    { id: "front", name: "Frontend" },
    { id: "back", name: "Backend" },
    { id: "devops", name: "DevOps" },
  ];

  // Action handlers
  const handleMatchSkills = () => console.log("Match Skills", selectedSkills);
  const handleMatchCategories = () =>
    console.log("Match Categories", selectedChildCategories);
  const handleGetCoverLetterPrompt = () =>
    console.log("Get Cover Letter Prompt", coverLetterPrompt);
  const handleSendEmail = () => console.log("Send Email");

  // Safe values
  const safeSkills = Array.isArray(lead.skills) ? lead.skills : [];
  const safeJobTypes = Array.isArray(lead.jobTypes) ? lead.jobTypes : [];
  const safeCategories = Array.isArray(lead.categories) ? lead.categories : [];
  const safeEducationLevels = Array.isArray(lead.educationLevels)
    ? lead.educationLevels
    : [];
  const safeCareerLevel = Array.isArray(lead.careerLevel)
    ? lead.careerLevel
    : [];
  const safeContacts = Array.isArray(lead.contact) ? lead.contact : [];
  const formattedCreatedAt = lead.createdAt
    ? new Date(lead.createdAt).toLocaleString()
    : "N/A";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex justify-center items-start pt-4">
      <div className="bg-white shadow-2xl relative w-full max-w-7xl h-[95vh] overflow-y-auto rounded-lg">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h2
            className="text-xl font-bold text-gray-800 truncate pr-12"
            title={lead.title}
          >
            Lead Details: {lead.title || "N/A"}
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

        {/* Top Action Buttons */}
        <div className="flex flex-wrap gap-3 p-4 border-b sticky top-16 bg-white z-10">
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

        {/* Lead Details Card */}
        <div className="p-6">
          <div className="border rounded-lg bg-white p-4 shadow-sm space-y-4">
            {/* Job Details */}
            <ExpandableSection title="Job Details">
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-900">Title:</span>{" "}
                  {lead.title || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Description:
                  </span>{" "}
                  {lead.description || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Posted Date:
                  </span>{" "}
                  {lead.postedDate || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Job Types:
                  </span>{" "}
                  <TagsArray items={safeJobTypes} />
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Categories:
                  </span>{" "}
                  <TagsArray items={safeCategories} />
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Education Levels:
                  </span>{" "}
                  <TagsArray items={safeEducationLevels} />
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Career Level:
                  </span>{" "}
                  <TagsArray items={safeCareerLevel} />
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Skills:</span>{" "}
                  <TagsArray items={safeSkills} />
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Created At:
                  </span>{" "}
                  {formattedCreatedAt}
                </p>
              </div>
            </ExpandableSection>

            {/* Company Details */}
            <ExpandableSection title="Company Details">
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-900">Name:</span>{" "}
                  {lead.company_name || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Website:</span>{" "}
                  {lead.company_website || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">City:</span>{" "}
                  {lead.company_city || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">State:</span>{" "}
                  {lead.company_state || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Country:</span>{" "}
                  {lead.company_country || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Size:</span>{" "}
                  {lead.company_size || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Industry:</span>{" "}
                  {lead.company_industry || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Established:
                  </span>{" "}
                  {lead.company_established || "N/A"}
                </p>
              </div>
            </ExpandableSection>

            {/* Contact Details */}
            <ExpandableSection
              title={`Contact Details (${safeContacts.length})`}
            >
              <div className="space-y-2 text-sm text-gray-700">
                {safeContacts.length > 0 ? (
                  safeContacts.map((contact, idx) => (
                    <div
                      key={idx}
                      className="p-2 border border-gray-100 rounded bg-gray-50"
                    >
                      <p>
                        <span className="font-semibold text-gray-900">
                          Name:
                        </span>{" "}
                        {contact.name || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-900">
                          Designation:
                        </span>{" "}
                        {contact.designation || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-900">
                          Email:
                        </span>{" "}
                        {contact.email || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-900">
                          Phone:
                        </span>{" "}
                        {contact.contact || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-900">
                          LinkedIn:
                        </span>{" "}
                        {contact.linkedIn || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-900">
                          Website:
                        </span>{" "}
                        {contact.website || "N/A"}
                      </p>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500">No contacts available.</span>
                )}
              </div>
            </ExpandableSection>
          </div>
        </div>
      </div>
    </div>
  );
};
