"use client";
import React, { useState, useEffect } from "react";
import { Search, Trash2, Edit, Video, ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";
import { getALLMainProfiles } from "@/app/api_handlers/api/main_profiles.api";
import {
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  uploadTestimonialFile,
} from "@/app/api_handlers/api/testimonials.api";

const QuillEditor = dynamic(() => import("../QuillEditor"), {
  ssr: false,
});

export default function ManageTestimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [mainProfiles, setMainProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMainProfile, setSelectedMainProfile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    fetchData();
    getALLMainProfiles().then((res) => setMainProfiles(res.data || []));
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const res = await getAllTestimonials();
    setTestimonials(res.data || []);
    setIsLoading(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredTestimonials = testimonials.filter((t: any) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      t.client_name?.toLowerCase().includes(searchLower) ||
      t.client_designation?.toLowerCase().includes(searchLower) ||
      t.client_company?.toLowerCase().includes(searchLower) ||
      t.linked_in?.toLowerCase().includes(searchLower) ||
      t.instagram?.toLowerCase().includes(searchLower) ||
      t.review_text?.toLowerCase().includes(searchLower);
    const matchesMainProfile = selectedMainProfile
      ? t.main_profile_id === selectedMainProfile
      : true;
    return matchesSearch && matchesMainProfile;
  });

  const handleEdit = (testimonial: any) => {
    setForm({ ...testimonial });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this testimonial? This action cannot be undone."
      )
    ) {
      return;
    }
    await deleteTestimonial({ path: { id } });
    fetchData();
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: any, field: string) => {
    const files = Array.from(e.target.files) as File[];
    if (files.length === 0) return;

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res: any = await uploadTestimonialFile(formData);
      if (res?.data?.url) {
        setForm((prev: any) => ({ ...prev, [field]: res.data.url }));
      } else if (res?.url) {
        setForm((prev: any) => ({ ...prev, [field]: res.url }));
      }
    } catch (error) {
      console.error("File upload error:", error);
    }
  };

  const handleQuillChange = (field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const confirmMessage = isEdit
      ? "Are you sure you want to update this testimonial?"
      : "Are you sure you want to create this testimonial?";

    if (!confirm(confirmMessage)) {
      return;
    }

    const payload = { ...form, portfolio_id: null };
    if (isEdit) {
      await updateTestimonial(payload, { path: { id: form.id } });
    } else {
      await createTestimonial(payload);
    }
    setShowForm(false);
    setForm(null);
    fetchData();
  };

  const getMainProfileName = (id: string) => {
    const mp = mainProfiles.find((m: any) => m.id === id);
    return mp?.name || "Unknown";
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Testimonials ({filteredTestimonials.length})
        </h1>
        <div className="flex gap-2">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:opacity-50"
            onClick={fetchData}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => {
              setShowForm(true);
              setIsEdit(false);
              setForm({
                main_profile_id: "",
                review_text: "",
                client_pic: "",
                client_name: "",
                client_designation: "",
                client_company: "",
                client_company_website: "",
                display_order: 0,
                video: "",
                linked_in: "",
                instagram: "",
              });
            }}
          >
            + Create
          </button>
        </div>
      </div>

      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-4 rounded-lg mb-6 flex gap-3 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="flex items-center border-2 border-gray-300 rounded-lg bg-white focus-within:border-blue-500">
            <Search size={18} className="text-gray-400 ml-3" />
            <input
              type="text"
              placeholder="Search by name, designation, company, LinkedIn, Instagram, review"
              value={search}
              onChange={handleSearch}
              className="flex-1 px-3 py-2 focus:outline-none rounded-lg"
            />
          </div>
        </div>
        <select
          value={selectedMainProfile}
          onChange={(e) => setSelectedMainProfile(e.target.value)}
          className="border-2 border-gray-300 px-4 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none bg-white hover:border-blue-400 transition"
        >
          <option value="">All Main Profiles</option>
          {mainProfiles.map((mp: any) => (
            <option key={mp.id} value={mp.id}>
              {mp.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg">Loading testimonials...</div>
        </div>
      ) : filteredTestimonials.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No testimonials found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTestimonials.map((t: any) => (
            <div
              key={t.id}
              className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4 flex-1">
                  {t.client_pic && (
                    <img
                      src={t.client_pic}
                      alt={t.client_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{t.client_name}</h3>
                      <span className="text-sm text-gray-500">
                        (Order: {t.display_order})
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {t.client_designation} at {t.client_company}
                    </div>
                    <div className="text-xs text-blue-600 mb-2">
                      Main Profile: {getMainProfileName(t.main_profile_id)}
                    </div>
                    {t.client_company_website && (
                      <a
                        href={t.client_company_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        {t.client_company_website}
                      </a>
                    )}
                    {(t.linked_in || t.instagram) && (
                      <div className="flex gap-3 mt-2 text-xs">
                        {t.linked_in && (
                          <a
                            href={t.linked_in}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                        {t.instagram && (
                          <a
                            href={t.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 hover:underline"
                          >
                            Instagram
                          </a>
                        )}
                      </div>
                    )}
                    <div
                      className="mt-3 text-sm text-gray-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: t.review_text }}
                    />
                  </div>
                </div>
                {t.video && (
                  <div className="ml-4">
                    <video
                      src={t.video}
                      controls
                      className="w-64 h-auto rounded shadow-md"
                    />
                  </div>
                )}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => handleEdit(t)}
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-2">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">
              {isEdit ? "Edit Testimonial" : "Create Testimonial"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">
                    Main Profile *
                  </label>
                  <select
                    name="main_profile_id"
                    value={form?.main_profile_id || ""}
                    onChange={handleFormChange}
                    required
                    className="w-full border px-3 py-2 rounded"
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
                  <label className="block text-sm font-semibold mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    name="client_name"
                    value={form?.client_name || ""}
                    onChange={handleFormChange}
                    required
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Client Designation *
                  </label>
                  <input
                    type="text"
                    name="client_designation"
                    value={form?.client_designation || ""}
                    onChange={handleFormChange}
                    required
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Client Company *
                  </label>
                  <input
                    type="text"
                    name="client_company"
                    value={form?.client_company || ""}
                    onChange={handleFormChange}
                    required
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Company Website
                  </label>
                  <input
                    type="url"
                    name="client_company_website"
                    value={form?.client_company_website || ""}
                    onChange={handleFormChange}
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    name="linked_in"
                    value={form?.linked_in || ""}
                    onChange={handleFormChange}
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Instagram
                  </label>
                  <input
                    type="url"
                    name="instagram"
                    value={form?.instagram || ""}
                    onChange={handleFormChange}
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">
                    Display Order *
                  </label>
                  <input
                    type="number"
                    name="display_order"
                    value={form?.display_order || 0}
                    onChange={handleFormChange}
                    required
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">
                    Client Picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "client_pic")}
                    className="w-full border px-3 py-2 rounded"
                  />
                  {form?.client_pic && (
                    <img
                      src={form.client_pic}
                      alt="Client"
                      className="mt-2 w-24 h-24 rounded-full object-cover"
                    />
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">
                    Video URL/File
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileChange(e, "video")}
                    className="w-full border px-3 py-2 rounded"
                  />
                  {form?.video && (
                    <div className="mt-2">
                      <video
                        src={form.video}
                        controls
                        className="w-full max-w-md rounded"
                      />
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">
                    Review Text *
                  </label>
                  <QuillEditor
                    value={form?.review_text || ""}
                    onChange={(value: string) =>
                      handleQuillChange("review_text", value)
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                  onClick={() => {
                    setShowForm(false);
                    setForm(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  {isEdit ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
