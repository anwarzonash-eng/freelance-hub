// components/leads/LeadsComponent.jsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Papa from "papaparse";
import { Dropdown } from "../components/form-components/dropdown";
import { LeadFormModal } from "../components/leads/LeadFormModal";
import { LeadDetailsModal } from "../components/leads/LeadDetailsModal";
import { IconAdd } from "../components/ui/icon-components";
import { STATUS_ENUM, SOURCE_ENUM } from "../shared/enums/select";
import { LeadRow } from "../components/leads/leadsRow";
import { HandCoins } from "lucide-react";
import GenericPopup from "../components/popups/GenericPopup";
import StartCampaignForm from "../components/campaigns/StartCampaignForm"; // Use the new component name
import {
  addBulkNewLead,
  deleteBulkLead,
  getALLLeads,
} from "../api_handlers/api/leads.api ";

const BULK_UPLOAD_API = `${process.env.NEXT_PUBLIC_API_PATH}remote-jobs/bulk-upload`;

const EXPECTED_HEADERS = [
  "title",
  "description",
  "link",
  "category",
  "type",
  "pubDate",
  "expires_at",
  "region",
  "country",
  "state",
  "skills", // Will be split by semicolon (;)
  "is_sent_email",
  "personal_sites_profile_attached",
  "personal_sites_profile_attached_short_link",
  "is_viewed",
  "status",
  "response_status",
  "email_sent_date",
  "company_details_logo",
  "company_details_name",
  "company_details_website",
  "company_details_size",
  "company_details_industry",
  "company_details_established",
  "contact_details_email",
  "contact_details_name",
  "contact_details_contact",
  "contact_details_linkedIn",
  "contact_details_designation",
  "contact_details_source",
];
const valueOrNull = (value) => {
  // Check if value is strictly an empty string, or whitespace-only
  const trimmedValue = value?.trim();
  return trimmedValue === "" ||
    trimmedValue === undefined ||
    trimmedValue === null
    ? null
    : value;
};

const getDropdownOptions = (enumObj) => {
  return Object.entries(enumObj).map(([key, label]) => ({
    value: key.toLowerCase().replace(/_/g, "-"),
    label: label,
  }));
};

const SOURCE_OPTIONS = getDropdownOptions(SOURCE_ENUM);
const STATUS_OPTIONS = getDropdownOptions(STATUS_ENUM);

// --- MOCK DATA REMAINS UNCHANGED ---
const mockLeadsData = {
  data: [
    {
      id: "cd6068d7-3f5e-4966-8860-a1a58ddef0d6",
      title: "Senior Full-Stack JavaScript Developer (Remote)",
      description:
        "Looking for a highly skilled developer to work on our core application platform using NestJS, React, and PostgreSQL. The work environment is fast-paced, and we value collaborative problem-solving. This is a long description to test the read more/less functionality and ensure the expanded view handles text overflow gracefully.",
      link: "https://careers.examplecorp.com/senior-developer-remote-123453",
      skills: [
        "TypeScript",
        "Node.js",
        "NestJS",
        "React",
        "PostgreSQL",
        "TailwindCSS",
      ],
      type: "Full-Time",
      pubDate: "2025-10-01T10:00:00.000Z",
      company_details: {
        name: "ExampleCorp Global",
        website: "https://www.examplecorp.com",
      },
      contact_details: [
        {
          name: "Jane Doe",
          email: "hiring@examplecorp.com",
          contact: "+1-555-1234",
          designation: "Hiring Manager",
        },
      ],
      status: "pending",
      createdAt: "2025-10-02T00:57:21.813Z",
    },
    {
      id: "e4b2a8f9-7d1c-4e6a-b0d3-c9e8f7g6h5i4",
      title: "Remote React Developer needed for marketing platform",
      description:
        "Seeking an experienced developer to join our remote team. Requires strong knowledge of React, Redux, and modern CSS. Competitive salary and fully remote working conditions. This description is short.",
      link: "https://jobs.weworkremotely.com/react-developer-2025",
      skills: ["React", "Redux", "CSS3", "JavaScript"],
      type: "Contract",
      pubDate: "2025-09-28T14:30:00.000Z",
      company_details: {
        name: "Remote Solutions Inc.",
        website: "https://remotesolutions.com",
      },
      contact_details: [],
      status: "short-listed",
      createdAt: "2025-09-29T10:15:45.000Z",
    },
    {
      id: "f5c3b9e0-8e2d-4f7b-9c1a-d0f9e8g7h6i5",
      title: "Backend Engineer (Node.js/GraphQL)",
      description:
        "Join our innovative team building scalable backend services. Experience with Node.js, GraphQL, and AWS is a plus. Remote friendly, great benefits.",
      link: "https://careers.techcorp.com/backend-engineer",
      skills: ["Node.js", "GraphQL", "AWS", "PostgreSQL", "Docker"],
      type: "Full-Time",
      pubDate: "2025-09-25T08:00:00.000Z",
      company_details: {
        name: "TechCorp Innovations",
        website: "https://techcorp.com",
      },
      contact_details: [
        {
          name: "John Smith",
          email: "john.smith@techcorp.com",
          contact: "+1-555-9876",
          designation: "Recruiting Specialist",
        },
      ],
      status: "email-sent",
      createdAt: "2025-09-26T11:00:00.000Z",
    },
  ],
};

