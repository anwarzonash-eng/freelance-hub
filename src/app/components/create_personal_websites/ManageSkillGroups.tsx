"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  addSkillGroup,
  addBulkSkillGroups,
  deleteSkillGroupByID,
  getAllSkillGroups,
  updateSkillGroupByID,
} from "@/app/api_handlers/api/skill_groups.api";
import { getALLMainProfiles } from "@/app/api_handlers/api/main_profiles.api";
import { getAllSkills } from "@/app/api_handlers/api/skills.api";
import dynamic from "next/dynamic";
const QuillEditor = dynamic(() => import("../QuillEditor"), { ssr: false });
import { ChevronDown, ChevronUp, Plus, Sparkles, X } from "lucide-react";
import CreateSkillGroup from "./CreateSkillGroup";

interface SkillGroupData {
  id?: string;
  label?: string;
  description?: string;
  experience_variation1?: string;
  experience_variation2?: string;
  experience_variation3?: string;
  experience_variation4?: string;
  experience_variation5?: string;
  experience_variation6?: string;
  experience_variation7?: string;
  experience_variation8?: string;
  experience_variation9?: string;
  experience_variation10?: string;
  portfolio_variations: { [k: string]: string };
  skills_ids: { skills_ids: string[] };
  main_profile_id: string;
  companytype?: string;
}

