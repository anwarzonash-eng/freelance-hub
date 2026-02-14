"use client";

import React, { useState, useEffect, useMemo } from "react";
// Skill meta data type
interface SkillMetaData {
  id: string | number;
  show: string;
  show_type: string;
  is_important: boolean;
  is_learning: boolean;
  order: number;
}
import { X, Search, Plus, Trash2, Star } from "lucide-react";
import { updateDetailProfile } from "@/app/api_handlers/api/detail_profiles.api";

interface Skill {
  id: string | number;
  title: string;
}

interface Category {
  id: string;
  title: string;
}

interface Service {
  type: "main" | "detail";
  category_id: string;
  skills: any[];
}

interface DetailProfile {
  id: string;
  unique_id: string;
  designation: string;
  private_title: string;
  tag_line: string;
  main_profile_id: string;
  skills_ids: any;
  services: Service[];
  website_purpose?: string;
  website_created_for?: string;
  ai_short_description?: string;
  salary_type?: string;
  job_country?: string;
  hourly_rate?: string;
  experience_years?: number;
  upwork_show_status?: string;
  hide_earnings?: boolean;
  importal_skills?: string[];
  email_type?: string;
  designation_category?: string;
  skills_meta_data?: SkillMetaData[];
}

interface EditDetailProfilePopupProps {
  profile: DetailProfile;
  allSkills: Skill[];
  allCategories: Category[];
  onClose: () => void;
  onSuccess: (updatedProfile: DetailProfile) => void;
}

