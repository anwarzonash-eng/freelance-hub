"use client";
import React, { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import {
  getAllPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  uploadPortfolioImage,
  uploadPortfolioImages,
} from "@/app/api_handlers/api/portfolios.api";
import { getALLMainProfiles } from "@/app/api_handlers/api/main_profiles.api";
import { getAllCategories } from "@/app/api_handlers/api/categories.api";
import dynamic from "next/dynamic";
import { useImageViewer } from "../ImageViewer";

const QuillEditor = dynamic(() => import("../QuillEditor"), {
  ssr: false,
});

const ImageViewer = dynamic(() => import("../ImageViewer"), {
  ssr: false,
});

export default function ManagePortfolios() {
  const imageViewer = useImageViewer();
  const [portfolios, setPortfolios] = useState([]);
  const [mainProfiles, setMainProfiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMainProfile, setSelectedMainProfile] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  useEffect(() => {
    fetchData();
    getALLMainProfiles().then((res) => setMainProfiles(res.data || []));
    getAllCategories().then((res) => setCategories(res.data || []));
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const res = await getAllPortfolios();
    setPortfolios(res.data || []);
    setIsLoading(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // Get filtered categories based on selected main profile
  const getFilteredCategories = () => {
    if (!selectedMainProfile) return [];

    const categoryIds = new Set<string>();
    portfolios
      .filter((p: any) => p.main_profile_id === selectedMainProfile)
      .forEach((portfolio: any) => {
        const cats = portfolio.categorys?.category_ids || [];
        cats.forEach((catId: string) => categoryIds.add(catId));
      });

    return categories.filter((cat: any) => categoryIds.has(cat.id));
  };

  // Get all categories for the form popup, filtered by main profile
  const getFormFilteredCategories = () => {
    if (!form?.main_profile_id) return [];
    return categories.filter(
      (cat: any) => cat.main_profile_id === form.main_profile_id
    );
  };

  const filteredPortfolios = portfolios.filter((p: any) => {
    const matchesId = p.id?.toLowerCase().includes(search.toLowerCase());
    const matchesTitle = p.title?.toLowerCase().includes(search.toLowerCase());
    const matchesMainProfile = selectedMainProfile
      ? p.main_profile_id === selectedMainProfile
      : true;
    const matchesCategory = selectedCategory
      ? (p.categorys?.category_ids || []).includes(selectedCategory)
      : true;
    return (matchesId || matchesTitle) && matchesMainProfile && matchesCategory;
  });

  const filteredCategories = getFilteredCategories();

  const handleEdit = (portfolio: any) => {
    setForm({ ...portfolio, pictures: JSON.parse(portfolio.pictures || "[]") });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deletePortfolio({ path: { id } });
    fetchData();
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    if (name === "main_profile_id") {
      // Reset categories when main profile changes
      setForm((prev: any) => ({
        ...prev,
        [name]: value,
        categorys: { category_ids: [] },
      }));
    } else {
      setForm((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = async (e: any, field: string, multiple = false) => {
    const files = Array.from(e.target.files) as File[];
    if (files.length === 0) return;

    try {
      if (multiple) {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        const res: any = await uploadPortfolioImages(formData);
        if (res?.data?.urls && Array.isArray(res.data.urls)) {
          setForm((prev: any) => ({ ...prev, pictures: res.data.urls }));
        } else if (res?.urls && Array.isArray(res.urls)) {
          setForm((prev: any) => ({ ...prev, pictures: res.urls }));
        }
      } else {
        const formData = new FormData();
        formData.append("file", files[0]);
        const res: any = await uploadPortfolioImage(formData);
        if (res?.data?.url) {
          setForm((prev: any) => ({ ...prev, [field]: res.data.url }));
        } else if (res?.url) {
          setForm((prev: any) => ({ ...prev, [field]: res.url }));
        }
      }
    } catch (error) {
      console.error("File upload error:", error);
    }
  };

  const handleQuillChange = (field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (e: any) => {
    const selected = Array.from(e.target.selectedOptions).map(
      (o: any) => o.value
    );
    setForm((prev: any) => ({
      ...prev,
      categorys: { category_ids: selected },
    }));
  };

  const handleToggleCategory = (categoryId: string) => {
    setForm((prev: any) => {
      const currentIds = prev?.categorys?.category_ids || [];
      const isSelected = currentIds.includes(categoryId);
      return {
        ...prev,
        categorys: {
          category_ids: isSelected
            ? currentIds.filter((id: string) => id !== categoryId)
            : [...currentIds, categoryId],
        },
      };
    });
  };

  const handleRemoveCategory = (categoryId: string) => {
    setForm((prev: any) => ({
      ...prev,
      categorys: {
        category_ids: (prev?.categorys?.category_ids || []).filter(
          (id: string) => id !== categoryId
        ),
      },
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (isEdit) {
      await updatePortfolio(
        {
          ...form,
          pictures: JSON.stringify(form.pictures),
        },
        { path: { id: form.id } }
      );
    } else {
      await createPortfolio({
        ...form,
        pictures: JSON.stringify(form.pictures),
      });
    }
    setShowForm(false);
    setForm(null);
    fetchData();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Portfolios ({filteredPortfolios.length})
        </h1>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={() => {
            setShowForm(true);
            setIsEdit(false);
            setForm({ pictures: [] });
          }}
        >
          + Create
        </button>
      </div>
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-4 rounded-lg mb-6 flex gap-3 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="flex items-center border-2 border-gray-300 rounded-lg bg-white focus-within:border-blue-500">
            <Search size={18} className="text-gray-400 ml-3" />
            <input
              type="text"
              placeholder="Search by ID or Title"
              value={search}
              onChange={handleSearch}
              className="flex-1 px-3 py-2 focus:outline-none rounded-lg"
            />
          </div>
        </div>
        <select
          value={selectedMainProfile}
          onChange={(e) => {
            setSelectedMainProfile(e.target.value);
            setSelectedCategory(null);
          }}
          className="border-2 border-gray-300 px-4 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none bg-white hover:border-blue-400 transition"
        >
          <option value="">All Main Profiles</option>
          {mainProfiles.map((mp: any) => (
            <option key={mp.id} value={mp.id}>
              {mp.name}
            </option>
          ))}
        </select>
        <select
          value={selectedCategory || ""}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          disabled={!selectedMainProfile}
          className="border-2 border-gray-300 px-4 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none bg-white hover:border-blue-400 transition disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">All Categories</option>
          {filteredCategories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>
              {cat.title}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg">Loading portfolios...</div>
        </div>
      ) : filteredPortfolios.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No portfolios found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPortfolios.map((p: any) => (
            <div
              key={p.id}
              className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition hover:border-blue-300 flex"
            >
              {/* Thumbnail */}
              <button
                onClick={() => {
                  const allImages = [];
                  if (p.thumbnail) allImages.push(p.thumbnail);
                  if (p.child_hero_banner) allImages.push(p.child_hero_banner);
                  if (p.pictures && Array.isArray(p.pictures)) {
                    const pictures =
                      typeof p.pictures === "string"
                        ? JSON.parse(p.pictures)
                        : p.pictures;
                    allImages.push(...pictures);
                  }
                  if (allImages.length > 0) {
                    imageViewer.openViewer(allImages, 0);
                  }
                }}
                className="shrink-0 w-32 h-32 bg-gray-100 cursor-pointer hover:opacity-80 transition overflow-hidden"
              >
                {p.thumbnail ? (
                  <img
                    src={p.thumbnail}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-gray-400 text-sm">No image</span>
                  </div>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-1">
                    {p.title}
                  </h3>
                  {p.private_title && (
                    <p className="text-sm text-gray-500 mb-2">
                      <span className="font-semibold">Private:</span>{" "}
                      {p.private_title}
                    </p>
                  )}
                  {p.categorys?.category_ids &&
                    p.categorys.category_ids.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-2">
                        {p.categorys.category_ids.map((catId: string) => {
                          const cat = categories.find(
                            (c: any) => c.id === catId
                          );
                          return (
                            <span
                              key={catId}
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold"
                            >
                              {cat?.name || cat?.title || catId}
                            </span>
                          );
                        })}
                      </div>
                    )}
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex gap-2 p-4 items-center border-l-2 border-gray-200">
                <button
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
                  onClick={() => handleEdit(p)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition shadow-md"
                  onClick={() => handleDelete(p.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-2">
          <form
            className="bg-white w-full h-full rounded-lg shadow-2xl overflow-hidden flex flex-col"
            onSubmit={handleSubmit}
          >
            {/* Header */}
            <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
              <h2 className="text-3xl font-bold">
                {isEdit ? "Edit Portfolio" : "Create Portfolio"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(null);
                  setCategorySearch("");
                }}
                className="hover:bg-blue-800 p-2 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      name="title"
                      value={form?.title || ""}
                      onChange={handleFormChange}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Private Title
                    </label>
                    <input
                      name="private_title"
                      value={form?.private_title || ""}
                      onChange={handleFormChange}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Profile & Categories */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Main Profile *
                    </label>
                    <select
                      name="main_profile_id"
                      value={form?.main_profile_id || ""}
                      onChange={handleFormChange}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select Main Profile</option>
                      {mainProfiles.map((mp: any) => (
                        <option key={mp.id} value={mp.id}>
                          {mp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Categories
                    </label>
                    <div className="relative">
                      <div className="flex items-center border-2 border-gray-300 rounded-lg focus-within:border-blue-500 bg-white">
                        <Search size={18} className="text-gray-400 ml-3" />
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="flex-1 px-3 py-2 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Categories as Cards */}
                {form?.categorys?.category_ids &&
                  form.categorys.category_ids.length > 0 && (
                    <div className="mb-6">
                      <label className="block font-bold text-gray-700 mb-2">
                        Selected Categories
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {form.categorys.category_ids.map((catId: string) => {
                          const cat = categories.find(
                            (c: any) => c.id === catId
                          );
                          return (
                            <div
                              key={catId}
                              className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full flex items-center gap-2 font-semibold"
                            >
                              {cat?.name || cat?.title || catId}
                              <button
                                type="button"
                                onClick={() => handleRemoveCategory(catId)}
                                className="hover:bg-blue-200 rounded-full p-1"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Category Selection Dropdown */}
                {!form?.main_profile_id && (
                  <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg text-amber-800 font-semibold">
                    Select a Main Profile to view available categories
                  </div>
                )}
                {form?.main_profile_id &&
                  getFormFilteredCategories().length === 0 && (
                    <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg text-amber-800 font-semibold">
                      No categories available for this Main Profile
                    </div>
                  )}
                {getFormFilteredCategories().length > 0 && (
                  <div className="mb-6 border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                      {getFormFilteredCategories()
                        .filter((cat: any) =>
                          (cat?.name || cat?.title || "")
                            .toLowerCase()
                            .includes(categorySearch.toLowerCase())
                        )
                        .map((cat: any) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleToggleCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg font-semibold transition ${
                              form?.categorys?.category_ids?.includes(cat.id)
                                ? "bg-blue-600 text-white"
                                : "bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500"
                            }`}
                          >
                            {cat?.name || cat?.title || cat.id}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Quill Editors */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Tagline 1
                    </label>
                    <QuillEditor
                      value={form?.tagline_1 || ""}
                      onChange={(val: string) =>
                        handleQuillChange("tagline_1", val)
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Tagline 2
                    </label>
                    <QuillEditor
                      value={form?.tagline_2 || ""}
                      onChange={(val: string) =>
                        handleQuillChange("tagline_2", val)
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Features Short
                    </label>
                    <QuillEditor
                      value={form?.features_short || ""}
                      onChange={(val: string) =>
                        handleQuillChange("features_short", val)
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Tech Short
                    </label>
                    <QuillEditor
                      value={form?.tech_short || ""}
                      onChange={(val: string) =>
                        handleQuillChange("tech_short", val)
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Tech Long
                    </label>
                    <QuillEditor
                      value={form?.tech_long || ""}
                      onChange={(val: string) =>
                        handleQuillChange("tech_long", val)
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Services I Provide
                    </label>
                    <QuillEditor
                      value={form?.services_i_provide || ""}
                      onChange={(val: string) =>
                        handleQuillChange("services_i_provide", val)
                      }
                    />
                  </div>
                </div>

                {/* Images */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Thumbnail (max 2MB)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "thumbnail")}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg"
                    />
                    {form?.thumbnail && (
                      <button
                        type="button"
                        onClick={() => imageViewer.openViewer([form.thumbnail])}
                        className="cursor-pointer hover:opacity-80 transition"
                      >
                        <img
                          src={form.thumbnail}
                          alt="thumb"
                          className="h-40 w-40 object-cover rounded-lg mt-3 shadow-lg"
                        />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Child Hero Banner (max 2MB)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "child_hero_banner")}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg"
                    />
                    {form?.child_hero_banner && (
                      <button
                        type="button"
                        onClick={() =>
                          imageViewer.openViewer([form.child_hero_banner])
                        }
                        className="cursor-pointer hover:opacity-80 transition"
                      >
                        <img
                          src={form.child_hero_banner}
                          alt="banner"
                          className="h-40 w-56 object-cover rounded-lg mt-3 shadow-lg"
                        />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block font-bold text-gray-700 mb-2">
                    Company Icon (URL)
                  </label>
                  <input
                    name="company_icon"
                    value={form?.company_icon || ""}
                    onChange={handleFormChange}
                    className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-2">
                    Pictures (max 10, each max 2MB)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileChange(e, "pictures", true)}
                    className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg"
                  />
                  <div className="flex flex-wrap gap-4 mt-4">
                    {form?.pictures?.map((url: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          imageViewer.openViewer(form.pictures, idx)
                        }
                        className="relative cursor-pointer hover:opacity-80 transition rounded-lg overflow-hidden"
                      >
                        <img
                          src={url}
                          alt="pic"
                          className="h-32 w-32 object-cover rounded-lg shadow-lg"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-100 border-t-2 border-gray-200 p-6 flex gap-3 justify-end">
              <button
                type="button"
                className="bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-500 transition"
                onClick={() => {
                  setShowForm(false);
                  setForm(null);
                  setCategorySearch("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {isEdit ? "Update Portfolio" : "Create Portfolio"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Image Viewer */}
      <ImageViewer />
    </div>
  );
}
