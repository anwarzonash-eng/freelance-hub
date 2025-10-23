// components/forms/LeadFormModal.jsx
import React, { useState, useEffect } from "react";
import { IconClose, IconAdd, IconTrash } from "../ui/icon-components";
import { addNewLead } from "@/app/api_handlers/api/leads.api ";
import {
  LeadSource,
  CampaignType,
  EmailStatus,
  SentStatus,
  WhatsAppSMSStatus,
} from "@/app/shared/enums/leads.enums";

// --- Helper to create empty contact ---
const createNewContact = () => ({
  email: "",
  name: "",
  contact: "",
  linkedIn: "",
  website: "",
  designation: "",
  profile_picture: "",
  source: "",
});

// --- Default empty lead ---
const emptyLead = {
  title: "",
  job_link: "",
  description: "",
  postedDate: new Date().toISOString().substring(0, 10),
  jobLocations: [],
  allowedCandidateLocation: [],
  remoteOptions: [],
  jobTypes: [],
  slug: "",
  salary: null,
  jobBenefits: [],
  educationLevels: [],
  applyURL: "",
  careerLevel: [],
  salaryMin: null,
  salaryMax: null,
  salaryUnit: null,
  salaryCurrency: null,
  company_career_Page_Url: "",
  skills: [],
  categories: [],
  expires_at: null,
  is_deleted: false,

  contact: [createNewContact()],
  lead_source: LeadSource.BOUGHT_NEW_DOMAINS,
  email_status: EmailStatus.New,
  sms_status: WhatsAppSMSStatus.New,
  campaign_type: CampaignType.Both,

  is_viewed: false,
  lead_fetch_date: null,
  company_name: "",
  company_website: "",
  company_city: "",
  company_state: "",
  company_country: "",
  company_summary: "",
  company_facebook: "",
  company_linkedin: "",
  company_twitter: "",
  company_youtube: "",
  company_logo: "",
  company_size: null,
  company_industry: "",
  company_established: "",
  personal_website_id: "",

  is_approved_for_email: false,
  is_approved_SMS_Whatsapp_approval: false,
  is_news_letter_attached: false,
  is_require_personal_website: false,
  is_meta_data_attached: false,
  is_short_listed_for_email: false,
  is_short_listed_for_sms: false,
  is_email_fetched: false,
  is_mobile_number_fetched: false,
  is_website_created: false,
  is_short_links_attached: false,
  is_pdf_linked: false,

  is_email_sent: false,
  is_whatsapp_sent: false,
  is_SMS_sent: false,
};

