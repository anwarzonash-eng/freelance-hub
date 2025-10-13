import React, { FC, useState, useMemo } from "react";
import GenericPopup from "../popups/GenericPopup";
import NewsletterManager from "../newsletters/NewsletterManager";

// --- TYPE DEFINITIONS ---
type StartCampaignFormProps = {
  // Use a string array or number array for IDs for better type safety
  recipientIds: string[] | number[];
  // Function to close the parent GenericPopup
  onClose: () => void;
  // Function to handle the final campaign launch
  onLaunchCampaign: (payload: CampaignPayload) => void;
};

type CampaignType = "email" | "whatsapp";

type CampaignPayload = {
  title: string;
  newsletterId: string | null;
  campaignType: CampaignType;
  recipientIds: string[] | number[];
};

// --- COMPONENT ---
const StartCampaignForm: FC<any> = ({
  recipientIds,
  onClose,
  onLaunchCampaign,
}: any) => {
  // Consolidated State for Form Fields
  const [formState, setFormState] = useState({
    title: "",
    newsletterId: null as string | null,
    campaignType: "email" as CampaignType, // Default to email
  });

  // State for the Newsletter selection popup visibility
  const [isNewsletterManagerOpen, setIsNewsletterManagerOpen] = useState(false);

  // --- Derived State (Validation) ---
  const isFormValid = useMemo(() => {
    return (
      formState.title.trim().length > 0 &&
      formState.newsletterId !== null &&
      recipientIds.length > 0
    );
  }, [formState.title, formState.newsletterId, recipientIds]);

  // --- HANDLERS ---

  const handleNewsletterSelectOpen = () => {
    setIsNewsletterManagerOpen(true);
  };

  const handleNewsletterSelected = (id: string) => {
    setFormState((prev) => ({ ...prev, newsletterId: id }));
    setIsNewsletterManagerOpen(false);
  };

  const handleLaunch = () => {
    if (!isFormValid) return;

    const payload: CampaignPayload = {
      ...formState,
      recipientIds: recipientIds,
      newsletterId: formState.newsletterId as string, // Safe cast because of isFormValid check
    };

    onLaunchCampaign(payload);
    onClose(); // Close the modal after launching/API call
  };

  const CampaignTypeButton: FC<{ type: CampaignType }> = ({ type }) => {
    const isSelected = formState.campaignType === type;
    const Icon = type === "email" ? "📧" : "💬";

    return (
      <button
        type="button"
        onClick={() => setFormState((p) => ({ ...p, campaignType: type }))}
        className={`flex items-center justify-center space-x-2 px-4 py-2 border rounded-lg transition-all text-sm font-medium w-full
          ${
            isSelected
              ? "bg-blue-600 text-white border-blue-700 shadow-md"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
      >
        <span>{Icon}</span>
        <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
      </button>
    );
  };

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Newsletter Selector Popup Container */}
      {isNewsletterManagerOpen && (
        <GenericPopup
          title="Select Newsletter Template"
          onClose={() => setIsNewsletterManagerOpen(false)}
        >
          <NewsletterManager
            isSelectMode={true}
            // Pass the handler down to the manager component
            handleNewsletterSelected={handleNewsletterSelected}
            onClose={() => setIsNewsletterManagerOpen(false)}
          />
        </GenericPopup>
      )}

      {/* Recipient Count Header (Aesthetic and informational) */}
      <div className="flex items-center justify-between p-3 bg-blue-50 border-l-4 border-blue-400 rounded-md">
        <p className="text-base text-gray-800 font-medium">
          Campaign Recipients:
        </p>
        <span className="text-xl font-bold text-blue-700">
          {recipientIds.length} Leads
        </span>
      </div>

      {/* Campaign Title Field */}
      <div className="space-y-1">
        <label
          htmlFor="title"
          className="text-sm font-medium text-gray-700 block"
        >
          Campaign Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formState.title}
          onChange={(e) =>
            setFormState((p) => ({ ...p, title: e.target.value }))
          }
          placeholder="e.g., Q1 Product Launch Email"
          className="w-full px-3 py-2 text-lg border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150"
        />
      </div>

      {/* Campaign Type Selection (Enhanced Toggle Buttons) */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 block">
          Delivery Channel
        </label>
        <div className="flex gap-4">
          <CampaignTypeButton type="email" />
          <CampaignTypeButton type="whatsapp" />
        </div>
      </div>

      {/* Newsletter ID Field & Button */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 block">
          Newsletter Template
        </label>
        <div className="flex gap-3 items-stretch">
          <div className="flex-grow">
            <input
              type="text"
              readOnly
              value={
                formState.newsletterId
                  ? `Template ID: ${formState.newsletterId}`
                  : "No Template Selected"
              }
              placeholder="Click Select to choose a template"
              className={`w-full px-3 py-2 text-sm border rounded-lg shadow-sm cursor-default 
                ${
                  formState.newsletterId
                    ? "bg-green-50 text-green-700 border-green-300"
                    : "bg-gray-100 text-gray-500 border-gray-300"
                }`}
            />
          </div>

          <button
            type="button"
            onClick={handleNewsletterSelectOpen}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 flex-shrink-0"
          >
            Select Template
          </button>
        </div>
      </div>

      {/* Footer / Action Buttons */}
      <div className="flex justify-end gap-3 border-t pt-4 mt-6">
        <button
          onClick={onClose}
          type="button"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-150"
        >
          Cancel
        </button>
        <button
          onClick={handleLaunch}
          disabled={!isFormValid}
          type="button"
          className={`px-4 py-2 text-sm font-medium rounded-lg shadow-md transition duration-150 
            ${
              isFormValid
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
        >
          🚀 Start Campaign
        </button>
      </div>
    </div>
  );
};

export default StartCampaignForm;
