"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  getAllEducations,
  createEducation,
  updateEducation,
  deleteEducation,
  uploadEducationImage,
} from "@/app/api_handlers/api/educations.api";
import { getALLMainProfiles } from "@/app/api_handlers/api/main_profiles.api";
import ImageViewer, { useImageViewer } from "../ImageViewer";

const QuillEditor = dynamic(() => import("../QuillEditor"), { ssr: false });

export default function ManageEducations() {
  const imageViewer = useImageViewer();
  const [educations, setEducations] = useState([]);
  const [mainProfiles, setMainProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMainProfile, setSelectedMainProfile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
    // Always fetch main profiles fresh and handle both .data and direct array
    (async () => {
      const res = await getALLMainProfiles();
      if (Array.isArray(res)) setMainProfiles(res);
      else if (res?.data && Array.isArray(res.data)) setMainProfiles(res.data);
      else setMainProfiles([]);
    })();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const res = await getAllEducations();
    setEducations(res.data || []);
    setIsLoading(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredEducations = educations.filter((e: any) => {
    const matchesId = e.id?.toLowerCase().includes(search.toLowerCase());
    const matchesUniversity = e.university_name
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesTitle = e.private_title
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesDegree = e.degree_name
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesMainProfile = selectedMainProfile
      ? e.main_profile_id === selectedMainProfile
      : true;
    return (
      (matchesId || matchesUniversity || matchesTitle || matchesDegree) &&
      matchesMainProfile
    );
  });

  const handleEdit = (education: any) => {
    setForm({ ...education });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this education? This action cannot be undone."
      )
    ) {
      return;
    }
    await deleteEducation({ path: { id } });
    fetchData();
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: any) => {
    const files = Array.from(e.target.files) as File[];
    if (files.length === 0) return;
    // Show preview immediately
    const localUrl = URL.createObjectURL(files[0]);
    setForm((prev: any) => ({ ...prev, thumbnail: localUrl }));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res: any = await uploadEducationImage(formData);
      if (res?.data?.url) {
        setForm((prev: any) => ({ ...prev, thumbnail: res.data.url }));
      } else if (res?.url) {
        setForm((prev: any) => ({ ...prev, thumbnail: res.url }));
      }
    } catch (error) {}
    setUploading(false);
  };

  const handleQuillChange = (field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (uploading) {
      alert("Please wait for the image to finish uploading.");
      return;
    }
    // Prevent submitting if thumbnail is still a blob URL
    if (form.thumbnail && form.thumbnail.startsWith("blob:")) {
      alert("Please wait for the image to finish uploading.");
      return;
    }
    const confirmMessage = isEdit
      ? "Are you sure you want to update this education?"
      : "Are you sure you want to create this education?";
    if (!confirm(confirmMessage)) {
      return;
    }
    if (isEdit) {
      await updateEducation(form, { path: { id: form.id } });
    } else {
      await createEducation(form);
    }
    setShowForm(false);
    setForm(null);
    fetchData();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Educations ({filteredEducations.length})
        </h1>
        <div className="flex gap-2">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-semibold disabled:opacity-50"
            onClick={fetchData}
            disabled={isLoading}
          >
            Refresh
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => {
              setForm({
                university_name: "",
                private_title: "",
                thumbnail: "",
                university_website_link: "",
                main_profile_id: "",
                degree_name: "",
                degree_description: "",
                degree_start_date: "",
                degree_end_date: "",
              });
              setIsEdit(false);
              setShowForm(true);
            }}
          >
            + Create
          </button>
        </div>
      </div>
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-4 rounded-lg mb-6 flex gap-3 flex-wrap">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by university, id, title, degree..."
            className="border-2 border-gray-300 px-4 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none bg-white hover:border-blue-400 transition"
          />
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
          <div className="text-gray-500 text-lg">Loading educations...</div>
        </div>
      ) : filteredEducations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No educations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEducations.map((e: any) => (
            <div
              key={e.id}
              className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition hover:border-blue-300 flex"
            >
              <div className="flex-1 p-4">
                <div className="font-bold text-lg mb-2">
                  {e.university_name}
                </div>
                <div className="text-gray-600 mb-1">{e.private_title}</div>
                <div className="text-gray-500 mb-1">
                  Degree: {e.degree_name}
                </div>
                <div className="text-gray-500 mb-1">
                  Main Profile:{" "}
                  {mainProfiles.find((mp) => mp.id === e.main_profile_id)
                    ?.name || e.main_profile_id}
                </div>
                <div className="text-gray-500 mb-1">
                  Start: {e.degree_start_date} End: {e.degree_end_date}
                </div>
                <div
                  className="mb-2"
                  dangerouslySetInnerHTML={{
                    __html: e.degree_description || "",
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() => imageViewer.openViewer([e.thumbnail])}
                  >
                    View Image
                  </button>
                  <button
                    className="bg-yellow-500 text-white px-3 py-1 rounded"
                    onClick={() => handleEdit(e)}
                  >
                    Edit
                  </button>
                  {/* <button
                    className="bg-red-500 text-white px-3 py-1 rounded"
                    onClick={() => handleDelete(e.id)}
                  >
                    Delete
                  </button> */}
                </div>
              </div>
              <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                {e.thumbnail && (
                  <img
                    src={e.thumbnail}
                    alt="Thumbnail"
                    className="max-w-full max-h-full object-contain cursor-pointer"
                    onClick={() => imageViewer.openViewer([e.thumbnail])}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-2">
          <form
            className="bg-white w-full h-full max-w-full max-h-full rounded-lg shadow-2xl overflow-auto flex flex-col relative"
            onSubmit={handleSubmit}
          >
            <button
              type="button"
              className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-full z-10"
              onClick={() => setShowForm(false)}
              title="Close"
            >
              &#10005;
            </button>
            <div className="p-6 flex flex-col gap-3">
              <h2 className="text-xl font-bold mb-2">
                {isEdit ? "Edit" : "Add"} Education
              </h2>
              <label>University Name</label>
              <input
                name="university_name"
                value={form.university_name}
                onChange={handleFormChange}
                className="border px-2 py-1 rounded"
              />
              <label>Private Title</label>
              <input
                name="private_title"
                value={form.private_title}
                onChange={handleFormChange}
                className="border px-2 py-1 rounded"
              />
              <label>Thumbnail</label>
              <input type="file" accept="image/*" onChange={handleFileChange} />
              {form.thumbnail && (
                <img
                  src={form.thumbnail}
                  alt="Thumbnail"
                  className="max-w-full max-h-32 object-contain"
                />
              )}
              <label>University Website Link</label>
              <input
                name="university_website_link"
                value={form.university_website_link}
                onChange={handleFormChange}
                className="border px-2 py-1 rounded"
              />
              <label>Main Profile</label>
              <select
                name="main_profile_id"
                value={form.main_profile_id}
                onChange={handleFormChange}
                className="border px-2 py-1 rounded"
              >
                <option value="">Select...</option>
                {mainProfiles.map((mp) => (
                  <option key={mp.id} value={mp.id}>
                    {mp.name}
                  </option>
                ))}
              </select>
              <label>Degree Name</label>
              <input
                name="degree_name"
                value={form.degree_name}
                onChange={handleFormChange}
                className="border px-2 py-1 rounded"
              />
              <label>Degree Description (HTML)</label>
              <QuillEditor
                value={form.degree_description}
                onChange={(val) => handleQuillChange("degree_description", val)}
              />
              <label>Degree Start Date</label>
              <input
                name="degree_start_date"
                value={form.degree_start_date}
                onChange={handleFormChange}
                className="border px-2 py-1 rounded"
              />
              <label>Degree End Date</label>
              <input
                name="degree_end_date"
                value={form.degree_end_date}
                onChange={handleFormChange}
                className="border px-2 py-1 rounded"
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  disabled={
                    uploading ||
                    (form.thumbnail && form.thumbnail.startsWith("blob:"))
                  }
                >
                  {uploading ? "Uploading..." : isEdit ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      <ImageViewer />
    </div>
  );
}
