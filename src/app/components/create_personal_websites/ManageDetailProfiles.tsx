"use client";

import React, { useState, useEffect } from "react";
import { getAllDetailProfiles } from "@/app/api_handlers/api/detail_profiles.api";
import { getALLMainProfiles } from "@/app/api_handlers/api/main_profiles.api";
import { getAllCategories } from "@/app/api_handlers/api/categories.api";
import { getAllSkills } from "@/app/api_handlers/api/skills.api";
import GenericPopup from "../popups/GenericPopup";
import CreateDynamicPersonalWebsite from "./createDynamicPersonalWebsite";
import { Copy, Search, ChevronDown, ChevronUp } from "lucide-react";
import WebsiteURLs from "./websiteUrls";

interface Skill {
  id: string | number;
  title: string;
}

interface Category {
  id: string;
  name: string;
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
}

export default function ManageDetailProfiles() {
  const [allProfiles, setAllProfiles] = useState<DetailProfile[]>([]);
  const [mainProfiles, setMainProfiles] = useState<MainProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainProfile, setSelectedMainProfile] = useState<string | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openCreatePopup, setOpenCreatePopup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateProfileData = (updatedProfile: DetailProfile) => {
    setAllProfiles((prev) =>
      prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p))
    );
  };

  // Fetch initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [profilesRes, mainProfilesRes, categoriesRes, skillsRes] =
          await Promise.all([
            getAllDetailProfiles(),
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

    loadInitialData();
  }, []);

  // Filter categories based on selected main profile and services
  const getFilteredCategories = () => {
    if (!selectedMainProfile) return [];

    const categoryIds = new Set<string>();
    allProfiles
      .filter((p) => p.main_profile_id === selectedMainProfile)
      .forEach((profile) => {
        const mainService = profile.services?.find(
          (s: any) => s.type === "main"
        );
        if (mainService?.category_id) {
          categoryIds.add(mainService.category_id);
        }
      });
    console.log("Filtered Category IDs:", categories);

    return categories.filter((cat) => categoryIds.has(cat.id));
  };

  // Get skill titles from IDs
  const getSkillTitles = (skillIds: any) => {
    if (!skillIds?.skills_ids || !Array.isArray(skillIds.skills_ids)) return [];
    return skillIds.skills_ids
      .map(
        (id: string) =>
          allSkills.find((s) => String(s.id) === String(id))?.title
      )
      .filter(Boolean);
  };

  // Filter profiles based on all criteria
  const getFilteredProfiles = () => {
    return allProfiles.filter((profile) => {
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
          (s: any) => s.type === "main" && s.category_id === selectedCategory
        );
        if (!hasMainService) return false;
      }

      // Filter by search query (uniqueID, designation, private_title)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          profile.unique_id?.toLowerCase().includes(query) ||
          false ||
          profile.designation?.toLowerCase().includes(query) ||
          false ||
          profile.private_title?.toLowerCase().includes(query) ||
          false
        );
      }

      return true;
    });
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
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow hover:bg-gray-700 transition"
                title="Refresh data"
              >
                🔄 Refresh
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
                  placeholder="Search by Unique ID, Designation, or Private Title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
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
                  (s: any) => s.type === "main"
                );
                const mainCategory = categories.find(
                  (c) => c.id === mainService?.category_id
                );
                const isExpanded = expandedId === profile.id;
                const skillTitles = getSkillTitles(profile.skills_ids);

                return (
                  <div
                    key={profile.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200"
                  >
                    {/* Compact Row */}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : profile.id)
                      }
                      className="w-full p-2 hover:bg-gray-50 transition flex items-center justify-between gap-4"
                    >
                      {/* Expand Icon */}
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      {/* Unique ID & Copy */}
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
                          {mainCategory?.name || "—"}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-3 flex flex-col gap-2">
                        {/* Skills */}
                        <div>
                          <span className="text-xs font-semibold text-gray-600 uppercase block mb-2">
                            Skills ({skillTitles.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {skillTitles.length > 0 ? (
                              skillTitles.map((skillTitle, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full"
                                >
                                  {skillTitle}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">
                                No skills
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
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
