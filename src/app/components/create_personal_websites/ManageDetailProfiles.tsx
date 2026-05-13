"use client";

import React, { useState, useEffect } from "react";
import {
  getAllDetailProfiles,
  resetAllDetailProfilesPDFURLs,
} from "@/app/api_handlers/api/detail_profiles.api";
import { getALLMainProfiles } from "@/app/api_handlers/api/main_profiles.api";
import { getAllCategories } from "@/app/api_handlers/api/categories.api";
import { getAllSkills } from "@/app/api_handlers/api/skills.api";
import GenericPopup from "../popups/GenericPopup";
import CreateDynamicPersonalWebsite from "./createDynamicPersonalWebsite";
import SkillSearchPopup from "./SkillSearchPopup";
import EditDetailProfilePopup from "./EditDetailProfilePopup";
import { Copy, Search, ChevronDown, ChevronUp, Edit } from "lucide-react";
import WebsiteURLs from "./websiteUrls";

interface Skill {
  id: string | number;
  title: string;
}

interface Category {
  id: string;
  title: string;
  main_profile_id?: string;
}

interface MainProfile {
  id: string;
  name: string;
  domain: string;
}

interface DetailProfile {
  id: string;
  unique_id: string;
  designation: string;
  private_title: string;
  tag_line: string;
  main_profile_id: string;
  skills_ids: any;
  services: any[];
  website_created_for?: string;
  ai_short_description?: string;
  hide_earnings?: boolean;
  upwork_show_status?: string;
  importal_skills?: string[];
  website_purpose?: string;
  salary_type?: string;
  job_country?: string;
  hourly_rate?: string;
  experience_years?: number;
  email_type?: string;
  createdAt?: string;
  updatedAt?: string;
  designation_category?: string;
}

