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
import { LeadFormModal } from "../components/leads/LeadFormModal";
import { LeadDetailsModal } from "../components/leads/LeadDetailsModal";
import { LeadRow } from "../components/leads/leadsRow";
import GenericPopup from "../components/popups/GenericPopup";
import StartCampaignForm from "../components/campaigns/StartCampaignForm"; // Use the new component name
import {
  addBulkNewLead,
  deleteBulkLead,
  getALLLeads,
} from "../api_handlers/api/leads.api ";
import { LeadsFilter } from "../components/leads/LeadFilter";
import { IApiParams } from "../api_handlers/api.interface";

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

// --- LEADS COMPONENT START ---
const LeadsComponent = () => {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
  const [filterParam, setFilterParam] = useState({});

  // CSV Upload State
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openStartCampaignPopup, setPpenStartCampaignPopup] = useState(false);

  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);

  const loadLeads = async (currentFilters: IApiParams | null) => {
    console.log(currentFilters);

    setIsLoading(true);

    const response = await getALLLeads(currentFilters);
    let leadsData = [];

    if (response) {
      leadsData = response.data || [];
    }
    setIsLoading(false);
    setLeads(leadsData);
  };

  const handleDelete = async () => {
    console.log(selectedIds);
    setIsDeleting(true);

    const response = await deleteBulkLead(selectedIdsArray);
    if (!response) {
    } else loadLeads(null);
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
            const cleanedRow: any = {};
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

          const apiRes = await addBulkNewLead(remoteJobsPayload);

          if (apiRes) {
            setUploadStatus(
              `✅ Upload successful! ${remoteJobsPayload.length} leads created. Refreshing list...`
            );

            await loadLeads(null);
            setUploadLoading(false);
          }
          await loadLeads(null);
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
    loadLeads(null);
  };

  const handleViewLead = (lead) => {
    setLeadToView(lead);
    setIsDetailsModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsDetailsModalOpen(false);
    setLeadToView(null);
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

        {/* Buttons */}

        <LeadsFilter onFilter={loadLeads} />

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
          // disabled={!isAnySelected}
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