export default function ManageSkillGroups() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [allGroups, setAllGroups] = useState<SkillGroupData[]>([]);
  const [mainProfiles, setMainProfiles] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainProfileFilter, setSelectedMainProfileFilter] =
    useState<string>("");

  // popups
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showAIPopup, setShowAIPopup] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<SkillGroupData | null>(
    null
  );

  // Editors expanders
  const [expandExperienceCreate, setExpandExperienceCreate] = useState(false);
  const [expandExperienceEdit, setExpandExperienceEdit] = useState(false);

  // Create/Edit forms
  const emptyForm: SkillGroupData = {
    label: "",
    description: "",
    experience_variation1: "",
    experience_variation2: "",
    experience_variation3: "",
    experience_variation4: "",
    experience_variation5: "",
    experience_variation6: "",
    experience_variation7: "",
    experience_variation8: "",
    experience_variation9: "",
    experience_variation10: "",
    portfolio_variations: {},
    skills_ids: { skills_ids: [] },
    main_profile_id: "",
    companytype: "cypexsoft",
  };
  const [createForm, setCreateForm] = useState<SkillGroupData>({
    ...emptyForm,
  });
  const [editForm, setEditForm] = useState<SkillGroupData>({ ...emptyForm });

  // AI select skills
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkillIdsForAI, setSelectedSkillIdsForAI] = useState<string[]>(
    []
  );

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [mp, sk] = await Promise.all([getALLMainProfiles(), getAllSkills()]);
    setMainProfiles(mp?.data || []);
    setSkills(sk?.data || []);
    const res = await getAllSkillGroups();
    setAllGroups(res?.data || []);
  };

  const filteredGroups = useMemo(() => {
    return (allGroups || []).filter((g: any) => {
      if (!selectedMainProfileFilter) return false; // empty by default
      const matchesProfile = g.main_profile_id === selectedMainProfileFilter;
      const q = searchQuery.toLowerCase();
      const labelMatch = g.label?.toLowerCase().includes(q);
      const descText = (g.description || "").toLowerCase();
      const descMatch = descText.includes(q);
      return matchesProfile && (labelMatch || descMatch);
    });
  }, [allGroups, selectedMainProfileFilter, searchQuery]);

  const handleCreate = async () => {
    setBusy(true);
    setMessage("");
    try {
      const payload = { ...createForm, companytype: "cypexsoft" };
      const res = await addSkillGroup(payload);
      if (res?.APIStatus === "success") {
        setMessage("✅ Created");
        setShowCreatePopup(false);
        setCreateForm({ ...emptyForm });
        loadAll();
      } else setMessage(res?.message || "❌ Error");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedGroup?.id) return;
    setBusy(true);
    setMessage("");
    try {
      const { id, ...data } = editForm as any;
      const res = await updateSkillGroupByID(data, {
        path: { id: selectedGroup.id },
      });
      if (res?.APIStatus === "success") {
        setMessage("✅ Updated");
        setShowEditPopup(false);
        setSelectedGroup(null);
        loadAll();
      } else setMessage(res?.message || "❌ Error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this skill group?")) return;
    const res = await deleteSkillGroupByID({ path: { id } });
    if (res?.APIStatus === "success") loadAll();
  };

  const skillsFilteredForSearch = useMemo(() => {
    const q = skillSearch.toLowerCase();
    return (skills || []).filter((s: any) =>
      s.title?.toLowerCase().includes(q)
    );
  }, [skillSearch, skills]);

  const selectedSkillNamesForAI = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of skills) map.set(s.id, s.title);
    return selectedSkillIdsForAI.map((id) => map.get(id) || id);
  }, [selectedSkillIdsForAI, skills]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manage Skill Groups
          </h1>
          <p className="text-gray-600 mt-1">
            Total Groups: {filteredGroups.length}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAIPopup(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Sparkles className="w-4 h-4" /> AI Generate
          </button>
          <button
            onClick={() => setShowCreatePopup(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Create Group
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by label or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={selectedMainProfileFilter}
          onChange={(e) => setSelectedMainProfileFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[250px]"
        >
          <option value="">Select Main Profile</option>
          {mainProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.email})
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredGroups.map((g: any) => (
          <div key={g.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {g.label}
                </h3>
                <div
                  className="text-sm text-gray-600"
                  dangerouslySetInnerHTML={{ __html: g.description || "" }}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Skills: {(g.skills_ids?.skills_ids || []).length}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
                  onClick={() => {
                    setSelectedGroup(g);
                    setEditForm({
                      id: g.id,
                      label: g.label,
                      description: g.description,
                      experience_variation1: g.experience_variation1,
                      experience_variation2: g.experience_variation2,
                      experience_variation3: g.experience_variation3,
                      experience_variation4: g.experience_variation4,
                      experience_variation5: g.experience_variation5,
                      experience_variation6: g.experience_variation6,
                      experience_variation7: g.experience_variation7,
                      experience_variation8: g.experience_variation8,
                      experience_variation9: g.experience_variation9,
                      experience_variation10: g.experience_variation10,
                      portfolio_variations: g.portfolio_variations || {},
                      skills_ids: g.skills_ids || { skills_ids: [] },
                      main_profile_id: g.main_profile_id,
                      companytype: "cypexsoft",
                    });
                    setShowEditPopup(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                  onClick={() => handleDelete(g.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Popup */}
      {showCreatePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] h-[95vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-2xl font-bold text-white">
                Create Skill Group
              </h2>
              <button
                onClick={() => {
                  setShowCreatePopup(false);
                  setExpandExperienceCreate(false);
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Column 1: Basic */}
                <div className="space-y-6">
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Main Profile *
                        </label>
                        <select
                          value={createForm.main_profile_id}
                          onChange={(e) =>
                            setCreateForm((p) => ({
                              ...p,
                              main_profile_id: e.target.value,
                            }))
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Main Profile</option>
                          {mainProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={createForm.label || ""}
                          onChange={(e) =>
                            setCreateForm((p) => ({
                              ...p,
                              label: e.target.value,
                            }))
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Skills selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Skills
                        </label>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {(createForm.skills_ids.skills_ids || []).map(
                            (id) => {
                              const s = skills.find((x: any) => x.id === id);
                              return (
                                <span
                                  key={id}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                                >
                                  {s?.title || id}
                                  <button
                                    className="ml-1"
                                    onClick={() =>
                                      setCreateForm((prev) => ({
                                        ...prev,
                                        skills_ids: {
                                          skills_ids:
                                            prev.skills_ids.skills_ids.filter(
                                              (x) => x !== id
                                            ),
                                        },
                                      }))
                                    }
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            }
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Search skill..."
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                          {skillsFilteredForSearch.map((s: any) => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() =>
                                setCreateForm((prev) => ({
                                  ...prev,
                                  skills_ids: {
                                    skills_ids: Array.from(
                                      new Set([
                                        ...(prev.skills_ids.skills_ids || []),
                                        s.id,
                                      ])
                                    ),
                                  },
                                }))
                              }
                            >
                              {s.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills JSON and portfolio */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-blue-600 rounded"></div>
                      Portfolio Variations (10)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(
                        (num) => (
                          <div key={num}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Portfolio Variation {num}
                            </label>
                            <QuillEditor
                              key={`pf-${num}`}
                              value={
                                createForm.portfolio_variations[
                                  `portfolio_variation${num}`
                                ] || ""
                              }
                              onChange={(value) =>
                                setCreateForm((prev) => ({
                                  ...prev,
                                  portfolio_variations: {
                                    ...prev.portfolio_variations,
                                    [`portfolio_variation${num}`]: value,
                                  },
                                }))
                              }
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Content */}
                <div className="space-y-6">
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-blue-600 rounded"></div>
                      Description
                    </h3>
                    <QuillEditor
                      key="create-desc"
                      value={createForm.description || ""}
                      onChange={(value) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          description: value,
                        }))
                      }
                    />
                  </div>

                  {/* Experience Intro */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandExperienceCreate(!expandExperienceCreate)
                      }
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-600 rounded"></div>
                        Experience Variations (10)
                      </h3>
                      {expandExperienceCreate ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    {expandExperienceCreate && (
                      <div className="mt-6 grid grid-cols-2 gap-6">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(
                          (num) => (
                            <div
                              key={num}
                              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                            >
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Experience Variation {num}
                              </label>
                              <QuillEditor
                                key={`create-exp-${num}`}
                                value={
                                  (createForm as any)[
                                    `experience_variation${num}`
                                  ] || ""
                                }
                                onChange={(value) =>
                                  setCreateForm((prev) => ({
                                    ...prev,
                                    [`experience_variation${num}`]: value,
                                  }))
                                }
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t bg-gray-50 px-6 py-4 flex gap-4 rounded-b-lg">
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-medium shadow-lg shadow-blue-600/20"
              >
                Create Group
              </button>
              <button
                onClick={() => {
                  setShowCreatePopup(false);
                  setExpandExperienceCreate(false);
                }}
                className="flex-1 bg-white border-2 border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Popup */}
      {showAIPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">AI Generate Skill Groups</h2>
              <button
                onClick={() => setShowAIPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Main Profile *
                </label>
                <select
                  value={selectedMainProfileFilter}
                  onChange={(e) => setSelectedMainProfileFilter(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Main Profile</option>
                  {mainProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Skills (multiple)
                </label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {selectedSkillIdsForAI.map((id) => {
                    const s = skills.find((x: any) => x.id === id);
                    return (
                      <span
                        key={id}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded"
                      >
                        {s?.title || id}
                        <button
                          className="ml-1"
                          onClick={() =>
                            setSelectedSkillIdsForAI((arr) =>
                              arr.filter((x) => x !== id)
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Search skill..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 max-h-48 overflow-y-auto border rounded">
                  {skillsFilteredForSearch.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                      onClick={() =>
                        setSelectedSkillIdsForAI((arr) =>
                          Array.from(new Set([...arr, s.id]))
                        )
                      }
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMainProfileFilter &&
                selectedSkillIdsForAI.length > 0 && (
                  <CreateSkillGroup
                    skill_ids={selectedSkillIdsForAI}
                    skill_names={selectedSkillNamesForAI}
                    main_profile_id={selectedMainProfileFilter}
                    onSuccess={() => {
                      setShowAIPopup(false);
                      loadAll();
                    }}
                  />
                )}

              {(!selectedMainProfileFilter ||
                selectedSkillIdsForAI.length === 0) && (
                <div className="text-center py-6 text-gray-500">
                  Select a main profile and at least one skill to proceed.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Popup */}
      {showEditPopup && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] h-[95vh] flex flex-col">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-2xl font-bold text-white">
                Edit Skill Group
              </h2>
              <button
                onClick={() => {
                  setShowEditPopup(false);
                  setSelectedGroup(null);
                  setExpandExperienceEdit(false);
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Main Profile *
                        </label>
                        <select
                          value={editForm.main_profile_id}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              main_profile_id: e.target.value,
                            }))
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        >
                          <option value="">Select Main Profile</option>
                          {mainProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={editForm.label || ""}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              label: e.target.value,
                            }))
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>

                      {/* Skills selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Skills
                        </label>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {(editForm.skills_ids.skills_ids || []).map((id) => {
                            const s = skills.find((x: any) => x.id === id);
                            return (
                              <span
                                key={id}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                              >
                                {s?.title || id}
                                <button
                                  className="ml-1"
                                  onClick={() =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      skills_ids: {
                                        skills_ids:
                                          prev.skills_ids.skills_ids.filter(
                                            (x) => x !== id
                                          ),
                                      },
                                    }))
                                  }
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          placeholder="Search skill..."
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                          {skillsFilteredForSearch.map((s: any) => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  skills_ids: {
                                    skills_ids: Array.from(
                                      new Set([
                                        ...(prev.skills_ids.skills_ids || []),
                                        s.id,
                                      ])
                                    ),
                                  },
                                }))
                              }
                            >
                              {s.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Variations */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                      Portfolio Variations (10)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(
                        (num) => (
                          <div key={num}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Portfolio Variation {num}
                            </label>
                            <QuillEditor
                              key={`pf-edit-${num}`}
                              value={
                                editForm.portfolio_variations[
                                  `portfolio_variation${num}`
                                ] || ""
                              }
                              onChange={(value) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  portfolio_variations: {
                                    ...prev.portfolio_variations,
                                    [`portfolio_variation${num}`]: value,
                                  },
                                }))
                              }
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                      Description
                    </h3>
                    <QuillEditor
                      key="edit-desc"
                      value={editForm.description || ""}
                      onChange={(value) =>
                        setEditForm((prev) => ({ ...prev, description: value }))
                      }
                    />
                  </div>

                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandExperienceEdit(!expandExperienceEdit)
                      }
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                        Experience Variations (10)
                      </h3>
                      {expandExperienceEdit ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    {expandExperienceEdit && (
                      <div className="mt-6 grid grid-cols-2 gap-6">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(
                          (num) => (
                            <div
                              key={num}
                              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                            >
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Experience Variation {num}
                              </label>
                              <QuillEditor
                                key={`edit-exp-${num}`}
                                value={
                                  (editForm as any)[
                                    `experience_variation${num}`
                                  ] || ""
                                }
                                onChange={(value) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [`experience_variation${num}`]: value,
                                  }))
                                }
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t bg-gray-50 px-6 py-4 flex gap-4 rounded-b-lg">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg transition font-medium shadow-lg shadow-yellow-600/20"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditPopup(false);
                  setSelectedGroup(null);
                  setExpandExperienceEdit(false);
                }}
                className="flex-1 bg-white border-2 border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