export default function ManageDetailProfiles() {
  const [limit, setLimit] = useState("100");

  const [allProfiles, setAllProfiles] = useState<DetailProfile[]>([]);
  const [mainProfiles, setMainProfiles] = useState<MainProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainProfile, setSelectedMainProfile] = useState<string | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openCreatePopup, setOpenCreatePopup] = useState(false);

  const [openSkillSearchPopup, setOpenSkillSearchPopup] = useState(false);
  const [openEditProfilePopup, setOpenEditProfilePopup] = useState(false);
  const [selectedProfileForEdit, setSelectedProfileForEdit] =
    useState<DetailProfile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showJobDetailsId, setShowJobDetailsId] = useState<string | null>(null);
  const [selectedSearchSkills, setSelectedSearchSkills] = useState<Skill[]>([]);

  const updateProfileData = (updatedProfile: DetailProfile) => {
    setAllProfiles((prev) =>
      prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)),
    );
  };
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const param = { query: { limit: limit } };
      const [profilesRes, mainProfilesRes, categoriesRes, skillsRes] =
        await Promise.all([
          getAllDetailProfiles(param),
          getALLMainProfiles(),
          getAllCategories(),
          getAllSkills(),
        ]);

      if (profilesRes?.data) setAllProfiles(profilesRes.data);
      if (mainProfilesRes?.data) setMainProfiles(mainProfilesRes.data);
      if (categoriesRes?.data) setCategories(categoriesRes.data);
      if (skillsRes?.data) setAllSkills(skillsRes.data);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  // Fetch initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!openCreatePopup) {
      const param = { query: { limit: limit } };
      getAllDetailProfiles(param);
    }
  }, [openCreatePopup]);

  // Reload profiles when limit changes
  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // Filter categories based on selected main profile
  const getFilteredCategories = () => {
    if (!selectedMainProfile) return [];

    return categories.filter(
      (cat) => cat.main_profile_id === selectedMainProfile,
    );
  };

  // Get skill titles from IDs
  const getSkillTitles = (skillIds: any) => {
    if (!skillIds?.skills_ids || !Array.isArray(skillIds.skills_ids)) return [];
    return skillIds.skills_ids
      .map(
        (id: string) =>
          allSkills.find((s) => String(s.id) === String(id))?.title,
      )
      .filter(Boolean);
  };

  // Get full skill objects from IDs for matching
  const getSkillObjects = (skillIds: any) => {
    if (!skillIds?.skills_ids || !Array.isArray(skillIds.skills_ids)) return [];
    return skillIds.skills_ids
      .map((id: string) => allSkills.find((s) => String(s.id) === String(id)))
      .filter(Boolean) as Skill[];
  };

  // Calculate matched percentage for a profile
  const calculateMatchPercentage = (profile: DetailProfile): number => {
    if (selectedSearchSkills.length === 0) return 0;
    const profileSkills = getSkillObjects(profile.skills_ids);
    const matchedCount = profileSkills.filter((ps) =>
      selectedSearchSkills.some((s) => s.id === ps.id),
    ).length;
    return Math.round((matchedCount / selectedSearchSkills.length) * 100);
  };

  // Filter profiles based on all criteria
  const getFilteredProfiles = () => {
    let filtered = allProfiles.filter((profile) => {
      // Filter by main profile
      if (
        selectedMainProfile &&
        profile.main_profile_id !== selectedMainProfile
      ) {
        return false;
      }

      // Filter by category (match with service where type is main)
      if (selectedCategory) {
        const hasMainService = profile.services?.some(
          (s: any) => s.type === "main" && s.category_id === selectedCategory,
        );
        if (!hasMainService) return false;
      }

      // Filter by search query (id, uniqueID, designation, private_title)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          profile.id?.toLowerCase().includes(query) ||
          profile.unique_id?.toLowerCase().includes(query) ||
          profile.designation?.toLowerCase().includes(query) ||
          profile.private_title?.toLowerCase().includes(query) ||
          profile.website_created_for?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Sort profiles
    if (selectedSearchSkills.length > 0) {
      // Sort by matched percentage (descending), then by createdAt (most recent first)
      filtered.sort((a, b) => {
        const percentDiff =
          calculateMatchPercentage(b) - calculateMatchPercentage(a);
        if (percentDiff !== 0) return percentDiff;
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      // Limit to top 20 profiles when matched
      filtered = filtered.slice(0, 20);
    } else {
      // Sort by createdAt (most recent first)
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    }

    return filtered;
  };

  const handleCopyUniqueId = (uniqueId: string) => {
    navigator.clipboard.writeText(uniqueId);
    setCopiedId(uniqueId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredProfiles = getFilteredProfiles();
  const filteredCategories = getFilteredCategories();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {openCreatePopup && (
        <GenericPopup
          title="Create Personal Website"
          onClose={() => setOpenCreatePopup(false)}
        >
          <CreateDynamicPersonalWebsite
            setOpenCloseWebsiteCreatePopUP={setOpenCreatePopup}
            isCloseOnSelect={true}
          />
        </GenericPopup>
      )}

      {openSkillSearchPopup && (
        <GenericPopup
          title="Search & Match Skills"
          onClose={() => setOpenSkillSearchPopup(false)}
        >
          <SkillSearchPopup
            allSkills={allSkills}
            onClose={() => setOpenSkillSearchPopup(false)}
            onConfirm={(skills) => {
              setSelectedSearchSkills(skills);
              setOpenSkillSearchPopup(false);
            }}
          />
        </GenericPopup>
      )}

      {openEditProfilePopup && selectedProfileForEdit && (
        <GenericPopup
          title="Edit Profile"
          onClose={() => {
            setOpenEditProfilePopup(false);
            setSelectedProfileForEdit(null);
          }}
        >
          <EditDetailProfilePopup
            profile={selectedProfileForEdit}
            allSkills={allSkills}
            allCategories={categories.filter(
              (cat) =>
                cat.main_profile_id === selectedProfileForEdit.main_profile_id,
            )}
            onClose={() => {
              setOpenEditProfilePopup(false);
              setSelectedProfileForEdit(null);
            }}
            onSuccess={(updatedProfile) => {
              updateProfileData(updatedProfile);
              setOpenEditProfilePopup(false);
              setSelectedProfileForEdit(null);
            }}
          />
        </GenericPopup>
      )}

      {isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Websites ({filteredProfiles.length})
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  loadInitialData();
                }}
                className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow hover:bg-gray-700 transition"
                title="Refresh data"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => {
                  setOpenSkillSearchPopup(true);
                }}
                className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow hover:bg-purple-700 transition"
                title="Search and match skills by description"
              >
                🔍 Search by Skills
              </button>
              {selectedSearchSkills.length > 0 && (
                <button
                  onClick={() => setSelectedSearchSkills([])}
                  className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg shadow hover:bg-yellow-700 transition"
                  title="Clear selected skills"
                >
                  ✕ Clear Skills
                </button>
              )}
              <button
                onClick={async () => {
                  if (
                    window.confirm(
                      "Are you sure you want to reset PDF URLs for all detail profiles?",
                    )
                  ) {
                    try {
                      await resetAllDetailProfilesPDFURLs({ type: "all" });
                      window.location.reload();
                    } catch (err) {
                      alert("Failed to reset PDF URLs.");
                    }
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow hover:bg-red-700 transition"
                title="Reset PDF URLs for all profiles"
              >
                🧹 Reset All PDFs
              </button>
              <button
                onClick={() => setOpenCreatePopup(true)}
                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition"
              >
                + Create
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row gap-4">
            {/* Search Box */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by ID, Unique ID, Designation, or Private Title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Limit Dropdown */}
            <div className="flex items-center">
              <label className="block text-xs font-medium text-gray-700 mb-0.5 mr-2">
                Limit
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 min-w-[100px]"
              >
                <option value="all">All</option>
                {[
                  100,
                  200,
                  300,
                  400,
                  500,
                  600,
                  700,
                  800,
                  900,
                  ,
                  1100,
                  1200,
                  1300,
                  1400,
                  1500,
                  1600,
                  1700,
                  1800,
                  1900,
                  2000,
                ].map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>

            {/* Main Profile Filter */}
            <select
              value={selectedMainProfile || ""}
              onChange={(e) => {
                setSelectedMainProfile(e.target.value || null);
                setSelectedCategory(null); // Reset category when main profile changes
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 min-w-[200px]"
            >
              <option value="">Select Main Profile</option>
              {mainProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              disabled={!selectedMainProfile}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 min-w-[200px]"
            >
              <option value="">Select Category</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </div>

          {/* Profiles List */}
          <div className="flex flex-col gap-1">
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No profiles found</p>
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                // Get main category title
                const mainService = profile.services?.find(
                  (s: any) => s.type === "main",
                );
                const mainCategory = categories.find(
                  (c) => c.id === mainService?.category_id,
                );
                const isExpanded = expandedId === profile.id;
                const skillTitles = getSkillTitles(profile.skills_ids);
                const matchPercentage = calculateMatchPercentage(profile);
                const updatedDate = profile.updatedAt
                  ? new Date(profile.updatedAt).toLocaleDateString()
                  : "—";

                return (
                  <div
                    key={profile.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200"
                  >
                    {/* Compact Row */}
                    <div
                      onClick={() =>
                        setExpandedId(isExpanded ? null : profile.id)
                      }
                      className="w-full p-2 hover:bg-gray-50 transition flex items-center justify-between gap-4 cursor-pointer"
                    >
                      {/* Expand Icon */}
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      {/* Unique ID & Copy, and ID & Copy */}
                      <div
                        className="flex items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                          {profile.unique_id}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUniqueId(profile.unique_id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition"
                          title="Copy Unique ID"
                        >
                          <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                        </button>
                        {copiedId === profile.unique_id && (
                          <span className="text-xs text-green-600 font-semibold">
                            ✓
                          </span>
                        )}
                        {/* ID & Copy */}
                        <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {profile.id}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUniqueId(profile.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition"
                          title="Copy ID"
                        >
                          <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                        </button>
                        {copiedId === profile.id && (
                          <span className="text-xs text-green-600 font-semibold">
                            ✓
                          </span>
                        )}
                      </div>

                      {/* Designation */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate text-left">
                          {profile.designation}
                        </p>
                      </div>

                      {/* Category Title */}
                      <div className="shrink-0">
                        <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded whitespace-nowrap border border-blue-200">
                          {mainCategory?.title || "—"}
                        </span>
                      </div>

                      {/* Upwork Show Status & Hide Earnings */}
                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded whitespace-nowrap ${
                            profile.upwork_show_status === "show"
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : profile.upwork_show_status === "hide"
                                ? "bg-red-100 text-red-700 border border-red-300"
                                : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                          }`}
                        >
                          {profile.upwork_show_status === "show"
                            ? "Show Upwork"
                            : profile.upwork_show_status === "hide"
                              ? "Hide Upwork"
                              : "Show at End"}
                        </span>
                        {profile.hide_earnings && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-300">
                            Hide Rates
                          </span>
                        )}
                      </div>

                      {/* Match Percentage & Updated Date & Edit Button */}
                      <div className="shrink-0 flex items-center gap-2">
                        {selectedSearchSkills.length > 0 && (
                          <span
                            className={`inline-block px-2 py-1 text-xs font-semibold rounded whitespace-nowrap ${
                              matchPercentage === 100
                                ? "bg-green-100 text-green-700 border border-green-300"
                                : matchPercentage >= 50
                                  ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                  : "bg-red-100 text-red-700 border border-red-300"
                            }`}
                          >
                            {matchPercentage}%
                          </span>
                        )}
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {updatedDate}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProfileForEdit(profile);
                            setOpenEditProfilePopup(true);
                          }}
                          className="p-1.5 hover:bg-blue-100 rounded transition text-blue-600"
                          title="Edit profile details"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-3 flex flex-col gap-2">
                        {/* Important Skills */}
                        {profile.importal_skills &&
                          profile.importal_skills.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-gray-600 uppercase block mb-2">
                                ⭐ Important Skills (
                                {profile.importal_skills.length})
                              </span>
                              <div className="flex flex-wrap gap-1 mb-3">
                                {profile.importal_skills.map((skillId, idx) => {
                                  const skill = allSkills.find(
                                    (s) => s.id === skillId,
                                  );
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300"
                                    >
                                      ★ {skill?.title || skillId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        {/* Skills with skills_meta_data */}
                        <div>
                          <span className="text-xs font-semibold text-gray-600 uppercase block mb-2">
                            All Skills ({skillTitles.length})
                          </span>
                          {Array.isArray((profile as any).skills_meta_data) &&
                          (profile as any).skills_meta_data.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs border-separate border-spacing-0 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-indigo-50">
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                      Order
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                      Skill
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                      Show
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                      Show Type
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold text-gray-700">
                                      Important
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold text-gray-700">
                                      Learning
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {(profile as any).skills_meta_data
                                    .slice()
                                    .sort(
                                      (a, b) => (a.order || 0) - (b.order || 0),
                                    )
                                    .map((meta: any, idx: number) => {
                                      const skill = allSkills.find(
                                        (s) => String(s.id) === String(meta.id),
                                      );
                                      return (
                                        <tr
                                          key={meta.id}
                                          className={
                                            idx % 2 === 0
                                              ? "bg-white"
                                              : "bg-gray-50"
                                          }
                                        >
                                          <td className="px-3 py-2 text-center align-middle">
                                            {meta.order}
                                          </td>
                                          <td className="px-3 py-2 align-middle">
                                            <span className="font-medium text-gray-800">
                                              {skill?.title || meta.id}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 align-middle">
                                            {meta.show}
                                          </td>
                                          <td className="px-3 py-2 align-middle">
                                            {meta.show_type}
                                          </td>
                                          <td className="px-3 py-2 text-center align-middle">
                                            {meta.is_important ? (
                                              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-bold">
                                                ★
                                              </span>
                                            ) : (
                                              <span className="inline-block px-2 py-1 text-gray-400">
                                                —
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-center align-middle">
                                            {meta.is_learning ? (
                                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">
                                                ✔
                                              </span>
                                            ) : (
                                              <span className="inline-block px-2 py-1 text-gray-400">
                                                —
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {skillTitles.length > 0 ? (
                                skillTitles.map((skillTitle, idx) => {
                                  const profileSkill = getSkillObjects(
                                    profile.skills_ids,
                                  )[idx];
                                  const isMatched = selectedSearchSkills.some(
                                    (s) => s.id === profileSkill?.id,
                                  );
                                  return (
                                    <span
                                      key={idx}
                                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                        isMatched
                                          ? "bg-green-100 text-green-700 border border-green-300"
                                          : "bg-indigo-100 text-indigo-700"
                                      }`}
                                    >
                                      {skillTitle}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-gray-400">
                                  No skills
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {profile.designation_category && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Designation Category:
                              </span>
                              <p className="text-gray-700">
                                {(() => {
                                  const cat = categories.find(
                                    (c) =>
                                      String(c.id) ===
                                      String(profile.designation_category),
                                  );
                                  return cat
                                    ? cat.title
                                    : profile.designation_category;
                                })()}
                              </p>
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-gray-600">
                              Private Title:
                            </span>
                            <p className="text-gray-700">
                              {profile.private_title}
                            </p>
                          </div>
                          {profile.tag_line && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Tagline:
                              </span>
                              <p className="text-gray-700 truncate">
                                {profile.tag_line}
                              </p>
                            </div>
                          )}
                          {(profile as any).ai_short_description && (
                            <div className="col-span-2">
                              <span className="font-semibold text-gray-600">
                                AI Short Description:
                              </span>
                              <p className="text-gray-700 whitespace-pre-wrap overflow-wrap">
                                {(profile as any).ai_short_description}
                              </p>
                              {/* Show Job Details Button */}
                              <button
                                className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
                                onClick={() =>
                                  setShowJobDetailsId(
                                    showJobDetailsId === profile.id
                                      ? null
                                      : profile.id,
                                  )
                                }
                              >
                                {showJobDetailsId === profile.id
                                  ? "Hide Job Details"
                                  : "Show Job Details"}
                              </button>
                              {/* Job Details Display */}
                              {showJobDetailsId === profile.id && (
                                <div className="mt-2 p-2 bg-gray-100 rounded">
                                  <span className="font-semibold text-gray-600">
                                    Job Details:
                                  </span>
                                  <pre className="text-gray-700 whitespace-pre-wrap overflow-x-auto">
                                    {(profile as any).jobDetails ||
                                      "No job details available."}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                          {(profile as any).website_purpose && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Website Purpose:
                              </span>
                              <p className="text-gray-700">
                                {(
                                  (profile as any).website_purpose || ""
                                ).replace(/_/g, " ")}
                              </p>
                            </div>
                          )}
                          {(profile as any).createdBy && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Created By:
                              </span>
                              <p className="text-gray-700">
                                {(profile as any).createdBy || ""}
                              </p>
                            </div>
                          )}
                          {(profile as any).website_created_for && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Website Created For:
                              </span>
                              <p className="text-gray-700 truncate">
                                <a
                                  href={(profile as any).website_created_for}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {(profile as any).website_created_for}
                                </a>
                              </p>
                            </div>
                          )}
                          {(profile as any).salary_type && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Salary Type:
                              </span>
                              <p className="text-gray-700">
                                {((profile as any).salary_type || "").replace(
                                  /_/g,
                                  " ",
                                )}
                              </p>
                            </div>
                          )}
                          {(profile as any).job_country && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Job Country:
                              </span>
                              <p className="text-gray-700 uppercase">
                                {(profile as any).job_country}
                              </p>
                            </div>
                          )}
                          {(profile as any).experience_years !== undefined && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Years of Experience:
                              </span>
                              <p className="text-gray-700">
                                {(profile as any).experience_years}
                              </p>
                            </div>
                          )}
                          {(profile as any).email_type && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Email Type:
                              </span>
                              <p className="text-gray-700">
                                {(profile as any).email_type}
                              </p>
                            </div>
                          )}
                        </div>

                        <WebsiteURLs
                          data={profile as any}
                          setData={updateProfileData}
                          websitePurpose="remote_job"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
