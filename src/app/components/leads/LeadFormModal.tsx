// components/forms/LeadFormModal.jsx
import React, { useState, useEffect } from "react";
import { IconClose, IconAdd, IconTrash } from "../ui/icon-components"; // Assuming you have these icons
import { addNewLead } from "@/app/api_handlers/api/leads.api ";

// Helper function to create a new, empty contact detail object
const createNewContact = () => ({
  name: "",
  email: "",
  contact: "",
  designation: "",
});

// A basic structure for a new lead for the "Create Lead" functionality
const emptyLead = {
  id: null,
  title: "",
  type: "Full-Time", // Default
  description: "",
  link: "",
  skills: [], // Will be comma-separated in the input
  pubDate: new Date().toISOString().substring(0, 10), // YYYY-MM-DD
  company_details: {
    name: "",
    website: "",
  },
  contact_details: [createNewContact()],
  status: "pending",
};

/**
 * Full-screen modal form for creating or editing a lead.
 * @param {object} leadData - The lead object to edit, or null/empty for creation.
 * @param {function} onClose - Function to close the modal.
 * @param {function} onSave - Function to call after a successful save (triggers refresh).
 */
export const LeadFormModal = ({ leadData, onClose, onSave }) => {
  const isEditing = !!leadData?.id;

  // Initialize form state with existing data or empty structure
  const [formData, setFormData] = useState(leadData || emptyLead);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If opening for editing, ensure contact_details has at least one item
    if (leadData && leadData.contact_details.length === 0) {
      setFormData({ ...leadData, contact_details: [createNewContact()] });
    } else {
      setFormData(leadData || emptyLead);
    }
  }, [leadData]);

  // --- Handlers for main form fields ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name in formData) {
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else if (name === "company_name" || name === "company_website") {
      setFormData((prev) => ({
        ...prev,
        company_details: {
          ...prev.company_details,
          [name === "company_name" ? "name" : "website"]: value,
        },
      }));
    }
  };

  // --- Handlers for Contact Details Array ---
  const handleContactChange = (index, e) => {
    const { name, value } = e.target;
    const newContacts = formData.contact_details.map((contact, i) => {
      if (i === index) {
        return { ...contact, [name]: value };
      }
      return contact;
    });
    setFormData((prev) => ({ ...prev, contact_details: newContacts }));
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contact_details: [...prev.contact_details, createNewContact()],
    }));
  };

  const removeContact = (index) => {
    if (formData.contact_details.length > 1) {
      setFormData((prev) => ({
        ...prev,
        contact_details: prev.contact_details.filter((_, i) => i !== index),
      }));
    } else {
      // Clear the fields if only one remains
      setFormData((prev) => ({
        ...prev,
        contact_details: [createNewContact()],
      }));
    }
  };

  // --- API Save Logic ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Final data structure cleanup
    const dataToSend = {
      ...formData,
      // Convert skills string (comma-separated) back to an array
      skills: formData.skills
        .toString()
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
      // Use the appropriate API endpoint based on creation or editing
      id: isEditing ? formData.id : undefined,
      action_type: isEditing ? "update" : "add",
    };

    const endpoint = "http://localhost:3001/remote-jobs/manual-add";
    const method = "POST";

    try {
      // Simulate API call and success logic
      // In a real app, you'd perform the fetch here:

      // const response = await fetch(endpoint, {
      //   method: method,
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(dataToSend),
      // });

      const response = await addNewLead(dataToSend);
      if (response) {
        onSave(); // Trigger lead refresh in parent
        onClose(); // Close the modal
      }

      //   await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay

      // Success
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save lead. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Modal Rendering ---
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex justify-center items-center">
      <div className="bg-white shadow-2xl relative w-full h-full overflow-y-auto">
        {" "}
        {/* Modal Header */}
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
        {/* Modal Body: Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Column 1: Core Details */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-indigo-700 border-b pb-1">
              Job Details
            </h3>

            <FormInput
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
            <FormTextArea
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
            <FormInput
              label="Job Link"
              name="link"
              value={formData.link}
              onChange={handleChange}
            />
            <FormInput
              label="Skills (comma separated)"
              name="skills"
              // Convert array back to comma-separated string for editing
              value={
                Array.isArray(formData.skills)
                  ? formData.skills.join(", ")
                  : formData.skills
              }
              onChange={handleChange}
            />

            <h3 className="text-lg font-semibold text-indigo-700 border-b pb-1 pt-4">
              Company Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Company Name"
                name="company_name"
                value={formData.company_details.name}
                onChange={handleChange}
              />
              <FormInput
                label="Company Website"
                name="company_website"
                value={formData.company_details.website}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Column 2: Status & Contacts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-indigo-700 border-b pb-1">
              Metadata
            </h3>
            <FormSelect
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              options={[
                { value: "Full-Time", label: "Full-Time" },
                { value: "Contract", label: "Contract" },
                { value: "Freelance", label: "Freelance" },
              ]}
            />
            <FormInput
              label="Publication Date"
              name="pubDate"
              type="date"
              // Format the date for input[type=date]
              value={
                formData.pubDate?.substring(0, 10) ||
                new Date().toISOString().substring(0, 10)
              }
              onChange={handleChange}
            />
            <FormSelect
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: "pending", label: "Pending" },
                { value: "short-listed", label: "Short Listed" },
                { value: "email-sent", label: "Email Sent" },
                { value: "not-interested", label: "Not Interested" },
              ]}
            />

            <h3 className="text-lg font-semibold text-indigo-700 border-b pb-1 pt-4">
              Contact Details
            </h3>

            {/* Dynamic Contact Detail Fields */}
            {formData.contact_details.map((contact, index) => (
              <div
                key={index}
                className="p-3 border border-gray-200 rounded space-y-2 relative group"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove Contact"
                  >
                    <IconTrash />
                  </button>
                </div>

                <FormInput
                  label="Name"
                  name="name"
                  value={contact.name}
                  onChange={(e) => handleContactChange(index, e)}
                />
                <FormInput
                  label="Email"
                  name="email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => handleContactChange(index, e)}
                />
                <FormInput
                  label="Designation"
                  name="designation"
                  value={contact.designation}
                  onChange={(e) => handleContactChange(index, e)}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addContact}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
            >
              <IconAdd />
              <span>Add Another Contact</span>
            </button>
          </div>

          {/* Submit and Error */}
          <div className="md:col-span-3 pt-4 border-t flex justify-end items-center space-x-4">
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

// --- Small Helper Components for the Form ---

const FormInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
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
