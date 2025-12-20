"use client";
import React, { useState, useEffect } from "react";
import { Copy } from "lucide-react";
import {
  getAllSkills,
  addSkill,
  deleteSkillByID,
  updateSkillByID,
} from "@/app/api_handlers/api/skills.api";
import CreateSkill from "./CreateSkill";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { useImageViewer } from "../ImageViewer";

const ImageViewer = dynamic(() => import("../ImageViewer"), {
  ssr: false,
});

interface SkillData {
  id?: string;
  title: string;
  url: string;
  variation: string[];
  icon: string;
  catagory?: string;
  order?: string;
  description?: string;
  is_techstack?: boolean;
  companytype?: string;
}

export default function ManageSkills() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const imageViewer = useImageViewer();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<SkillData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterIsTechstack, setFilterIsTechstack] = useState<string>("");
  const [filterOrder, setFilterOrder] = useState<string>("");
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState<SkillData>({
    title: "",
    url: "",
    variation: [],
    icon: "",
    catagory: "",
    order: "",
    description: "",
    is_techstack: true,
    companytype: "cypexsoft",
  });

  useEffect(() => {
    fetchAllSkills();
  }, [filterIsTechstack, filterOrder]);

  const fetchAllSkills = async () => {
    setLoadingSkills(true);
    try {
      const query: any = {};
      if (filterIsTechstack) {
        query.is_techstack = filterIsTechstack;
      }
      if (filterOrder) {
        query.order = filterOrder;
      }
      const response = await getAllSkills(query);
      if (response && response.data) {
        setAllSkills(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching skills:", error);
    } finally {
      setLoadingSkills(false);
    }
  };

  const filteredSkills = allSkills.filter((skill) => {
    const searchLower = searchQuery.toLowerCase();
    const idMatch = skill.id?.toLowerCase().includes(searchLower);
    const titleMatch = skill.title?.toLowerCase().includes(searchLower);
    const variationMatch = skill.variation?.some((v: string) =>
      v.toLowerCase().includes(searchLower)
    );
    return idMatch || titleMatch || variationMatch;
  });

  const updateCreateFormField = (field: keyof SkillData, value: any) => {
    setCreateForm({ ...createForm, [field]: value });
  };

  const handleCreateSubmit = async () => {
    if (!confirm("Are you sure you want to create this skill?")) {
      return;
    }

    setBusy(true);
    setMessage("");

    // Basic validation
    if (!createForm.title.trim()) {
      setMessage("❌ Title is required");
      setBusy(false);
      return;
    }

    if (!createForm.url.trim()) {
      setMessage("❌ URL is required");
      setBusy(false);
      return;
    }

    if (createForm.variation.length === 0) {
      setMessage("❌ At least one variation is required");
      setBusy(false);
      return;
    }

    if (!createForm.icon.trim()) {
      setMessage("❌ Icon URL is required");
      setBusy(false);
      return;
    }

    try {
      const response = await addSkill(createForm);

      if (response && response.APIStatus === "success") {
        setMessage("✅ Successfully created skill");
        // Reset form
        setCreateForm({
          title: "",
          url: "",
          variation: [],
          icon: "",
          catagory: "",
          order: "",
          description: "",
          is_techstack: true,
          companytype: "cypexsoft",
        });
        fetchAllSkills();
      } else {
        setMessage(
          `❌ Error: ${response?.message || "Failed to create skill"}`
        );
      }
    } catch (error) {
      setMessage("❌ Network error occurred");
    } finally {
      setBusy(false);
    }
  };

  const deleteSkill = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return;

    try {
      const response = await deleteSkillByID({ path: { id } });

      if (response && response.APIStatus === "success") {
        setMessage("✅ Skill deleted successfully");
        fetchAllSkills();
      } else {
        setMessage(
          `❌ Error: ${response?.message || "Failed to delete skill"}`
        );
      }
    } catch (error) {
      setMessage("❌ Network error occurred");
    }
  };

  const startEditingSkill = (skill: any) => {
    setEditingSkillId(skill.id);
    setEditFormData({
      id: skill.id,
      title: skill.title,
      url: skill.url,
      variation: skill.variation || [],
      icon: skill.icon,
      catagory: skill.catagory || "",
      order: skill.order || "",
      description: skill.description || "",
      is_techstack: skill.is_techstack,
      companytype: skill.companytype || "",
    });
    setShowEditPopup(true);
  };

  const cancelEditing = () => {
    setEditingSkillId(null);
    setEditFormData(null);
    setShowEditPopup(false);
  };

  const updateEditFormField = (field: keyof SkillData, value: any) => {
    if (editFormData) {
      setEditFormData({ ...editFormData, [field]: value });
    }
  };

  const saveSkillUpdate = async () => {
    if (!editFormData || !editingSkillId) return;

    if (!confirm("Are you sure you want to update this skill?")) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { id, ...updateData } = editFormData;
      const response = await updateSkillByID(updateData, {
        path: { id: editingSkillId },
      });

      if (response && response.APIStatus === "success") {
        setMessage("✅ Skill updated successfully");
        setEditingSkillId(null);
        setEditFormData(null);
        setShowEditPopup(false);
        fetchAllSkills();
      } else {
        setMessage(
          `❌ Error: ${response?.message || "Failed to update skill"}`
        );
      }
    } catch (error) {
      setMessage("❌ Network error occurred");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreatePopup(false);
    setShowAIPopup(false);
    fetchAllSkills();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Skills</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Skills</p>
            <p className="text-2xl font-bold text-blue-600">
              {allSkills.length}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
              onClick={() => setShowAIPopup(true)}
            >
              Create with AI
            </button>
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
              onClick={() => setShowCreatePopup(true)}
            >
              Create Skill
            </button>
          </div>
        </div>
      </div>

      {/* Create Popup */}
      {showCreatePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Create New Skill</h2>
              <button
                onClick={() => setShowCreatePopup(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Title *
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={createForm.title}
                      onChange={(e) =>
                        updateCreateFormField("title", e.target.value)
                      }
                      placeholder="e.g., Inertia.js"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      URL *
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={createForm.url}
                      onChange={(e) =>
                        updateCreateFormField("url", e.target.value)
                      }
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Variation (comma-separated) *
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={createForm.variation.join(", ")}
                      onChange={(e) =>
                        updateCreateFormField(
                          "variation",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="Inertia.js, InertiaJS, Inertia"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Icon URL *
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={createForm.icon}
                        onChange={(e) =>
                          updateCreateFormField("icon", e.target.value)
                        }
                        placeholder="https://example.com/icon.svg"
                      />
                      <div className="w-12 h-12 border rounded-lg flex items-center justify-center bg-gray-50">
                        {createForm.icon ? (
                          <img
                            src={createForm.icon}
                            alt="icon preview"
                            className="max-w-full max-h-full rounded-md"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Category
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={createForm.catagory || ""}
                      onChange={(e) =>
                        updateCreateFormField("catagory", e.target.value)
                      }
                      placeholder="fullstack"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Order
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={createForm.order || ""}
                      onChange={(e) =>
                        updateCreateFormField("order", e.target.value)
                      }
                      placeholder="3"
                    />
                  </div>

                  <div className="flex items-center gap-3 mt-6">
                    <input
                      id="create-is-tech-stack"
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-gray-300"
                      checked={createForm.is_techstack || false}
                      onChange={(e) =>
                        updateCreateFormField("is_techstack", e.target.checked)
                      }
                    />
                    <label
                      htmlFor="create-is-tech-stack"
                      className="text-sm font-medium text-gray-700"
                    >
                      Is Tech Stack
                    </label>
                  </div>

                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={createForm.description || ""}
                      onChange={(e) =>
                        updateCreateFormField("description", e.target.value)
                      }
                      rows={2}
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 font-medium"
                    disabled={busy}
                    onClick={async () => {
                      await handleCreateSubmit();
                      if (message.includes("✅")) {
                        handleCreateSuccess();
                      }
                    }}
                  >
                    {busy ? "Creating..." : "Create Skill"}
                  </button>
                  <button
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition font-medium"
                    onClick={() => setShowCreatePopup(false)}
                  >
                    Cancel
                  </button>
                </div>

                {message && (
                  <div
                    className={`px-4 py-3 rounded-lg text-sm font-medium ${
                      message.includes("✅")
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Create Popup */}
      {showAIPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Create Skills with AI</h2>
              <button
                onClick={() => setShowAIPopup(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <CreateSkill onSuccess={handleCreateSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Popup */}
      {showEditPopup && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                Edit Skill: {editFormData.title}
              </h2>
              <button
                onClick={cancelEditing}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Title *
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editFormData.title}
                      onChange={(e) =>
                        updateEditFormField("title", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      URL *
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editFormData.url}
                      onChange={(e) =>
                        updateEditFormField("url", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Variation (comma-separated) *
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editFormData.variation.join(", ")}
                      onChange={(e) =>
                        updateEditFormField(
                          "variation",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Icon URL *
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editFormData.icon}
                        onChange={(e) =>
                          updateEditFormField("icon", e.target.value)
                        }
                      />
                      <div className="w-12 h-12 border rounded-lg flex items-center justify-center bg-gray-50">
                        {editFormData.icon ? (
                          <img
                            src={editFormData.icon}
                            alt="icon"
                            className="max-w-full max-h-full rounded-md"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Category
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editFormData.catagory || ""}
                      onChange={(e) =>
                        updateEditFormField("catagory", e.target.value)
                      }
                      placeholder="fullstack"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Order
                    </label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editFormData.order || ""}
                      onChange={(e) =>
                        updateEditFormField("order", e.target.value)
                      }
                      placeholder="3"
                    />
                  </div>

                  <div className="flex items-center gap-3 mt-6">
                    <input
                      id="edit-is-tech-stack"
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-gray-300"
                      checked={editFormData.is_techstack || false}
                      onChange={(e) =>
                        updateEditFormField("is_techstack", e.target.checked)
                      }
                    />
                    <label
                      htmlFor="edit-is-tech-stack"
                      className="text-sm font-medium text-gray-700"
                    >
                      Is Tech Stack
                    </label>
                  </div>

                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editFormData.description || ""}
                      onChange={(e) =>
                        updateEditFormField("description", e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm disabled:opacity-50 font-medium"
                    onClick={saveSkillUpdate}
                    disabled={busy}
                  >
                    {busy ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
                    onClick={cancelEditing}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </div>

                {message && (
                  <div
                    className={`px-4 py-3 rounded-lg text-sm font-medium ${
                      message.includes("✅")
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Section */}
      {/* Removed - now using popup */}

      {/* Existing Skills List */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Existing Skills</h2>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
            onClick={fetchAllSkills}
            disabled={loadingSkills}
          >
            {loadingSkills ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by title or variation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Showing {filteredSkills.length} of {allSkills.length} skills
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Tech Stack
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterIsTechstack}
                onChange={(e) => setFilterIsTechstack(e.target.value)}
              >
                <option value="">All Skills</option>
                <option value="true">Tech Stack Only</option>
                <option value="false">Non-Tech Stack Only</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Filter by Order
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter order number (e.g., 1, 2, 3)"
                value={filterOrder}
                onChange={(e) => setFilterOrder(e.target.value)}
                min="0"
              />
            </div>

            <div className="flex items-end">
              <button
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
                onClick={() => {
                  setFilterIsTechstack("");
                  setFilterOrder("");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {loadingSkills ? (
          <p className="text-gray-500">Loading skills...</p>
        ) : allSkills.length === 0 ? (
          <p className="text-gray-500">No skills found</p>
        ) : filteredSkills.length === 0 ? (
          <p className="text-gray-500">No skills match your search</p>
        ) : (
          <div className="space-y-3">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {skill.icon && (
                      <button
                        onClick={() => imageViewer.openViewer([skill.icon])}
                        className="cursor-pointer hover:opacity-80 transition"
                      >
                        <img
                          src={skill.icon}
                          alt={skill.title}
                          className="w-10 h-10 object-contain"
                        />
                      </button>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{skill.title}</h3>
                        <button
                          title="Copy Skill ID"
                          className="p-1 hover:bg-gray-200 rounded"
                          onClick={() => {
                            navigator.clipboard.writeText(skill.id);
                            setCopiedId(skill.id);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                        >
                          <Copy className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                        </button>
                        {copiedId === skill.id && (
                          <span className="text-xs text-green-600 font-semibold">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {skill.variation?.join(", ")}
                      </p>
                      <span>
                        <a
                          href={skill.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {skill.url}
                        </a>
                        <span className="ml-2">Order: {skill.order}</span>
                        {(skill.is_tech_stack ?? skill.is_techstack) && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Tech Stack
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
                      onClick={() => startEditingSkill(skill)}
                    >
                      Edit
                    </button>
                    {/* <button
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm"
                      onClick={() => deleteSkill(skill.id)}
                    >
                      Delete
                    </button> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Viewer */}
        <ImageViewer />
      </div>
    </div>
  );
}