// --- FETCH LEADS FUNCTION REMAINS UNCHANGED ---
const fetchLeads = async (filters) => {
  const response = await getALLLeads();
  let leadsData = [];

  if (response) {
    leadsData = response.data || [];
  } else {
    // Fallback if API fails

    leadsData = mockLeadsData.data;
  }

  const { searchText, status } = filters;
  let filteredData = leadsData;

  // Client-side Filtering by Status
  if (status && status !== "any") {
    filteredData = filteredData.filter((lead) => lead.status === status);
  }

  // Client-side Filtering by Search Text
  if (searchText) {
    const lowerCaseSearch = searchText.toLowerCase();

    filteredData = filteredData.filter((lead) => {
      const titleMatch = lead.title?.toLowerCase().includes(lowerCaseSearch);
      const companyMatch = lead.company_details?.name
        ?.toLowerCase()
        .includes(lowerCaseSearch);
      const skillMatch =
        Array.isArray(lead.skills) &&
        lead.skills.some((skill) =>
          skill?.toLowerCase().includes(lowerCaseSearch)
        );

      return titleMatch || companyMatch || skillMatch;
    });
  }

  // Sorting by pubDate (Descending: Newest first)
  const sortedData = [...filteredData].sort((a, b) => {
    // Handle cases where pubDate might be missing or invalid
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;

    // dateB - dateA sorts in descending order (newest first)
    return dateB - dateA;
  });

  return sortedData;
};

