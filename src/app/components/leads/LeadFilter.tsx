"use client";

import React, { useState } from "react";
import {
  LeadSource,
  EmailStatus,
  WhatsAppSMSStatus,
  CampaignType,
} from "@/app/shared/enums/leads.enums";
import { IApiParams } from "@/app/api_handlers/api.interface";

// --- TYPES ---
type FilterOption = {
  value: string;
  label: string;
};

// --- HELPER FUNCTION (Ensures 'All' is prepended) ---

const getOptionsWithAll = (
  enumObj: any,
  allLabel: string = "All"
): FilterOption[] => {
  // 1. Create the default "All" option
  const allOption: FilterOption = {
    value: "all", // Consistent string value for filtering
    label: allLabel,
  };

  // 2. Generate options from the enum
  // Object.keys(enumObj) will return keys. If it's a numeric enum, it will include
  // both names and numbers. Filtering for names (non-numbers) ensures we get the intended options.
  const enumOptions: FilterOption[] = Object.keys(enumObj)
    .filter((key) => isNaN(Number(key))) // Exclude reverse-mapped numeric keys
    .map((key) => ({
      value: enumObj[key] as string, // The actual enum value (e.g., 'WEB', 'SENT')
      label: key.replace(/_/g, " "), // The formatted enum key (e.g., 'WEB', 'EMAIL SENT')
    }));

  // 3. Prepend the "All" option
  return [allOption, ...enumOptions];
};

// --- PRE-CALCULATE STATIC OPTIONS (Moved outside component) ---
const staticOptions = {
  lead_source: getOptionsWithAll(LeadSource, "All"),
  email_status: getOptionsWithAll(EmailStatus, "All"),
  sms_status: getOptionsWithAll(WhatsAppSMSStatus, "All"),
  campaign_type: getOptionsWithAll(CampaignType, "All"),
};

export const LeadsFilter = ({ onFilter }) => {
  // States are strings to accommodate the 'all' value, initialized to 'all'
  const [leadSource, setLeadSource] = useState<string>("all");
  const [emailStatus, setEmailStatus] = useState<string>("all");
  const [smsStatus, setSmsStatus] = useState<string>("all");
  const [campaignType, setCampaignType] = useState<string>("all");
  const [isDeleted, setIsDeleted] = useState<boolean>(false);

  // The options are now accessed directly from staticOptions
  const options = staticOptions;

  const handleFilter = () => {
    const activeFilters: any = {};

    // Only add the filter to the query if it's NOT 'all'
    if (leadSource !== "all") {
      activeFilters.lead_source = leadSource;
    }
    if (emailStatus !== "all") {
      activeFilters.email_status = emailStatus;
    }
    if (smsStatus !== "all") {
      activeFilters.sms_status = smsStatus;
    }
    if (campaignType !== "all") {
      activeFilters.campaign_type = campaignType;
    }

    if (isDeleted) {
      activeFilters.is_deleted = isDeleted;
    }
    const params: IApiParams = { query: activeFilters };

    onFilter(params);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
      {/* Lead Source Dropdown */}
      <div className="flex flex-col">
        <label
          htmlFor="lead_source"
          className="text-sm font-medium text-gray-700 mb-1"
        >
          Lead Source
        </label>
        <select
          id="lead_source"
          value={leadSource}
          // The state handler must accept a string, which the target.value always is.
          onChange={(e) => setLeadSource(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        >
          {options.lead_source.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Email Status Dropdown */}
      <div className="flex flex-col">
        <label
          htmlFor="email_status"
          className="text-sm font-medium text-gray-700 mb-1"
        >
          Email Status
        </label>
        <select
          id="email_status"
          value={emailStatus}
          onChange={(e) => setEmailStatus(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        >
          {options.email_status.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* SMS/WhatsApp Status Dropdown */}
      <div className="flex flex-col">
        <label
          htmlFor="sms_status"
          className="text-sm font-medium text-gray-700 mb-1"
        >
          SMS Status
        </label>
        <select
          id="sms_status"
          value={smsStatus}
          onChange={(e) => setSmsStatus(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        >
          {options.sms_status.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Campaign Type Dropdown */}
      <div className="flex flex-col">
        <label
          htmlFor="campaign_type"
          className="text-sm font-medium text-gray-700 mb-1"
        >
          Campaign Type
        </label>
        <select
          id="campaign_type"
          value={campaignType}
          onChange={(e) => setCampaignType(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        >
          {options.campaign_type.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Is Deleted Checkbox */}
      <div className="flex items-center space-x-2 h-full pt-6">
        <input
          type="checkbox"
          id="is_deleted"
          checked={isDeleted}
          onChange={(e) => setIsDeleted(e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label
          htmlFor="is_deleted"
          className="text-sm font-medium text-gray-700 select-none"
        >
          Is Deleted
        </label>
      </div>

      {/* Filter Button */}
      <button
        onClick={handleFilter}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-150 shadow-sm disabled:opacity-50"
      >
        Filter
      </button>
    </div>
  );
};
