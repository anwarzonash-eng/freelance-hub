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
    id,
    title,
    job_link,
    description,
    postedDate,
    jobLocations,
    allowedCandidateLocation,
    remoteOptions,
    jobTypes,
    slug,
    salary,
    jobBenefits,
    educationLevels,
    applyURL,
    careerLevel,
    salaryMin,
    salaryMax,
    salaryUnit,
    salaryCurrency,
    company_career_Page_Url,
    skills,
    categories,
    expires_at,
    contact,
    lead_source,
    createdAt,
    lead_fetch_date,
    status,
    company_website,
    company_name,
    company_city,
    company_state,
    company_country,
    company_summary,
    company_facebook,
    company_linkedin,
    company_twitter,
    company_youtube,
    company_logo,
    company_size,
    company_industry,
    company_established,
  } = lead;

  // --- Safe Defaults ---
  const safeSkills = Array.isArray(skills) ? skills : [];
  const safeContacts = Array.isArray(contact) ? contact : [];
  const safeJobTypes = Array.isArray(jobTypes) ? jobTypes : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeLocations = Array.isArray(jobLocations) ? jobLocations : [];
  const safeAllowedLocations = Array.isArray(allowedCandidateLocation)
    ? allowedCandidateLocation
    : [];
  const safeRemoteOptions = Array.isArray(remoteOptions) ? remoteOptions : [];
  const safeBenefits = Array.isArray(jobBenefits) ? jobBenefits : [];
  const safeEducation = Array.isArray(educationLevels) ? educationLevels : [];
  const safeCareerLevel = Array.isArray(careerLevel) ? careerLevel : [];

  const safeDescription = description || "";
  const shortDescription =
    safeDescription.length > MAX_DESC_LENGTH
      ? safeDescription.substring(0, MAX_DESC_LENGTH) + "..."
      : safeDescription;
  const displayedDescription = showFullDescription
    ? safeDescription
    : shortDescription;
  const canToggleDescription = safeDescription.length > MAX_DESC_LENGTH;

  const formattedPostedDate = postedDate
    ? new Date(postedDate).toLocaleDateString()
    : "N/A";
  const formattedCreatedAt = createdAt
    ? new Date(createdAt).toLocaleString()
    : "N/A";
  const formattedExpiresAt = expires_at
    ? new Date(expires_at).toLocaleDateString()
    : "N/A";
  const formattedLeadFetchDate = lead_fetch_date
    ? new Date(lead_fetch_date).toLocaleString()
    : "N/A";

  // --- STATUS ---
  const safeStatus = status || "unknown";
  const getStatusLabel = (statusValue) => {
    if (!statusValue) return "Unknown";
    const key = Object.keys(STATUS_ENUM).find(
      (k) => k.toLowerCase().replace(/_/g, "-") === statusValue
    );
    return key ? STATUS_ENUM[key] : statusValue.replace(/-/g, " ");
  };
  const statusLabel = getStatusLabel(safeStatus);

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

  const handleChange = (e) => onCheckboxChange(id, e.target.checked);
  const handleVisit = () => job_link && window.open(job_link, "_blank");
  const handleView = () => onView(lead);
  const handleChangeStatus = () => console.log("Change Status Clicked");

  // Helper: short link
  const renderLink = (url, label = "Visit") =>
    url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 hover:underline"
      >
        {label}
      </a>
    ) : (
      <span className="text-gray-500">N/A</span>
    );

  // Helper: render list as chips
  const renderChips = (arr) =>
    arr && arr.length > 0 ? (
      <div className="flex flex-wrap gap-1 mt-1">
        {arr.map((item, idx) => (
          <SkillCard key={idx} skill={item} />
        ))}
      </div>
    ) : (
      <span className="text-gray-500">N/A</span>
    );

  return (
    <>
      {/* COLLAPSED ROW */}
      <div
        className={`grid grid-cols-[2fr_1fr_1fr_1fr_150px] items-center text-sm border-b border-gray-100 transition-colors ${
          isExpanded ? "bg-indigo-50 hover:bg-indigo-100" : "hover:bg-gray-50"
        } ${isChecked ? "bg-green-200" : ""}`}
        style={{ minHeight: "32px" }}
      >
        <div className="py-1 px-3 flex items-center space-x-2 overflow-hidden whitespace-nowrap">
          <input type="checkbox" checked={isChecked} onChange={handleChange} />
          {company_logo && (
            <img
              src={company_logo}
              alt={company_name || "Logo"}
              className="w-5 h-5 rounded-full object-cover"
            />
          )}
          <span
            className="font-medium text-gray-900 truncate max-w-[200px]"
            title={title || "No Title"}
          >
            {title || "No Title"}
          </span>
        </div>

        <span className="py-1 px-3 text-xs text-gray-600 truncate">
          {formattedPostedDate}
        </span>

        <div className="py-1 px-3">
          {company_website ? (
            <a
              href={company_website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 truncate"
              title={company_name}
            >
              {company_name}
            </a>
          ) : (
            <span className="text-xs text-gray-500" title={company_name}>
              {company_name}
            </span>
          )}
        </div>

        <span className="py-1 px-3">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses}`}
          >
            {statusLabel}
          </span>
        </span>

        <div className="py-1 px-3 flex justify-end items-center space-x-2">
          <button onClick={handleChangeStatus} title="Change Status">
            <IconStatus />
          </button>
          <button
            onClick={handleVisit}
            title="Visit Job Link"
            disabled={!job_link}
            className={!job_link ? "opacity-50 cursor-not-allowed" : ""}
          >
            <IconVisit />
          </button>
          <button onClick={handleView} title="View Details">
            <IconView />
          </button>
          <button onClick={onEdit} title="Edit Lead">
            <IconEdit />
          </button>
          <button onClick={toggleExpand} title="Toggle Details">
            <IconExpand isExpanded={isExpanded} />
          </button>
        </div>
      </div>

      {/* EXPANDED VIEW */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 rounded-md mb-2 shadow-inner mx-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* JOB DETAILS */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h4 className="text-sm font-semibold uppercase text-indigo-700 mb-3">
                Job Details
              </h4>
              <p className="text-base font-bold text-gray-900 mb-2">
                {title || "Untitled Job"}
              </p>

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

              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold text-gray-800">Posted:</span>{" "}
                  {formattedPostedDate}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Expires:</span>{" "}
                  {formattedExpiresAt}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Source:</span>{" "}
                  {lead_source || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Fetch Date:
                  </span>{" "}
                  {formattedLeadFetchDate}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Job Types:
                  </span>{" "}
                  {renderChips(safeJobTypes)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Categories:
                  </span>{" "}
                  {renderChips(safeCategories)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Locations:
                  </span>{" "}
                  {renderChips(safeLocations)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Allowed Locations:
                  </span>{" "}
                  {renderChips(safeAllowedLocations)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Remote Options:
                  </span>{" "}
                  {renderChips(safeRemoteOptions)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Education:
                  </span>{" "}
                  {renderChips(safeEducation)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Career Level:
                  </span>{" "}
                  {renderChips(safeCareerLevel)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Skills:</span>{" "}
                  {renderChips(safeSkills)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Benefits:</span>{" "}
                  {renderChips(safeBenefits)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Salary:</span>{" "}
                  {salaryMin
                    ? `${salaryCurrency || ""} ${salaryMin} - ${
                        salaryMax || "?"
                      } ${salaryUnit || ""}`
                    : salary || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Job Link:</span>{" "}
                  {renderLink(job_link, "Open Job")}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Apply URL:
                  </span>{" "}
                  {renderLink(applyURL, "Apply")}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Career Page:
                  </span>{" "}
                  {renderLink(company_career_Page_Url, "Company Career Page")}
                </p>
              </div>
            </div>

            {/* COMPANY DETAILS */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h4 className="text-sm font-semibold uppercase text-indigo-700 mb-3">
                Company Details
              </h4>
              <div className="flex items-center space-x-3 mb-3">
                {company_logo && (
                  <img
                    src={company_logo}
                    alt={company_name}
                    className="w-12 h-12 rounded-md object-contain border"
                  />
                )}
                <p className="text-base font-semibold text-gray-900">
                  {company_name || "N/A"}
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-semibold text-gray-800">Website:</span>{" "}
                  {renderLink(company_website, "Visit")}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Summary:</span>{" "}
                  {company_summary || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Industry:</span>{" "}
                  {company_industry || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Size:</span>{" "}
                  {company_size || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Established:
                  </span>{" "}
                  {company_established || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">City:</span>{" "}
                  {company_city || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">State:</span>{" "}
                  {company_state || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Country:</span>{" "}
                  {company_country || "N/A"}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Facebook:</span>{" "}
                  {renderLink(company_facebook, "Page")}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">LinkedIn:</span>{" "}
                  {renderLink(company_linkedin, "Profile")}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Twitter:</span>{" "}
                  {renderLink(company_twitter, "Profile")}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">YouTube:</span>{" "}
                  {renderLink(company_youtube, "Channel")}
                </p>
              </div>
            </div>

            {/* CONTACT DETAILS */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h4 className="text-sm font-semibold uppercase text-indigo-700 mb-3">
                Contact Details ({safeContacts.length})
              </h4>
              {safeContacts.length > 0 ? (
                safeContacts.map((c, idx) => (
                  <div
                    key={idx}
                    className="mb-3 p-2 border border-gray-100 rounded bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {c.name || "Unknown"}{" "}
                      <span className="text-gray-500 text-xs">
                        ({c.designation || "N/A"})
                      </span>
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-800">Email:</span>{" "}
                      {renderLink(
                        c.email ? `mailto:${c.email}` : null,
                        c.email || "N/A"
                      )}
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-800">
                        Contact:
                      </span>{" "}
                      {c.contact || "N/A"}
                    </p>
                    {c.website && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium text-gray-800">
                          Website:
                        </span>{" "}
                        {renderLink(c.website, "Visit")}
                      </p>
                    )}
                    {c.linkedIn && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium text-gray-800">
                          LinkedIn:
                        </span>{" "}
                        {renderLink(c.linkedIn, "Profile")}
                      </p>
                    )}
                    {c.source && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium text-gray-800">
                          Source:
                        </span>{" "}
                        {c.source}
                      </p>
                    )}
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