export const LeadFormModal = ({ leadData, onClose, onSave }) => {
  const isEditing = !!leadData?.id;
  const [formData, setFormData] = useState(leadData || emptyLead);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [openPersonalWebsitePopup, setopenPersonalWebsitePopup] =
    useState(false);

  useEffect(() => {
    if (leadData) {
      setFormData({
        ...emptyLead,
        ...leadData,
        contact: leadData.contact?.length
          ? leadData.contact
          : [createNewContact()],
      });
    } else {
      setFormData(emptyLead);
    }
  }, [leadData]);

  // --- Generic input handler ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // --- Contact handler ---
  const handleContactChange = (index, e) => {
    const { name, value } = e.target;
    const updated = formData.contact.map((c, i) =>
      i === index ? { ...c, [name]: value } : c
    );
    setFormData((prev) => ({ ...prev, contact: updated }));
  };

  const addContact = () =>
    setFormData((prev) => ({
      ...prev,
      contact: [...prev.contact, createNewContact()],
    }));

  const removeContact = (index) => {
    const updated = formData.contact.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      contact: updated.length ? updated : [createNewContact()],
    }));
  };

  // --- Array field handler ---
  const handleArrayChange = (field, values) => {
    setFormData((prev) => ({ ...prev, [field]: values }));
  };

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await addNewLead({
        ...formData,
        action_type: isEditing ? "update" : "add",
      });
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save lead.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex justify-center items-start pt-4">
      <div className="bg-white shadow-2xl w-full max-w-7xl h-[95vh] overflow-y-auto rounded-lg">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? `Edit Lead: ${formData.title}` : "Create New Lead"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900"
          >
            <IconClose />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Column 1: Job Details */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-indigo-700 border-b pb-1">
              Job Details
            </h3>
            <div className="flex flex-row w-full justify-items-center ">
              <div className="w-1/2 m-4 flex flex-col gap-4">
                <FormSelect
                  label="Lead Source"
                  name="lead_source"
                  value={formData.lead_source}
                  onChange={handleChange}
                  options={Object.values(LeadSource).map((v) => ({
                    value: v,
                    label: v
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" "),
                  }))}
                />
                <FormSelect
                  label="Email Status"
                  name="email_status"
                  value={formData.email_status}
                  onChange={handleChange}
                  options={Object.values(EmailStatus).map((v) => ({
                    value: v,
                    label: v
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" "),
                  }))}
                />
                <FormSelect
                  label="SMS & Whatsapp Status"
                  name="sms_status"
                  value={formData.sms_status}
                  onChange={handleChange}
                  options={Object.values(WhatsAppSMSStatus).map((v) => ({
                    value: v,
                    label: v
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" "),
                  }))}
                />
                <FormSelect
                  label="Campaign Type"
                  name="campaign_type"
                  value={formData.campaign_type}
                  onChange={handleChange}
                  options={Object.values(CampaignType).map((v) => ({
                    value: v,
                    label: v
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" "),
                  }))}
                />
                <div className="flex flex-row gap-1">
                  <FormInput
                    label="Personal Website Link"
                    name="personal_website_id"
                    value={formData.personal_website_id || ""}
                    onChange={handleChange}
                    disabled={true}
                  />
                  <button
                    type="button"
                    onClick={() => setopenPersonalWebsitePopup(true)}
                    className="px-3 py-1 bg-indigo-600  text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
              <div className="w-1/2 m-4 flex-col gap-4">
                <FormCheckbox
                  label="Viewed"
                  name="is_viewed"
                  checked={formData.is_viewed}
                  onChange={handleChange}
                />
                <FormCheckbox
                  label="Approve for Email"
                  name="is_approved_for_email"
                  checked={formData.is_approved_for_email}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="Approve for SMS / WhatsApp Approval"
                  name="is_approved_SMS_Whatsapp_approval"
                  checked={formData.is_approved_SMS_Whatsapp_approval}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="News Letter Attached"
                  name="is_news_letter_attached"
                  checked={formData.is_news_letter_attached}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="Require Personal Website"
                  name="is_require_personal_website"
                  checked={formData.is_require_personal_website}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="Meta Data Attached"
                  name="is_meta_data_attached"
                  checked={formData.is_meta_data_attached}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="Short List for Email"
                  name="is_short_listed_for_email"
                  checked={formData.is_short_listed_for_email}
                  onChange={handleChange}
                />
                <FormCheckbox
                  label="Short List for SMS"
                  name="is_short_listed_for_sms"
                  checked={formData.is_short_listed_for_sms}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="Email Fetched"
                  name="is_email_fetched"
                  checked={formData.is_email_fetched}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="Mobile Number Fetched"
                  name="is_mobile_number_fetched"
                  checked={formData.is_mobile_number_fetched}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="Website Created"
                  name="is_website_created"
                  checked={formData.is_website_created}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="Short Links Attached"
                  name="is_short_links_attached"
                  checked={formData.is_short_links_attached}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="PDF Linked"
                  name="is_pdf_linked"
                  checked={formData.is_pdf_linked}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="Email Sent"
                  name="is_email_sent"
                  checked={formData.is_email_sent}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="WhatsApp Sent"
                  name="is_whatsapp_sent"
                  checked={formData.is_whatsapp_sent}
                  onChange={handleChange}
                />

                <FormCheckbox
                  label="SMS Sent"
                  name="is_SMS_sent"
                  checked={formData.is_SMS_sent}
                  onChange={handleChange}
                />
              </div>
            </div>
            <FormInput
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
            <FormInput
              label="Job Link"
              name="job_link"
              value={formData.job_link || ""}
              onChange={handleChange}
            />
            <FormTextArea
              label="Description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
            />
            <FormInput
              label="Slug"
              name="slug"
              value={formData.slug || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Apply URL"
              name="applyURL"
              value={formData.applyURL || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Salary Min"
              name="salaryMin"
              type="number"
              value={formData.salaryMin || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Salary Max"
              name="salaryMax"
              type="number"
              value={formData.salaryMax || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Salary Unit"
              name="salaryUnit"
              value={formData.salaryUnit || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Salary Currency"
              name="salaryCurrency"
              value={formData.salaryCurrency || ""}
              onChange={handleChange}
            />
            <FormMultiSelect
              label="Job Locations"
              values={formData.jobLocations}
              onChange={(v) => handleArrayChange("jobLocations", v)}
            />
            <FormMultiSelect
              label="Allowed Candidate Locations"
              values={formData.allowedCandidateLocation}
              onChange={(v) => handleArrayChange("allowedCandidateLocation", v)}
            />
            <FormMultiSelect
              label="Remote Options"
              values={formData.remoteOptions}
              onChange={(v) => handleArrayChange("remoteOptions", v)}
            />
            <FormMultiSelect
              label="Job Types"
              values={formData.jobTypes}
              onChange={(v) => handleArrayChange("jobTypes", v)}
            />
            <FormMultiSelect
              label="Skills"
              values={formData.skills}
              onChange={(v) => handleArrayChange("skills", v)}
            />
            <FormMultiSelect
              label="Categories"
              values={formData.categories}
              onChange={(v) => handleArrayChange("categories", v)}
            />
            <FormMultiSelect
              label="Job Benefits"
              values={formData.jobBenefits}
              onChange={(v) => handleArrayChange("jobBenefits", v)}
            />
            <FormMultiSelect
              label="Education Levels"
              values={formData.educationLevels}
              onChange={(v) => handleArrayChange("educationLevels", v)}
            />
            <FormMultiSelect
              label="Career Level"
              values={formData.careerLevel}
              onChange={(v) => handleArrayChange("careerLevel", v)}
            />
            <FormInput
              label="Posted Date"
              name="postedDate"
              type="date"
              value={formData.postedDate || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Expires At"
              name="expires_at"
              type="date"
              value={formData.expires_at || ""}
              onChange={handleChange}
            />
          </div>

          {/* Column 2: Company Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-indigo-700 border-b pb-1">
              Company Details
            </h3>
            <FormInput
              label="Company Name"
              name="company_name"
              value={formData.company_name || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Website"
              name="company_website"
              value={formData.company_website || ""}
              onChange={handleChange}
            />
            <FormInput
              label="City"
              name="company_city"
              value={formData.company_city || ""}
              onChange={handleChange}
            />
            <FormInput
              label="State"
              name="company_state"
              value={formData.company_state || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Country"
              name="company_country"
              value={formData.company_country || ""}
              onChange={handleChange}
            />
            <FormTextArea
              label="Summary"
              name="company_summary"
              value={formData.company_summary || ""}
              onChange={handleChange}
              rows={3}
            />
            <FormInput
              label="Facebook"
              name="company_facebook"
              value={formData.company_facebook || ""}
              onChange={handleChange}
            />
            <FormInput
              label="LinkedIn"
              name="company_linkedin"
              value={formData.company_linkedin || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Twitter"
              name="company_twitter"
              value={formData.company_twitter || ""}
              onChange={handleChange}
            />
            <FormInput
              label="YouTube"
              name="company_youtube"
              value={formData.company_youtube || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Logo URL"
              name="company_logo"
              value={formData.company_logo || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Size"
              name="company_size"
              type="number"
              value={formData.company_size || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Industry"
              name="company_industry"
              value={formData.company_industry || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Established"
              name="company_established"
              value={formData.company_established || ""}
              onChange={handleChange}
            />
            <FormInput
              label="Career Page URL"
              name="company_career_Page_Url"
              value={formData.company_career_Page_Url || ""}
              onChange={handleChange}
            />
          </div>

          {/* Column 3: Contacts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-indigo-700 border-b pb-1">
              Contacts
            </h3>
            {formData.contact.map((c, idx) => (
              <div
                key={idx}
                className="p-3 border border-gray-200 rounded space-y-2 relative group"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => removeContact(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <IconTrash />
                  </button>
                </div>
                <FormInput
                  label="Name"
                  name="name"
                  value={c.name || ""}
                  onChange={(e) => handleContactChange(idx, e)}
                />
                <FormInput
                  label="Email"
                  name="email"
                  value={c.email || ""}
                  onChange={(e) => handleContactChange(idx, e)}
                />
                <FormInput
                  label="Contact"
                  name="contact"
                  value={c.contact || ""}
                  onChange={(e) => handleContactChange(idx, e)}
                />
                <FormInput
                  label="LinkedIn"
                  name="linkedIn"
                  value={c.linkedIn || ""}
                  onChange={(e) => handleContactChange(idx, e)}
                />
                <FormInput
                  label="Website"
                  name="website"
                  value={c.website || ""}
                  onChange={(e) => handleContactChange(idx, e)}
                />
                <FormInput
                  label="Designation"
                  name="designation"
                  value={c.designation || ""}
                  onChange={(e) => handleContactChange(idx, e)}
                />
                <FormInput
                  label="Profile Picture URL"
                  name="profile_picture"
                  value={c.profile_picture || ""}
                  onChange={(e) => handleContactChange(idx, e)}
                />
                <FormInput
                  label="Source"
                  name="source"
                  value={c.source || ""}
                  onChange={(e) => handleContactChange(idx, e)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addContact}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
            >
              <IconAdd />
              <span>Add Contact</span>
            </button>
          </div>

          {/* Submit */}
          <div className="md:col-span-3 pt-4 border-t flex justify-end items-center space-x-4">
            <FormCheckbox
              label="Is Deleted"
              name="is_deleted"
              checked={formData.is_deleted}
              onChange={handleChange}
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Helper Inputs ---
const FormInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
}) => (
  <div className="flex flex-col">
    <label className="text-xs font-medium text-gray-600 mb-1">
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="p-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
      disabled={disabled}
    />
  </div>
);

const FormTextArea = ({ label, name, value, onChange, rows = 3 }) => (
  <div className="flex flex-col">
    <label className="text-xs font-medium text-gray-600 mb-1">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      className="p-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
    />
  </div>
);

const FormMultiSelect = ({
  label,
  values,
  onChange,
  options = [],
  placeholder = "Add item",
}) => {
  const [input, setInput] = useState("");
  const addValue = () => {
    if (input.trim() && !values.includes(input.trim())) {
      onChange([...values, input.trim()]);
      setInput("");
    }
  };
  const removeValue = (val) => onChange(values.filter((v) => v !== val));

  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 mb-1">
        {values.map((v) => (
          <span
            key={v}
            className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex items-center gap-1 text-sm"
          >
            {v}{" "}
            <button type="button" onClick={() => removeValue(v)}>
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="p-2 border border-gray-300 rounded-md text-sm flex-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={addValue}
          className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
};

const FormCheckbox = ({ label, name, checked, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
    />
    <label className="text-sm text-gray-700">{label}</label>
  </div>
);

const FormSelect = ({ label, name, value, onChange, options }) => (
  <div className="flex flex-col">
    <label className="text-xs font-medium text-gray-600 mb-1">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="p-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
