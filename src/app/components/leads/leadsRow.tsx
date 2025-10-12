// components/leads/leadsRow.jsx

import { STATUS_ENUM } from "@/app/shared/enums/select";
import { useState } from "react";
import { SkillCard } from "../form-components/skillCards";
import {
  IconVisit,
  IconView,
  IconEdit,
  IconStatus,
  IconExpand,
} from "../ui/icon-components";

/**
 * Renders a single row in the leads table with expandable details.
 * @param {object} lead - The lead data object.
 * @param {boolean} isExpanded - Whether the details panel is open.
 * @param {function} toggleExpand - Function to toggle the details panel.
 * @param {function} onEdit - Function to open the edit modal.
 * @param {function} onView - Function to open the view modal.
 */
export const LeadRow = ({
  lead,
  isExpanded,
  toggleExpand,
  onEdit,
  onView,
  isChecked,
  onCheckboxChange,
}) => {
  const MAX_DESC_LENGTH = 150;

  const [showFullDescription, setShowFullDescription] = useState(false);
  const {
    title,
    type,
    pubDate,
    company_details,
    status, // This is the filter value (e.g., 'short-listed')
    description,
    skills,
    contact_details,
    link,
    createdAt,
  } = lead;

  // --- SAFE DATA HANDLING ---
  const handleChange = (e) => {
    // Pass the item's unique ID and the new checked state up to the parent
    onCheckboxChange(lead.id, e.target.checked);
  };
  // 1. Safe access and fallback for title, description, and dates
  const safeDescription = description || ""; // Use empty string fallback for string manipulation
  const safeSkills = Array.isArray(skills) ? skills : [];
  const safeContactDetails = Array.isArray(contact_details)
    ? contact_details
    : [];
  const safeStatus = status || "unknown"; // Use 'unknown' as a safe default

  // Description logic using safeDescription
  const shortDescription =
    safeDescription.length > MAX_DESC_LENGTH
      ? safeDescription.substring(0, MAX_DESC_LENGTH) + "..."
      : safeDescription;
  const displayedDescription = showFullDescription
    ? safeDescription
    : shortDescription;
  const canToggleDescription = safeDescription.length > MAX_DESC_LENGTH;

  // Date formatting with null/undefined check
  const formattedPubDate = pubDate
    ? new Date(pubDate).toLocaleDateString()
    : "N/A";
  const formattedCreatedAt = createdAt
    ? new Date(createdAt).toLocaleString()
    : "N/A";

  // Link validity check for action button
  const isLinkValid = !!link;
  // Company details check
  const companyName = company_details?.name || "N/A";
  const companyWebsite = company_details?.website;

  // Determine the display label for the status from the ENUM for styling
  const getStatusLabel = (statusValue) => {
    // If statusValue is null, undefined, or empty string, fallback to "Unknown"
    if (!statusValue) return "Unknown";

    // Find the key in the enum that matches the filtered value
    const key = Object.keys(STATUS_ENUM).find(
      (k) => k.toLowerCase().replace(/_/g, "-") === statusValue
    );
    // Return the human-readable label or fallback to the status value
    return key ? STATUS_ENUM[key] : statusValue.replace(/-/g, " ");
  };

  const statusLabel = getStatusLabel(safeStatus);

  // Determine Tailwind CSS classes based on the status value
  const getStatusClasses = (statusValue) => {
    switch (statusValue) {
      case "pending":
      case "pending-review":
        return "bg-yellow-100 text-yellow-800";
      case "short-listed":
      case "interview":
        return "bg-green-100 text-green-800";
      case "email-sent":
      case "applied":
        return "bg-blue-100 text-blue-800";
      case "rejected":
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusClasses = getStatusClasses(safeStatus);

  // Action handlers
  const handleVisit = () => {
    if (isLinkValid) {
      window.open(link, "_blank");
    } else {
      console.warn("Cannot visit link, link is missing.");
    }
  };
  const handleChangeStatus = () => console.log("Change Status Clicked");
  const handleView = () => onView(lead);
  // --- END SAFE DATA HANDLING ---

  return (
    <>
      {/* Collapsed View (Compact Row - Single Line) */}
      <div
        className={`grid grid-cols-[2fr_0.8fr_1fr_1fr_150px] items-center text-sm border-b border-gray-100 transition-colors ${
          isExpanded ? "bg-indigo-50 hover:bg-indigo-100" : "hover:bg-gray-50"
        } ${isChecked ? "bg-green-200" : ""}`}
        style={{ minHeight: "32px" }} // Compact height
      >
        {/* 1. Title & Type */}
        <div className="py-1 px-3 flex items-center space-x-2 overflow-hidden whitespace-nowrap">
          <input
            type="checkbox"
            checked={isChecked} // Controlled component: state comes from parent
            onChange={handleChange} // Handler updates the parent state
          />
          <span
            className="font-medium text-gray-900 truncate"
            title={title || "No Title"}
          >
            {title || "No Title"}
          </span>
          {/* We'll skip displaying 'type' here as it's not a column, but ensure it's handled in the expanded view */}
        </div>

        {/* 2. Pub Date */}
        <span className="py-1 px-3 text-xs text-gray-600 truncate">
          {formattedPubDate}
        </span>

        {/* 3. Company Name (with link) */}
        <div className="py-1 px-3">
          {companyWebsite ? (
            <a
              href={companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 truncate"
              title={companyName}
            >
              {companyName}
            </a>
          ) : (
            <span className="text-xs text-gray-500" title={companyName}>
              {companyName}
            </span>
          )}
        </div>

        {/* 4. Status (Uses calculated label and classes) */}
        <span className="py-1 px-3">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses}`}
          >
            {statusLabel}
          </span>
        </span>

        {/* 5. Actions (Inline Buttons + Expand/Collapse) */}
        <div className="py-1 px-3 flex justify-end items-center space-x-2">
          {/* Change Status */}
          <button onClick={handleChangeStatus} title="Change Status">
            <IconStatus />
          </button>

          {/* Visit Job Link - Disabled if link is missing */}
          <button
            onClick={handleVisit}
            title="Visit Job Link"
            disabled={!isLinkValid}
            className={!isLinkValid ? "opacity-50 cursor-not-allowed" : ""}
          >
            <IconVisit />
          </button>

          {/* View Details */}
          <button onClick={handleView} title="View Details">
            <IconView />
          </button>

          {/* Edit Lead */}
          <button onClick={onEdit} title="Edit Lead">
            <IconEdit />
          </button>

          {/* Toggle Details */}
          <button onClick={toggleExpand} title="Toggle Details">
            <IconExpand isExpanded={isExpanded} />
          </button>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 rounded-md mb-2 shadow-inner mx-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Description & Skills */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
                Description
              </h4>
              <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                {displayedDescription || "No description provided."}
                {canToggleDescription && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-xs ml-1 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {showFullDescription ? "Read less" : "Read more"}
                  </button>
                )}
              </p>

              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2 mt-3">
                Skills
              </h4>
              <div className="flex flex-wrap">
                {safeSkills.length > 0 ? (
                  safeSkills.map(
                    (skill) =>
                      // Only render if skill string is not null/empty
                      skill && <SkillCard key={skill} skill={skill} />
                  )
                ) : (
                  <span className="text-sm text-gray-500">None listed</span>
                )}
              </div>

              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2 mt-3">
                Type
              </h4>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 whitespace-nowrap flex-shrink-0">
                {type || "N/A"}
              </span>
            </div>

            {/* Column 2: Additional Details */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
                Details
              </h4>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Created At:</span>{" "}
                {formattedCreatedAt}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Job Link:</span>{" "}
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline truncate inline-block max-w-full"
                    title={link}
                  >
                    {link}
                  </a>
                ) : (
                  <span className="text-gray-500">N/A</span>
                )}
              </p>
            </div>

            {/* Column 3: Contact Details */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                Contact Details ({safeContactDetails.length})
              </h4>
              {safeContactDetails.length > 0 ? (
                safeContactDetails.map((contact, index) => (
                  <div
                    key={index}
                    className="mb-3 p-2 border border-gray-100 rounded bg-white"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {contact.name || "Unknown Name"} (
                      {contact.designation || "N/A"})
                    </p>
                    <p className="text-xs text-gray-600">
                      Email:{" "}
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-indigo-600 hover:underline"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </p>
                    <p className="text-xs text-gray-600">
                      Contact: {contact.contact || "N/A"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No contact details available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
