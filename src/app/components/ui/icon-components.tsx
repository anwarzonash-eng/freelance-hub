// components/ui/icon-components.tsx
import React from "react";
import {
  Globe, // 🌐 for IconVisit (Visit website)
  Eye, // 👁️ for IconView (View details)
  Edit, // ✏️ for IconEdit (Edit/Pencil)
  Tag, // 🏷️ for IconStatus (Status/Tagging)
  ChevronUp, // ▲ for IconExpand (Collapse)
  ChevronDown, // ▼ for IconExpand (Expand)
  Plus, // + for IconAdd (Add/Create)
  Trash2, // 🗑️ for IconTrash (Delete/Recycle Bin)
  X, // X for IconClose (Close/Dismiss)
} from "lucide-react";

// --- 1. Base Wrapper Component (Typed for TypeScript) ---

interface IconWrapperProps {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}

// A generic wrapper to apply consistent styling and hover effects
const IconWrapper: React.FC<IconWrapperProps> = ({
  children,
  title,
  onClick,
}) => (
  <span
    title={title}
    onClick={onClick}
    className="p-1 hover:bg-gray-100 rounded text-sm cursor-pointer inline-flex items-center justify-center"
  >
    {children}
  </span>
);

// --- 2. Icon Components (Using Lucide-React) ---

export const IconVisit: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <IconWrapper title="Visit" onClick={onClick}>
    <Globe size={16} className="text-gray-500 hover:text-green-600" />
  </IconWrapper>
);

export const IconView: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <IconWrapper title="View" onClick={onClick}>
    <Eye size={16} className="text-gray-500 hover:text-indigo-600" />
  </IconWrapper>
);

export const IconEdit: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <IconWrapper title="Edit" onClick={onClick}>
    <Edit size={16} className="text-gray-500 hover:text-yellow-600" />
  </IconWrapper>
);

export const IconStatus: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <IconWrapper title="Change Status" onClick={onClick}>
    <Tag size={16} className="text-gray-500 hover:text-red-600" />
  </IconWrapper>
);

export const IconExpand: React.FC<{
  isExpanded: boolean;
  onClick?: () => void;
}> = ({ isExpanded, onClick }) => (
  <IconWrapper title={isExpanded ? "Collapse" : "Expand"} onClick={onClick}>
    {isExpanded ? (
      <ChevronUp
        size={16}
        className="text-gray-500 hover:text-gray-900 transition-transform duration-150"
      />
    ) : (
      <ChevronDown
        size={16}
        className="text-gray-500 hover:text-gray-900 transition-transform duration-150"
      />
    )}
  </IconWrapper>
);

export const IconAdd: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <IconWrapper title="Add" onClick={onClick}>
    <Plus
      size={16}
      // Changed base color to white for contrast on a green button background
      // Adjusted hover color to a darker shade of green/gray for visibility
      className="text-white hover:text-green-800"
    />
  </IconWrapper>
);

export const IconTrash: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <IconWrapper title="Delete" onClick={onClick}>
    <Trash2 size={16} className="text-gray-500 hover:text-red-600" />
  </IconWrapper>
);

export const IconClose: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <IconWrapper title="Close" onClick={onClick}>
    <X size={20} className="text-gray-500 hover:text-gray-900" />
  </IconWrapper>
);