// --- LEADS COMPONENT START ---
const LeadsComponent = () => {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    searchText: "",
    source: SOURCE_OPTIONS[0].value,
    status: STATUS_OPTIONS[0].value,
  });
  const [expandedIds, setExpandedIds] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const isAnySelected = selectedIds.size > 0;
  const selectedIdsArray = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  );

  // Modal Management
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [leadToView, setLeadToView] = useState(null);

  // CSV Upload State
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openStartCampaignPopup, setPpenStartCampaignPopup] = useState(false);

  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);

  const loadLeads = useCallback(async (currentFilters) => {
    setIsLoading(true);
    try {
      const data = await fetchLeads(currentFilters);
      setLeads(data);
    } catch (error) {
      console.error("Failed to load leads:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = async () => {
    console.log(selectedIds);
    setIsDeleting(true);
    // const response = await fetch(
    //   "http://localhost:3001/remote-jobs/bulk-delete",
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       // Include authorization headers if your API requires them (e.g., JWT)
    //       // 'Authorization': `Bearer ${yourAuthToken}`,
    //     },
    //     // The request body must match the BulkDeleteDto: { ids: string[] }
    //     body: JSON.stringify(),
    //   }
    // );
    const response = await deleteBulkLead(selectedIdsArray);
    if (!response) {
    } else loadLeads(filters);
    setIsDeleting(false);
  };

  const handleCheckAll = (e) => {
    const checkedValue = e.target.checked;

    if (checkedValue) {
      const allIds = new Set(leads.map((item) => item.id));

      setSelectedIds(allIds);
    } else setSelectedIds(new Set());
  };

  const handleStartCampaign = () => {
    selectedIdsArray;
    setPpenStartCampaignPopup(!openStartCampaignPopup);
  };

  useEffect(() => {
    loadLeads(filters);
  }, [loadLeads]);

  const handleCheckboxChange = (id, isChecked) => {
    const newSelectedIds = new Set(selectedIds);

    if (isChecked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }

    setSelectedIds(newSelectedIds);
  };

  // --- CSV UPLOAD HANDLERS ---

  const triggerFileInput = () => {
    setUploadStatus(null);
    fileInputRef.current?.click();
  };

  // Main CSV upload and processing function
  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadStatus("Parsing CSV...");

    // Use PapaParse to parse the CSV file
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        try {
          // --- Header Validation ---
          const actualHeaders = results.meta.fields || [];
          const missingHeaders = EXPECTED_HEADERS.filter(
            (header) => !actualHeaders.includes(header)
          );

          if (missingHeaders.length > 0) {
            throw new Error(
              `CSV Error: Missing required headers: ${missingHeaders.join(
                ", "
              )}`
            );
          }

          if (results.data.length === 0) {
            throw new Error("CSV Error: File contains no data rows.");
          }

          setUploadStatus(
            `Found ${results.data.length} records. Preparing for API...`
          );

          // --- Data Transformation (Flattening/Nesting) ---
          const remoteJobsPayload = results.data.map((row) => {
            // Helper to handle boolean transformation from CSV string
            const transformBoolean = (val) =>
              val?.trim().toLowerCase() === "true" || val?.trim() === "1";

            // Apply valueOrNull utility to ALL row values before assignment
            const cleanedRow = {};
            for (const key in row) {
              cleanedRow[key] = valueOrNull(row[key]);
            }

            return {
              title: cleanedRow.title,
              description: cleanedRow.description,
              link: cleanedRow.link,
              category: cleanedRow.category,
              type: cleanedRow.type,
              pubDate: cleanedRow.pubDate, // Will be null or a date string
              expires_at: cleanedRow.expires_at, // Will be null or a date string
              region: cleanedRow.region,
              country: cleanedRow.country,
              state: cleanedRow.state,
              // Split semicolon-separated skills string into an array, using null check
              skills: cleanedRow.skills
                ? cleanedRow.skills.split(";").map((s) => s.trim())
                : [],
              is_sent_email: transformBoolean(cleanedRow.is_sent_email),
              personal_sites_profile_attached:
                cleanedRow.personal_sites_profile_attached,
              personal_sites_profile_attached_short_link:
                cleanedRow.personal_sites_profile_attached_short_link,
              is_viewed: transformBoolean(cleanedRow.is_viewed),
              status: cleanedRow.status,
              response_status: cleanedRow.response_status,
              email_sent_date: cleanedRow.email_sent_date, // Will be null or a date string

              // Re-nest company details
              company_details: {
                logo: cleanedRow.company_details_logo,
                name: cleanedRow.company_details_name,
                website: cleanedRow.company_details_website,
                size: cleanedRow.company_details_size,
                industry: cleanedRow.company_details_industry,
                established: cleanedRow.company_details_established,
              },

              // Re-nest contact details
              contact_details: [
                {
                  email: cleanedRow.contact_details_email,
                  name: cleanedRow.contact_details_name,
                  contact: cleanedRow.contact_details_contact,
                  linkedIn: cleanedRow.contact_details_linkedIn,
                  designation: cleanedRow.contact_details_designation,
                  source: cleanedRow.contact_details_source,
                },
              ].filter((c) => c.email || c.name), // Filter out empty contact objects
            };
          });

          // --- API Call ---
          setUploadStatus(
            `Submitting ${remoteJobsPayload.length} leads to API...`
          );

          // const apiRes = await fetch(BULK_UPLOAD_API, {
          //   method: "POST",
          //   headers: {
          //     "Content-Type": "application/json",
          //   },
          //   body: JSON.stringify(remoteJobsPayload),
          // });

          // if (!apiRes.ok) {
          //   const errorBody = await apiRes.json();
          //   const errorMessage =
          //     errorBody.message ||
          //     `API Upload Failed with status ${apiRes.status}. Check server logs.`;
          //   throw new Error(errorMessage);
          // }

          // // --- Success and Refresh ---
          // setUploadStatus(
          //   `✅ Upload successful! ${remoteJobsPayload.length} leads created. Refreshing list...`
          // );

          const apiRes = await addBulkNewLead(remoteJobsPayload);

          if (apiRes) {
            setUploadStatus(
              `✅ Upload successful! ${remoteJobsPayload.length} leads created. Refreshing list...`
            );

            await loadLeads(filters);
            setUploadLoading(false);
          }
          await loadLeads(filters);
        } catch (err) {
          setUploadStatus(`❌ Error during upload: ${err.message}`);
        } finally {
          setUploadLoading(false);
          event.target.value = null;
        }
      },
      error: (error) => {
        setUploadLoading(false);
        setUploadStatus(`❌ CSV Parsing Error: ${error.message}`);
        event.target.value = null;
      },
    });
  };
  // --- END CSV UPLOAD HANDLERS ---

  // --- Modal & Filter Handlers (Unchanged) ---
  const handleCreateLead = () => {
    setLeadToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleEditLead = (lead) => {
    setLeadToEdit(lead);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setLeadToEdit(null);
  };

  const handleLeadSaved = () => {
    loadLeads(filters);
  };

  const handleViewLead = (lead) => {
    setLeadToView(lead);
    setIsDetailsModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsDetailsModalOpen(false);
    setLeadToView(null);
  };

  const handleSearch = () => {
    loadLeads(filters);
  };
  const handleRefresh = () => {
    loadLeads(filters);
  };

  const handleFilterChange = (field) => (e) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleTextSearchChange = (e) => {
    setFilters((prev) => ({ ...prev, searchText: e.target.value }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {openStartCampaignPopup && (
        <GenericPopup title="Start New Campaign" onClose={handleStartCampaign}>
          <StartCampaignForm
            recipientIds={selectedIdsArray}
            onClose={handleStartCampaign}
          />
        </GenericPopup>
      )}
      {/* --- Search Panel with NEW Upload Button --- */}
      <div className="flex space-x-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm mb-4 items-center">
        {/* Text Search Field */}
        <input
          type="text"
          placeholder="Search titles, skills, or companies..."
          value={filters.searchText}
          onChange={handleTextSearchChange}
          onKeyDown={handleKeyDown}
          className="flex-grow p-2 border border-gray-300 rounded text-sm h-8 focus:ring-indigo-500 focus:border-indigo-500"
        />

        {/* Dropdown Filters */}
        <Dropdown
          options={SOURCE_OPTIONS}
          value={filters.source}
          onChange={handleFilterChange("source")}
        />
        <Dropdown
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={handleFilterChange("status")}
        />

        {/* Buttons */}
        <button
          onClick={handleSearch}
          className="px-4 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors h-8 shadow flex-shrink-0"
        >
          Search
        </button>
        <button
          onClick={handleRefresh}
          className="px-4 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors h-8 flex-shrink-0"
          disabled={isLoading || uploadLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>

        {/* --- NEW CSV UPLOAD BUTTON --- */}
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleCsvUpload}
          className="hidden"
        />
        <button
          onClick={triggerFileInput}
          disabled={isLoading || uploadLoading}
          className={`px-4 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors h-8 flex-shrink-0`}
        >
          <span>{uploadLoading ? "Processing CSV..." : "Upload CSV"}</span>
        </button>
        {/* --- END CSV UPLOAD BUTTON --- */}

        <button
          onClick={handleCreateLead}
          disabled={!isAnySelected}
          className="px-4 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors h-8 flex-shrink-0 "
        >
          Create Lead
        </button>
        <button
          className="px-4 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors h-8 flex-shrink-0 disabled:text-gray-400 disabled:bg-gray-100 disabled:border-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
          onClick={handleDelete}
          disabled={!isAnySelected || isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
        <button
          className="px-4 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors h-8 flex-shrink-0 disabled:text-gray-400 disabled:bg-gray-100 disabled:border-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
          onClick={handleStartCampaign}
          disabled={!isAnySelected}
        >
          Start a Campaign
        </button>
      </div>
      {/* --- End Search Panel --- */}

      {/* --- Upload Status/Loading Panel --- */}
      {uploadStatus && (
        <div
          className={`p-3 my-3 rounded-lg shadow-md ${
            uploadLoading
              ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
              : uploadStatus.includes("✅")
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          <p className="font-semibold">{uploadStatus}</p>
        </div>
      )}
      {/* --- End Upload Status Panel --- */}

      {/* --- Leads Table --- (Unchanged) */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Table Header (Compact) */}
          <div className="grid grid-cols-[2fr_0.8fr_1fr_1fr_150px] text-xs font-semibold uppercase text-gray-500 bg-gray-100 border-b border-gray-200 py-2 px-3 sticky top-0">
            <span className="flex">
              <input
                type="checkbox"
                onChange={handleCheckAll} // Handler updates the parent state
              />{" "}
              {"  "}
              Title & Type
            </span>
            <span>Date Published</span>
            <span>Company Name</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Table Body */}
          {isLoading && (
            <div className="p-4 text-center text-indigo-600">
              Loading leads...
            </div>
          )}

          {!isLoading &&
            leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                isExpanded={expandedIds[lead.id]}
                toggleExpand={() => toggleExpand(lead.id)}
                onEdit={() => handleEditLead(lead)}
                onView={() => handleViewLead(lead)}
                isChecked={selectedIds.has(lead.id)}
                onCheckboxChange={handleCheckboxChange}
              />
            ))}

          {!isLoading && leads.length === 0 && (
            <div className="text-center p-4 text-gray-500">No leads found.</div>
          )}
        </div>
      </div>
      {/* --- End Leads Table --- */}

      {/* Lead Form Modal (Edit/Create) - Unchanged */}
      {isEditModalOpen && (
        <LeadFormModal
          leadData={leadToEdit}
          onClose={handleCloseEditModal}
          onSave={handleLeadSaved}
        />
      )}

      {/* Lead Details Modal (View) - Unchanged */}
      {isDetailsModalOpen && leadToView && (
        <LeadDetailsModal
          lead={leadToView}
          onClose={handleCloseViewModal}
          onEdit={() => {
            handleCloseViewModal();
            handleEditLead(leadToView);
          }}
        />
      )}
    </div>
  );
};

export default LeadsComponent;
