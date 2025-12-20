"use client";

import { useEffect, useState, useRef } from "react";
import {
  getAllCategories,
  deleteCategoryByID,
  updateCategoryByID,
  addCategory,
} from "../../api_handlers/api/categories.api";
import { getALLMainProfiles } from "../../api_handlers/api/main_profiles.api";
import { getAllSkills } from "../../api_handlers/api/skills.api";
import {
  X,
  Search,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import CreateCategory from "./CreateCategory";
import dynamic from "next/dynamic";
import { useImageViewer } from "../ImageViewer";

const QuillEditor = dynamic(() => import("../QuillEditor"), {
  ssr: false,
  loading: () => (
    <div className="border rounded-lg px-3 py-2 bg-gray-50">
      Loading editor...
    </div>
  ),
});

const ImageViewer = dynamic(() => import("../ImageViewer"), {
  ssr: false,
});

interface Category {
  id: string;
  main_profile_id: string;
  label: string;
  title: string;
  designation: string;
  tagline: string;
  intro_heading?: string;
  intro?: string;
  mainIntro_heading?: string;
  mainIntro?: string;
  short_description?: string;
  thumbnail: string;
  skills_ids?: { skills_ids: string[] };
  experience_intro?: any;
  is_deleted: boolean;
  is_category_static: boolean;
  companytype: string;
}

interface MainProfile {
  id: string;
  name: string;
  email: string;
}

interface Skill {
  id: string;
  title: string;
}

export default function ManageCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mainProfiles, setMainProfiles] = useState<MainProfile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainProfileFilter, setSelectedMainProfileFilter] =
    useState<string>("");
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  // Skills search states
  const [skillSearchCreate, setSkillSearchCreate] = useState("");
  const [skillSearchEdit, setSkillSearchEdit] = useState("");
  const [showSkillDropdownCreate, setShowSkillDropdownCreate] = useState(false);
  const [showSkillDropdownEdit, setShowSkillDropdownEdit] = useState(false);

  // Experience intro expand state
  const [expandExperienceCreate, setExpandExperienceCreate] = useState(false);
  const [expandExperienceEdit, setExpandExperienceEdit] = useState(false);

  // Create form states
  const [createForm, setCreateForm] = useState({
    main_profile_id: "",
    label: "",
    title: "",
    designation: "",
    tagline: "",
    intro_heading: "",
    intro: "",
    mainIntro_heading: "",
    mainIntro: "",
    short_description: "",
    thumbnail: "",
    skills_ids: [] as string[],
    experience_intro: {
      intro1: "",
      intro2: "",
      intro3: "",
      intro4: "",
      intro5: "",
      intro6: "",
      intro7: "",
      intro8: "",
      intro9: "",
      intro10: "",
    },
  });

  const [editForm, setEditForm] = useState<any>({
    main_profile_id: "",
    label: "",
    title: "",
    designation: "",
    tagline: "",
    intro_heading: "",
    intro: "",
    mainIntro_heading: "",
    mainIntro: "",
    short_description: "",
    thumbnail: "",
    skills_ids: [] as string[],
    experience_intro: {
      intro1: "",
      intro2: "",
      intro3: "",
      intro4: "",
      intro5: "",
      intro6: "",
      intro7: "",
      intro8: "",
      intro9: "",
      intro10: "",
    },
  });

  const imageViewer = useImageViewer();

  // Fetch data
  const fetchCategories = async () => {
    try {
      const response = await getAllCategories();
      if (response && response.APIStatus === "success") {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchMainProfiles = async () => {
    try {
      const response = await getALLMainProfiles();
      if (response && response.APIStatus === "success") {
        setMainProfiles(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching main profiles:", error);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await getAllSkills();
      if (response && response.APIStatus === "success") {
        setSkills(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching skills:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchMainProfiles();
    fetchSkills();
  }, []);

  // Filter categories
  const filteredCategories = categories.filter((cat) => {
    // If no profile is selected, don't show any categories
    if (selectedMainProfileFilter === "") {
      return false;
    }

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      cat.id.toLowerCase().includes(searchLower) ||
      cat.title.toLowerCase().includes(searchLower) ||
      cat.label.toLowerCase().includes(searchLower) ||
      cat.designation.toLowerCase().includes(searchLower);

    const matchesProfile = cat.main_profile_id === selectedMainProfileFilter;

    return matchesSearch && matchesProfile;
  });

  // Delete category
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const response = await deleteCategoryByID({ path: { id } });
      if (response && response.APIStatus === "success") {
        fetchCategories();
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // Create category
  const handleCreate = async () => {
    if (!confirm("Are you sure you want to create this category?")) {
      return;
    }

    try {
      const payload = {
        ...createForm,
        skills_ids: { skills_ids: createForm.skills_ids },
        experience_intro: createForm.experience_intro,
        is_category_static: true,
        companytype: "cypexsoft",
      };
      const response = await addCategory(payload);
      if (response && response.APIStatus === "success") {
        setShowCreatePopup(false);
        fetchCategories();
        // Reset form
        setCreateForm({
          main_profile_id: "",
          label: "",
          title: "",
          designation: "",
          tagline: "",
          intro_heading: "",
          intro: "",
          mainIntro_heading: "",
          mainIntro: "",
          short_description: "",
          thumbnail: "",
          skills_ids: [],
          experience_intro: {
            intro1: "",
            intro2: "",
            intro3: "",
            intro4: "",
            intro5: "",
            intro6: "",
            intro7: "",
            intro8: "",
            intro9: "",
            intro10: "",
          },
        });
        setSkillSearchCreate("");
        setExpandExperienceCreate(false);
      }
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  // Update category
  const handleUpdate = async () => {
    if (!selectedCategory) return;

    if (!confirm("Are you sure you want to update this category?")) {
      return;
    }

    try {
      const payload = {
        ...editForm,
        skills_ids: { skills_ids: editForm.skills_ids },
        experience_intro: editForm.experience_intro,
        is_category_static: true,
        companytype: "cypexsoft",
      };
      const response = await updateCategoryByID(payload, {
        path: { id: selectedCategory.id },
      });
      if (response && response.APIStatus === "success") {
        setShowEditPopup(false);
        setSelectedCategory(null);
        fetchCategories();
        setSkillSearchEdit("");
        setExpandExperienceEdit(false);
      }
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  // Open edit popup
  const openEditPopup = (category: Category) => {
    setSelectedCategory(category);
    const experienceIntro = category.experience_intro || {};
    const skillsArray =
      typeof category.skills_ids === "object" && category.skills_ids
        ? (category.skills_ids as any).skills_ids || []
        : [];

    setEditForm({
      main_profile_id: category.main_profile_id,
      label: category.label,
      title: category.title,
      designation: category.designation,
      tagline: category.tagline,
      intro_heading: category.intro_heading || "",
      intro: category.intro || "",
      mainIntro_heading: category.mainIntro_heading || "",
      mainIntro: category.mainIntro || "",
      short_description: category.short_description || "",
      thumbnail: category.thumbnail,
      skills_ids: skillsArray,
      experience_intro: {
        intro1: (experienceIntro as any)?.intro1 || "",
        intro2: (experienceIntro as any)?.intro2 || "",
        intro3: (experienceIntro as any)?.intro3 || "",
        intro4: (experienceIntro as any)?.intro4 || "",
        intro5: (experienceIntro as any)?.intro5 || "",
        intro6: (experienceIntro as any)?.intro6 || "",
        intro7: (experienceIntro as any)?.intro7 || "",
        intro8: (experienceIntro as any)?.intro8 || "",
        intro9: (experienceIntro as any)?.intro9 || "",
        intro10: (experienceIntro as any)?.intro10 || "",
      },
    });
    setShowEditPopup(true);
  };

  // Skills management
  const addSkillToForm = (form: "create" | "edit", skillId: string) => {
    if (form === "create") {
      if (!createForm.skills_ids.includes(skillId)) {
        setCreateForm((prev) => ({
          ...prev,
          skills_ids: [...prev.skills_ids, skillId],
        }));
      }
      setSkillSearchCreate("");
      setShowSkillDropdownCreate(false);
    } else {
      if (!editForm.skills_ids.includes(skillId)) {
        setEditForm((prev: any) => ({
          ...prev,
          skills_ids: [...prev.skills_ids, skillId],
        }));
      }
      setSkillSearchEdit("");
      setShowSkillDropdownEdit(false);
    }
  };

  const removeSkillFromForm = (form: "create" | "edit", skillId: string) => {
    if (form === "create") {
      setCreateForm((prev) => ({
        ...prev,
        skills_ids: prev.skills_ids.filter((id) => id !== skillId),
      }));
    } else {
      setEditForm((prev: any) => ({
        ...prev,
        skills_ids: prev.skills_ids.filter((id: string) => id !== skillId),
      }));
    }
  };

  const getSkillById = (skillId: string) => {
    return skills.find((s) => s.id === skillId);
  };

  const getFilteredSkills = (form: "create" | "edit") => {
    const searchTerm = form === "create" ? skillSearchCreate : skillSearchEdit;
    const selectedSkills =
      form === "create" ? createForm.skills_ids : editForm.skills_ids;

    return skills.filter(
      (skill) =>
        skill.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedSkills.includes(skill.id)
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manage Categories
          </h1>
          <p className="text-gray-600 mt-1">
            Total Categories: {filteredCategories.length}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAIPopup(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Sparkles className="w-4 h-4" />
            AI Create
          </button>
          <button
            onClick={() => setShowCreatePopup(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Create Category
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, title, label, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedMainProfileFilter}
          onChange={(e) => setSelectedMainProfileFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[250px]"
        >
          <option value="">Select Main Profile</option>
          {mainProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} ({profile.email})
            </option>
          ))}
        </select>
      </div>

      {/* Categories List */}
      <div className="grid gap-4">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start gap-4">
              <button
                onClick={() => imageViewer.openViewer([category.thumbnail])}
                className="w-20 h-20 rounded-lg overflow-hidden hover:opacity-80 transition cursor-pointer flex-shrink-0"
              >
                <img
                  src={category.thumbnail}
                  alt={category.title}
                  className="w-full h-full object-cover"
                />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {category.title}
                  </h3>
                  <button
                    title="Copy ID"
                    className="ml-1 px-2 py-1 rounded bg-gray-200 hover:bg-blue-200 text-xs font-semibold transition border border-gray-300"
                    onClick={() => navigator.clipboard.writeText(category.id)}
                  >
                    ID
                  </button>
                </div>
                <p className="text-sm text-gray-600">{category.designation}</p>
                <p className="text-sm text-gray-500 mt-1">{category.tagline}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Label: {category.label}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditPopup(category)}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition"
                >
                  Edit
                </button>
                {/* <button
                  onClick={() => handleDelete(category.id)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                >
                  Delete
                </button> */}
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
                Create New Category
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
                {/* Column 1: Basic Information */}
                <div className="space-y-6">
                  {/* Basic Info Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-blue-600 rounded"></div>
                      Basic Information
                    </h3>
                    <div className="space-y-4">
                      {/* Main Profile */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Main Profile *
                        </label>
                        <select
                          value={createForm.main_profile_id}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              main_profile_id: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Main Profile</option>
                          {mainProfiles.map((mp) => (
                            <option key={mp.id} value={mp.id}>
                              {mp.name} ({mp.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Label */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Label *
                        </label>
                        <input
                          type="text"
                          value={createForm.label}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              label: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={createForm.title}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              title: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Designation */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Designation *
                        </label>
                        <input
                          type="text"
                          value={createForm.designation}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              designation: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Tagline */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tagline *
                        </label>
                        <input
                          type="text"
                          value={createForm.tagline}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              tagline: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Thumbnail */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Thumbnail URL *
                        </label>
                        <input
                          type="text"
                          value={createForm.thumbnail}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              thumbnail: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {createForm.thumbnail && (
                          <img
                            src={createForm.thumbnail}
                            alt="Thumbnail"
                            className="w-full h-32 object-cover rounded-lg mt-2"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-blue-600 rounded"></div>
                      Skills
                    </h3>
                    <div>
                      {/* Selected Skills as Cards */}
                      {createForm.skills_ids.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {createForm.skills_ids.map((skillId) => {
                            const skill = getSkillById(skillId);
                            return skill ? (
                              <div
                                key={skillId}
                                className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                              >
                                <span>{skill.title}</span>
                                <button
                                  onClick={() =>
                                    removeSkillFromForm("create", skillId)
                                  }
                                  className="hover:bg-blue-200 rounded-full p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Search Input */}
                      <div className="relative">
                        <input
                          type="text"
                          value={skillSearchCreate}
                          onChange={(e) => {
                            setSkillSearchCreate(e.target.value);
                            setShowSkillDropdownCreate(true);
                          }}
                          onFocus={() => setShowSkillDropdownCreate(true)}
                          placeholder="Search and select skills..."
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Dropdown */}
                        {showSkillDropdownCreate && skillSearchCreate && (
                          <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {getFilteredSkills("create").length > 0 ? (
                              getFilteredSkills("create").map((skill) => (
                                <div
                                  key={skill.id}
                                  onClick={() =>
                                    addSkillToForm("create", skill.id)
                                  }
                                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                >
                                  {skill.title}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-gray-500 text-sm">
                                No skills found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Content */}
                <div className="space-y-6">
                  {/* Intro Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-blue-600 rounded"></div>
                      Introduction
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Intro Heading
                        </label>
                        <input
                          type="text"
                          value={createForm.intro_heading}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              intro_heading: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Intro Content
                        </label>
                        <QuillEditor
                          key="create-intro"
                          value={createForm.intro}
                          onChange={(value) =>
                            setCreateForm((prev) => ({ ...prev, intro: value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Main Intro Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-blue-600 rounded"></div>
                      Main Introduction
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Main Intro Heading
                        </label>
                        <input
                          type="text"
                          value={createForm.mainIntro_heading}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              mainIntro_heading: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Main Intro Content
                        </label>
                        <QuillEditor
                          key="create-main-intro"
                          value={createForm.mainIntro}
                          onChange={(value) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              mainIntro: value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Short Description Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-blue-600 rounded"></div>
                      Short Description
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description Content
                      </label>
                      <QuillEditor
                        key="create-short-desc"
                        value={createForm.short_description}
                        onChange={(value) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            short_description: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Experience Intro - Full Width Card */}
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
                    Experience Introduction (10 sections)
                  </h3>
                  {expandExperienceCreate ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {expandExperienceCreate && (
                  <div className="mt-6 grid grid-cols-2 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <div
                        key={num}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Experience Intro {num}
                        </label>
                        <QuillEditor
                          key={`create-exp-intro-${num}`}
                          value={
                            createForm.experience_intro[
                              `intro${num}` as keyof typeof createForm.experience_intro
                            ] || ""
                          }
                          onChange={(value) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              experience_intro: {
                                ...prev.experience_intro,
                                [`intro${num}`]: value,
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="border-t bg-gray-50 px-6 py-4 flex gap-4 rounded-b-lg">
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-medium shadow-lg shadow-blue-600/20"
              >
                Create Category
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

      {/* AI Create Popup */}
      {showAIPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">AI Create Category</h2>
              <button
                onClick={() => setShowAIPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {mainProfiles.length > 0 && selectedMainProfileFilter && (
                <CreateCategory
                  main_profile_id={selectedMainProfileFilter}
                  onSuccess={() => {
                    setShowAIPopup(false);
                    fetchCategories();
                  }}
                />
              )}
              {mainProfiles.length > 0 && !selectedMainProfileFilter && (
                <div className="text-center py-8 text-gray-500">
                  Please select a main profile from the dropdown above to create
                  categories.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Popup */}
      {showEditPopup && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] h-[95vh] flex flex-col">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-2xl font-bold text-white">Edit Category</h2>
              <button
                onClick={() => {
                  setShowEditPopup(false);
                  setSelectedCategory(null);
                  setExpandExperienceEdit(false);
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Column 1: Basic Information */}
                <div className="space-y-6">
                  {/* Basic Info Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                      Basic Information
                    </h3>
                    <div className="space-y-4">
                      {/* Main Profile */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Main Profile *
                        </label>
                        <select
                          value={editForm.main_profile_id}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              main_profile_id: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        >
                          <option value="">Select Main Profile</option>
                          {mainProfiles.map((mp) => (
                            <option key={mp.id} value={mp.id}>
                              {mp.name} ({mp.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Label */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Label *
                        </label>
                        <input
                          type="text"
                          value={editForm.label}
                          onChange={(e) =>
                            setEditForm({ ...editForm, label: e.target.value })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm({ ...editForm, title: e.target.value })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>

                      {/* Designation */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Designation *
                        </label>
                        <input
                          type="text"
                          value={editForm.designation}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              designation: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>

                      {/* Tagline */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tagline *
                        </label>
                        <input
                          type="text"
                          value={editForm.tagline}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              tagline: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>

                      {/* Thumbnail */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Thumbnail URL *
                        </label>
                        <input
                          type="text"
                          value={editForm.thumbnail}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              thumbnail: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        {editForm.thumbnail && (
                          <img
                            src={editForm.thumbnail}
                            alt="Thumbnail"
                            className="w-full h-32 object-cover rounded-lg mt-2"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                      Skills
                    </h3>
                    <div>
                      {/* Selected Skills as Cards */}
                      {editForm.skills_ids &&
                        editForm.skills_ids.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {editForm.skills_ids.map((skillId: string) => {
                              const skill = getSkillById(skillId);
                              return skill ? (
                                <div
                                  key={skillId}
                                  className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                                >
                                  <span>{skill.title}</span>
                                  <button
                                    onClick={() =>
                                      removeSkillFromForm("edit", skillId)
                                    }
                                    className="hover:bg-blue-200 rounded-full p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}

                      {/* Search Input */}
                      <div className="relative">
                        <input
                          type="text"
                          value={skillSearchEdit}
                          onChange={(e) => {
                            setSkillSearchEdit(e.target.value);
                            setShowSkillDropdownEdit(true);
                          }}
                          onFocus={() => setShowSkillDropdownEdit(true)}
                          placeholder="Search and select skills..."
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />

                        {/* Dropdown */}
                        {showSkillDropdownEdit && skillSearchEdit && (
                          <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {getFilteredSkills("edit").length > 0 ? (
                              getFilteredSkills("edit").map((skill) => (
                                <div
                                  key={skill.id}
                                  onClick={() =>
                                    addSkillToForm("edit", skill.id)
                                  }
                                  className="px-3 py-2 hover:bg-yellow-50 cursor-pointer border-b last:border-b-0"
                                >
                                  {skill.title}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-gray-500 text-sm">
                                No skills found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Content */}
                <div className="space-y-6">
                  {/* Intro Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                      Introduction
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Intro Heading
                        </label>
                        <input
                          type="text"
                          value={editForm.intro_heading}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              intro_heading: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Intro Content
                        </label>
                        <QuillEditor
                          key="edit-intro"
                          value={editForm.intro || ""}
                          onChange={(value) =>
                            setEditForm((prev) => ({ ...prev, intro: value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Main Intro Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                      Main Introduction
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Main Intro Heading
                        </label>
                        <input
                          type="text"
                          value={editForm.mainIntro_heading}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              mainIntro_heading: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Main Intro Content
                        </label>
                        <QuillEditor
                          key="edit-main-intro"
                          value={editForm.mainIntro || ""}
                          onChange={(value) =>
                            setEditForm((prev) => ({
                              ...prev,
                              mainIntro: value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Short Description Card */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                      Short Description
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description Content
                      </label>
                      <QuillEditor
                        key="edit-short-desc"
                        value={editForm.short_description || ""}
                        onChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            short_description: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Experience Intro - Full Width Card */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandExperienceEdit(!expandExperienceEdit)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                    Experience Introduction (10 sections)
                  </h3>
                  {expandExperienceEdit ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {expandExperienceEdit && (
                  <div className="mt-6 grid grid-cols-2 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <div
                        key={num}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Experience Intro {num}
                        </label>
                        <QuillEditor
                          key={`edit-exp-intro-${num}`}
                          value={
                            editForm.experience_intro?.[`intro${num}`] || ""
                          }
                          onChange={(value) =>
                            setEditForm((prev) => ({
                              ...prev,
                              experience_intro: {
                                ...prev.experience_intro,
                                [`intro${num}`]: value,
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="border-t bg-gray-50 px-6 py-4 flex gap-4 rounded-b-lg">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg transition font-medium shadow-lg shadow-yellow-500/20"
              >
                Update Category
              </button>
              <button
                onClick={() => {
                  setShowEditPopup(false);
                  setSelectedCategory(null);
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

      <ImageViewer />
    </div>
  );
}