export default function EditDetailProfilePopup({
  profile,
  allSkills,
  allCategories,
  onClose,
  onSuccess,
}: EditDetailProfilePopupProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<DetailProfile>>({
    private_title: profile.private_title,
    designation: profile.designation,
    tag_line: profile.tag_line,
    website_purpose: profile.website_purpose,
    website_created_for: profile.website_created_for,
    ai_short_description: profile.ai_short_description,
    salary_type: profile.salary_type || "per_hour",
    job_country: profile.job_country || "uk",
    hourly_rate: profile.hourly_rate,
    experience_years: profile.experience_years || 10,
    upwork_show_status: profile.upwork_show_status || "show",
    hide_earnings: profile.hide_earnings || false,
    email_type: profile.email_type || "personal",
    designation_category: (profile as any).designation_category || "",
  });


  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [skillsMetaData, setSkillsMetaData] = useState<SkillMetaData[]>([]);

  // On open, set selectedSkills and skillsMetaData only from profile
  useEffect(() => {
    let initialSelectedSkills: Skill[] = [];
    if (profile.skills_ids?.skills_ids && Array.isArray(profile.skills_ids.skills_ids)) {
      initialSelectedSkills = profile.skills_ids.skills_ids
        .map((id: string) => allSkills.find((s) => String(s.id) === String(id)))
        .filter(Boolean) as Skill[];
    }
    setSelectedSkills(initialSelectedSkills);

    if (profile.skills_meta_data && Array.isArray(profile.skills_meta_data)) {
      setSkillsMetaData(profile.skills_meta_data.map((meta: any) => ({
        id: meta.id,
        show: meta.show ?? true,
        show_type: meta.show_type ?? "primary",
        is_important: meta.is_important ?? false,
        is_learning: meta.is_learning ?? false,
        order: meta.order ?? 1,
      })));
    } else {
      setSkillsMetaData([]);
    }
  }, [profile, allSkills]);
  // --- Handlers for skillsMetaData table ---
  const handleMetaChange = (
    id: string | number,
    field: keyof SkillMetaData,
    value: any,
  ) => {
    setSkillsMetaData((prev) =>
      prev.map((meta) => (meta.id === id ? { ...meta, [field]: value } : meta)),
    );
  };

  const moveSkillMeta = (id: string | number, direction: "up" | "down") => {
    setSkillsMetaData((prev) => {
      const idx = prev.findIndex((meta) => meta.id === id);
      if (idx === -1) return prev;
      const newMeta = [...prev];
      if (direction === "up" && idx > 0) {
        [newMeta[idx - 1], newMeta[idx]] = [newMeta[idx], newMeta[idx - 1]];
      } else if (direction === "down" && idx < newMeta.length - 1) {
        [newMeta[idx], newMeta[idx + 1]] = [newMeta[idx + 1], newMeta[idx]];
      }
      // Reassign order
      return newMeta.map((meta, i) => ({ ...meta, order: i + 1 }));
    });
  };

  const [importantSkillIds, setImportantSkillIds] = useState<
    Set<string | number>
  >(new Set(profile.importal_skills || []));

  const [mainService, setMainService] = useState<string | null>(() => {
    const main = profile.services?.find((s) => s.type === "main");
    return main?.category_id || null;
  });

  const [detailServices, setDetailServices] = useState<Set<string>>(
    new Set(
      profile.services
        ?.filter((s) => s.type === "detail")
        .map((s) => s.category_id) || [],
    ),
  );

  // UI state
  const [skillsSearchQuery, setSkillsSearchQuery] = useState("");
  const [servicesSearchQuery, setServicesSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter skills for adding (exclude already selected)
  const availableSkills = useMemo(() => {
    const selectedIds = new Set(selectedSkills.map((s) => s.id));
    const query = skillsSearchQuery.toLowerCase();

    return allSkills.filter((skill) => {
      if (selectedIds.has(skill.id)) return false;
      if (!query) return true;
      return skill.title.toLowerCase().includes(query);
    });
  }, [allSkills, selectedSkills, skillsSearchQuery]);

  // Filter categories for adding services
  const availableCategories = useMemo(() => {
    const query = servicesSearchQuery.toLowerCase();
    return allCategories.filter((cat) =>
      cat.title.toLowerCase().includes(query),
    );
  }, [allCategories, servicesSearchQuery]);

  // Get category title by ID
  const getCategoryTitle = (categoryId: string): string => {
    return allCategories.find((c) => c.id === categoryId)?.title || "Unknown";
  };

  // Add skill
  const addSkill = (skill: Skill) => {
    if (!selectedSkills.find((s) => s.id === skill.id)) {
      setSelectedSkills([...selectedSkills, skill]);
      setSkillsSearchQuery("");
      // skillsMetaData will sync via useEffect
    }
  };

  // Remove skill
  const removeSkill = (skillId: string | number) => {
    setSelectedSkills(selectedSkills.filter((s) => s.id !== skillId));
    setImportantSkillIds((prev) => {
      const updated = new Set(prev);
      updated.delete(skillId);
      return updated;
    });
    // skillsMetaData will sync via useEffect
  };

  // Toggle important skill
  const toggleImportantSkill = (skillId: string | number) => {
    setImportantSkillIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(skillId)) {
        updated.delete(skillId);
      } else {
        updated.add(skillId);
      }
      return updated;
    });
  };

  // Set main service
  const setMainServiceCategory = (categoryId: string) => {
    setMainService(categoryId);
    // Remove from detail services if it was there
    setDetailServices((prev) => {
      const updated = new Set(prev);
      updated.delete(categoryId);
      return updated;
    });
  };

  // Add detail service
  const addDetailService = (categoryId: string) => {
    // Don't add if it's already the main service
    if (mainService === categoryId) return;

    setDetailServices((prev) => new Set(prev).add(categoryId));
    setServicesSearchQuery("");
  };

  // Remove detail service
  const removeDetailService = (categoryId: string) => {
    setDetailServices((prev) => {
      const updated = new Set(prev);
      updated.delete(categoryId);
      return updated;
    });
  };

  // Handle form field change
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Build services array
      const services: Service[] = [];

      if (mainService) {
        services.push({
          type: "main",
          category_id: mainService,
          skills: [],
        });
      }

      detailServices.forEach((categoryId) => {
        services.push({
          type: "detail",
          category_id: categoryId,
          skills: [],
        });
      });

      // Build payload
      const payload = {
        ...formData,
        skills_ids: {
          skills_ids: selectedSkills.map((s) => String(s.id)),
        },
        services: services.length > 0 ? services : profile.services,
        importal_skills: Array.from(importantSkillIds).map((id) => String(id)),
        skills_meta_data: skillsMetaData,
      };

      // Call update API
      const result = await updateDetailProfile(payload, {
        path: { id: profile.id },
      });

      if (result) {
        onSuccess({
          ...profile,
          ...formData,
          skills_ids: payload.skills_ids,
          services: payload.services,
          importal_skills: payload.importal_skills,
          skills_meta_data: payload.skills_meta_data,
        } as DetailProfile);
        onClose();
      } else {
        setError("Failed to update profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error updating profile:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center bg-linear-to-r from-indigo-600 to-blue-600 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
        <button
          onClick={onClose}
          className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition"
        >
          <X size={24} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form Content */}
      <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto space-y-6">
        {/* Basic Information */}
        <fieldset className="border border-gray-300 rounded-lg p-4">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Basic Information
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Private Title
              </label>
              <input
                type="text"
                value={formData.private_title || ""}
                onChange={(e) =>
                  handleFieldChange("private_title", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={formData.designation || ""}
                onChange={(e) =>
                  handleFieldChange("designation", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation Category
              </label>
              <select
                value={formData.designation_category || ""}
                onChange={(e) =>
                  handleFieldChange("designation_category", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Category</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag Line
              </label>
              <input
                type="text"
                value={formData.tag_line || ""}
                onChange={(e) => handleFieldChange("tag_line", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Website Information */}
        <fieldset className="border border-gray-300 rounded-lg p-4">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Website Information
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website Purpose
              </label>
              <select
                value={formData.website_purpose || ""}
                onChange={(e) =>
                  handleFieldChange("website_purpose", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Purpose</option>
                <option value="contract">Contract</option>
                <option value="fulltime">Full Time</option>
                <option value="freelance">Freelance</option>
                <option value="startup">Startup</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website Created For
              </label>
              <input
                type="text"
                value={formData.website_created_for || ""}
                onChange={(e) =>
                  handleFieldChange("website_created_for", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Short Description
                </label>
                <textarea
                  value={formData.ai_short_description || ""}
                  onChange={(e) =>
                    handleFieldChange("ai_short_description", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Career Information */}
        <fieldset className="border border-gray-300 rounded-lg p-4">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Career Information
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary Type
              </label>
              <select
                value={formData.salary_type || "per_hour"}
                onChange={(e) =>
                  handleFieldChange("salary_type", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="per_hour">Per Hour</option>
                <option value="per_day">Per Day</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Rate
              </label>
              <input
                type="number"
                value={formData.hourly_rate || ""}
                onChange={(e) =>
                  handleFieldChange("hourly_rate", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Country
              </label>
              <input
                type="text"
                value={formData.job_country || ""}
                onChange={(e) =>
                  handleFieldChange("job_country", e.target.value)
                }
                placeholder="e.g., uk, us, ca"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                value={formData.experience_years || ""}
                onChange={(e) =>
                  handleFieldChange(
                    "experience_years",
                    parseInt(e.target.value) || 0,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Display Settings */}
        <fieldset className="border border-gray-300 rounded-lg p-4">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Display Settings
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upwork Show Status
              </label>
              <select
                value={formData.upwork_show_status || "show"}
                onChange={(e) =>
                  handleFieldChange("upwork_show_status", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="show">Show</option>
                <option value="hide">Hide</option>
                <option value="show_at_end">Show At End</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Type
              </label>
              <select
                value={formData.email_type || "personal"}
                onChange={(e) =>
                  handleFieldChange("email_type", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="personal">Personal</option>
                <option value="findusman.me">findusman.me</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="hide_earnings"
                checked={formData.hide_earnings || false}
                onChange={(e) =>
                  handleFieldChange("hide_earnings", e.target.checked)
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="hide_earnings"
                className="ml-2 block text-sm text-gray-700"
              >
                Hide Rates
              </label>
            </div>
          </div>
        </fieldset>

        {/* Skills Management */}
        <fieldset className="border border-gray-300 rounded-lg p-4">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Skills
          </legend>
          <div className="mt-4 space-y-4">
            {/* Search for new skills */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-300">
                <Search size={20} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search and add skills..."
                  value={skillsSearchQuery}
                  onChange={(e) => setSkillsSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>

              {/* Dropdown results */}
              {skillsSearchQuery && availableSkills.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {availableSkills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => addSkill(skill)}
                      className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex items-center justify-between"
                    >
                      <span className="text-sm">{skill.title}</span>
                      <Plus size={16} className="text-indigo-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Skills Meta Data Table */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Skills Meta Data ({skillsMetaData.length})
              </label>
              {skillsMetaData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-separate border-spacing-0 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-indigo-50">
                        <th className="px-2 py-2 text-left font-semibold text-gray-700">
                          Order
                        </th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700">
                          Skill
                        </th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-700">
                          Show
                        </th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-700">
                          Show Type
                        </th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-700">
                          Important
                        </th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-700">
                          Learning
                        </th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {skillsMetaData
                        .slice()
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((meta, idx) => {
                          const skill = allSkills.find(
                            (s) => String(s.id) === String(meta.id),
                          );
                          return (
                            <tr key={meta.id} className="hover:bg-indigo-50">
                              <td className="px-2 py-1 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    type="button"
                                    className="text-xs text-gray-400 hover:text-indigo-600"
                                    disabled={idx === 0}
                                    onClick={() => moveSkillMeta(meta.id, "up")}
                                    title="Move up"
                                  >
                                    ▲
                                  </button>
                                  <span>{meta.order}</span>
                                  <button
                                    type="button"
                                    className="text-xs text-gray-400 hover:text-indigo-600"
                                    disabled={idx === skillsMetaData.length - 1}
                                    onClick={() =>
                                      moveSkillMeta(meta.id, "down")
                                    }
                                    title="Move down"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </td>
                              <td className="px-2 py-1 text-left font-medium text-gray-800">
                                {skill?.title || meta.id}
                              </td>
                              <td className="px-2 py-1 text-center">
                                <select
                                  value={meta.show}
                                  onChange={(e) =>
                                    handleMetaChange(
                                      meta.id,
                                      "show",
                                      e.target.value,
                                    )
                                  }
                                  className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                                >
                                  <option value="all">All</option>
                                  {[...Array(10)].map((_, i) => (
                                    <option key={i + 1} value={String(i + 1)}>
                                      {i + 1}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 py-1 text-center">
                                <select
                                  value={meta.show_type}
                                  onChange={(e) =>
                                    handleMetaChange(
                                      meta.id,
                                      "show_type",
                                      e.target.value,
                                    )
                                  }
                                  className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                                >
                                  <option value="random">Random</option>
                                  <option value="first">First</option>
                                  <option value="last">Last</option>
                                </select>
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={meta.is_important}
                                  onChange={(e) =>
                                    handleMetaChange(
                                      meta.id,
                                      "is_important",
                                      e.target.checked,
                                    )
                                  }
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={meta.is_learning}
                                  onChange={(e) =>
                                    handleMetaChange(
                                      meta.id,
                                      "is_learning",
                                      e.target.checked,
                                    )
                                  }
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <button
                                  type="button"
                                  className="p-1 rounded text-red-500 hover:bg-red-50 transition"
                                  title="Remove skill"
                                  onClick={() => removeSkill(meta.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No skills selected
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Services/Categories Management */}
        <fieldset className="border border-gray-300 rounded-lg p-4">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Services & Categories
          </legend>
          <div className="mt-4 space-y-4">
            {/* Main Service */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Service
              </label>
              <select
                value={mainService || ""}
                onChange={(e) => setMainServiceCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Main Service</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Detail Services */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Detail Services
              </label>

              {/* Search for new detail services */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-300">
                  <Search size={20} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search and add detail services..."
                    value={servicesSearchQuery}
                    onChange={(e) => setServicesSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                  />
                </div>

                {/* Dropdown results */}
                {servicesSearchQuery && availableCategories.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {availableCategories
                      .filter(
                        (cat) =>
                          cat.id !== mainService && !detailServices.has(cat.id),
                      )
                      .map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => addDetailService(cat.id)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center justify-between"
                        >
                          <span className="text-sm">{cat.title}</span>
                          <Plus size={16} className="text-blue-600" />
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Selected detail services */}
              <div className="space-y-2">
                {detailServices.size > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Array.from(detailServices).map((categoryId) => (
                      <div
                        key={categoryId}
                        className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-100 transition"
                      >
                        <span className="text-sm font-medium text-gray-800">
                          {getCategoryTitle(categoryId)}
                        </span>
                        <button
                          onClick={() => removeDetailService(categoryId)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 transition"
                          title="Remove service"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No detail services selected
                  </p>
                )}
              </div>
            </div>
          </div>
        </fieldset>
      </div>

      {/* Footer / Actions */}
      <div className="flex gap-3 justify-end bg-gray-50 px-6 py-4 border-t border-gray-300">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="px-6 py-2 border border-gray-300 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
