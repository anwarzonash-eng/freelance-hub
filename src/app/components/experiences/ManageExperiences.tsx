"use client";
import React, { useState, useEffect } from "react";
import { X, Search, Copy } from "lucide-react";
import {
  getAllExperiences,
  createExperience,
  updateExperience,
  deleteExperience,
} from "@/app/api_handlers/api/experiences.api";
import { getALLMainProfiles } from "@/app/api_handlers/api/main_profiles.api";
import dynamic from "next/dynamic";
import { useImageViewer } from "../ImageViewer";
import { uploadPortfolioImage } from "@/app/api_handlers/api/portfolios.api";

const QuillEditor = dynamic(() => import("../QuillEditor"), { ssr: false });
const ImageViewer = dynamic(() => import("../ImageViewer"), { ssr: false });

export default function ManageExperiences() {
  const imageViewer = useImageViewer();
  const [experiences, setExperiences] = useState([]);
  const [mainProfiles, setMainProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMainProfile, setSelectedMainProfile] = useState("");
  const [selectedContentNature, setSelectedContentNature] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
    (async () => {
      const res = await getALLMainProfiles();
      if (Array.isArray(res)) setMainProfiles(res);
      else if (res?.data && Array.isArray(res.data)) setMainProfiles(res.data);
      else setMainProfiles([]);
    })();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const res = await getAllExperiences();
    setExperiences(res.data || []);
    setIsLoading(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // Frontend filtering only
  const filteredExperiences = experiences.filter((e: any) => {
    const matchesId = e.id?.toLowerCase().includes(search.toLowerCase());
    const matchesTitle = e.title?.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = e.company_name
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesWebsite = e.company_website
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesMainProfile = selectedMainProfile
      ? e.main_profile_id === selectedMainProfile
      : true;
    const matchesContentNature = selectedContentNature
      ? e.content_nature === selectedContentNature
      : true;
    return (
      (matchesId || matchesTitle || matchesCompany || matchesWebsite) &&
      matchesMainProfile &&
      matchesContentNature
    );
  });

  const formatDateTime = (value: any) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  };

  const handleEdit = (experience: any) => {
    // Ensure meta_data.job_types exists for edit
    let meta_data = experience.meta_data || {};
    if (!meta_data.job_types) {
      // Use external fields for all job_types
      const extStart = experience.starting_date
        ? new Date(experience.starting_date).toISOString().slice(0, 10)
        : "";
      const extEnd = experience.ending_Date
        ? new Date(experience.ending_Date).toISOString().slice(0, 10)
        : "";
      const extIsContinue = !!experience.working;
      const extType = experience.type || "";
      meta_data.job_types = {
        contract: {
          start_date: extStart,
          end_date: extEnd,
          is_continue: extIsContinue,
          type: extType,
          is_show: true,
          job_nature: "Onsite",
        },
        fulltime: {
          start_date: extStart,
          end_date: extEnd,
          is_continue: extIsContinue,
          type: extType,
          is_show: true,
          job_nature: "Onsite",
        },
        freelance: {
          start_date: extStart,
          end_date: extEnd,
          is_continue: extIsContinue,
          type: extType,
          is_show: true,
          job_nature: "Onsite",
        },
        startup: {
          start_date: extStart,
          end_date: extEnd,
          is_continue: extIsContinue,
          type: extType,
          is_show: true,
          job_nature: "Onsite",
        },
      };
    }
    setForm({
      ...experience,
      meta_data,
      expandedJobTypes: {
        contract: true,
        fulltime: false,
        freelance: false,
        startup: false,
      },
    });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this experience? This action cannot be undone.",
      )
    )
      return;
    await deleteExperience({ path: { id } });
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
      const res: any = await uploadPortfolioImage(formData);
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
    if (form.thumbnail && form.thumbnail.startsWith("blob:")) {
      alert("Please wait for the image to finish uploading.");
      return;
    }
    const confirmMessage = isEdit
      ? "Are you sure you want to update this experience?"
      : "Are you sure you want to create this experience?";
    if (!confirm(confirmMessage)) return;
    // Always send meta_data.job_types in payload
    // Ensure all job_types have is_show and job_nature
    const defaultJobType = {
      start_date: "",
      end_date: "",
      is_continue: false,
      type: "",
      is_show: true,
      job_nature: "Onsite",
    };
    const jobTypes = ["contract", "fulltime", "freelance", "startup"].reduce(
      (acc, jt) => {
        const jtData = form.meta_data?.job_types?.[jt] || {};
        acc[jt] = {
          ...defaultJobType,
          ...jtData,
          is_show: typeof jtData.is_show === "boolean" ? jtData.is_show : true,
          job_nature: jtData.job_nature || "Onsite",
        };
        return acc;
      },
      {} as any,
    );
    const payload = {
      ...form,
      meta_data: {
        ...(form.meta_data || {}),
        job_types: jobTypes,
      },
    };
    if (isEdit) {
      await updateExperience(payload, { path: { id: form.id } });
    } else {
      await createExperience(payload);
    }
    setShowForm(false);
    setForm(null);
    fetchData();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Experiences ({filteredExperiences.length})
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
              setShowForm(true);
              setIsEdit(false);
              setForm({
                meta_data: {
                  job_types: {
                    contract: {
                      start_date: "",
                      end_date: "",
                      is_continue: false,
                      type: "",
                      is_show: true,
                      job_nature: "Onsite",
                    },
                    fulltime: {
                      start_date: "",
                      end_date: "",
                      is_continue: false,
                      type: "",
                      is_show: true,
                      job_nature: "Onsite",
                    },
                    freelance: {
                      start_date: "",
                      end_date: "",
                      is_continue: false,
                      type: "",
                      is_show: true,
                      job_nature: "Onsite",
                    },
                    startup: {
                      start_date: "",
                      end_date: "",
                      is_continue: false,
                      type: "",
                      is_show: true,
                      job_nature: "Onsite",
                    },
                  },
                },
                expandedJobTypes: {
                  contract: true,
                  fulltime: false,
                  freelance: false,
                  startup: false,
                },
              });
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
            placeholder="Search by id, title, company name, website..."
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
        <select
          value={selectedContentNature}
          onChange={(e) => setSelectedContentNature(e.target.value)}
          className="border-2 border-gray-300 px-4 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none bg-white hover:border-blue-400 transition"
        >
          <option value="">All Content Nature</option>
          <option value="dynamic">Dynamic</option>
          <option value="static">Static</option>
          <option value="prototype">Prototype</option>
        </select>
      </div>
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg">Loading experiences...</div>
        </div>
      ) : filteredExperiences.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No experiences found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {[...filteredExperiences]
            .sort((a: any, b: any) => {
              const aTime = a?.starting_date
                ? new Date(a.starting_date).getTime()
                : 0;
              const bTime = b?.starting_date
                ? new Date(b.starting_date).getTime()
                : 0;
              return bTime - aTime;
            })
            .map((e: any) => (
              <div
                key={e.id}
                className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition hover:border-blue-300 flex"
              >
                <button
                  onClick={() =>
                    e.thumbnail && imageViewer.openViewer([e.thumbnail], 0)
                  }
                  className="shrink-0 w-32 h-32 bg-gray-100 cursor-pointer hover:opacity-80 transition overflow-hidden"
                >
                  {e.thumbnail ? (
                    <img
                      src={e.thumbnail}
                      alt={e.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                </button>
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-gray-800">
                        {e.title}
                      </h3>
                      <button
                        title="Copy ID"
                        className="ml-1 px-2 py-1 rounded bg-gray-200 hover:bg-blue-200 text-xs font-semibold transition border border-gray-300"
                        onClick={() => navigator.clipboard.writeText(e.id)}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    {e.private_title && (
                      <p className="text-sm text-gray-500 mb-2">
                        <span className="font-semibold">Private:</span>{" "}
                        {e.private_title}
                      </p>
                    )}
                    {e.company_name && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Company:</span>{" "}
                        {e.company_name}
                      </p>
                    )}
                    {e.type && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Type:</span>{" "}
                        {e.type === "full_time"
                          ? "Full Time"
                          : e.type === "contract"
                            ? "Contract"
                            : "Freelance"}
                      </p>
                    )}
                    {e.location && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Location:</span>{" "}
                        {e.location}
                      </p>
                    )}
                    {e.company_website && (
                      <p className="text-sm text-blue-600 mb-2">
                        <span className="font-semibold">Website:</span>{" "}
                        <a
                          href={e.company_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {e.company_website}
                        </a>
                      </p>
                    )}
                    {/* Show all job_types meta_data if present */}
                    {e.meta_data?.job_types && (
                      <div className="mt-2">
                        <div className="font-semibold text-blue-700 text-xs mb-1">
                          Job Types:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(e.meta_data.job_types).map(
                            ([jt, jtData]: any) => (
                              <div
                                key={jt}
                                className="border border-blue-200 rounded p-2 bg-blue-50"
                              >
                                <div className="font-bold text-blue-800 text-xs capitalize mb-1">
                                  {jt}
                                </div>
                                <div className="text-xs text-gray-700">
                                  <span className="font-semibold">Start:</span>{" "}
                                  {jtData.start_date || "-"}
                                  <br />
                                  <span className="font-semibold">
                                    End:
                                  </span>{" "}
                                  {jtData.end_date || "-"}
                                  <br />
                                  <span className="font-semibold">
                                    Continue:
                                  </span>{" "}
                                  {jtData.is_continue ? "Yes" : "No"}
                                  <br />
                                  <span className="font-semibold">
                                    Type:
                                  </span>{" "}
                                  {jtData.type || "-"}
                                  <br />
                                  <span className="font-semibold">
                                    Show:
                                  </span>{" "}
                                  {typeof jtData.is_show === "boolean"
                                    ? jtData.is_show
                                      ? "Yes"
                                      : "No"
                                    : "-"}
                                  <br />
                                  <span className="font-semibold">
                                    Job Nature:
                                  </span>{" "}
                                  {jtData.job_nature || "-"}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-600 font-semibold">
                      <span className="font-semibold">Working:</span>{" "}
                      {e.working ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex gap-2 p-4 items-center border-l-2 border-gray-200">
                  <button
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
                    onClick={() => handleEdit(e)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition shadow-md"
                    onClick={() => handleDelete(e.id)}
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
            className="bg-white w-full h-full max-w-full max-h-full rounded-lg shadow-2xl overflow-auto flex flex-col relative"
            onSubmit={handleSubmit}
          >
            <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
              <h2 className="text-3xl font-bold">
                {isEdit ? "Edit Experience" : "Create Experience"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(null);
                }}
                className="hover:bg-blue-800 p-2 rounded transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                {/* Job Types Meta Data Forms */}
                <div className="mb-8">
                  <h3 className="font-bold text-lg mb-2 text-blue-700">
                    Job Types Details
                  </h3>
                  {["contract", "fulltime", "freelance", "startup"].map(
                    (jt) => (
                      <div
                        key={jt}
                        className="mb-4 border rounded-lg border-blue-200 bg-blue-50"
                      >
                        <button
                          type="button"
                          className="w-full flex justify-between items-center px-4 py-2 font-semibold text-blue-800 hover:bg-blue-100 focus:outline-none"
                          onClick={() =>
                            setForm((prev: any) => ({
                              ...prev,
                              expandedJobTypes: {
                                ...(prev.expandedJobTypes || {}),
                                [jt]: !prev?.expandedJobTypes?.[jt],
                              },
                            }))
                          }
                        >
                          <span className="capitalize">{jt}</span>
                          <span>
                            {form?.expandedJobTypes?.[jt] ? "▲" : "▼"}
                          </span>
                        </button>
                        {form?.expandedJobTypes?.[jt] && (
                          <div className="px-4 pb-4 pt-2 grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div>
                              <label className="block text-gray-700 font-bold mb-1">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={
                                  form?.meta_data?.job_types?.[jt]
                                    ?.start_date || ""
                                }
                                onChange={(e) =>
                                  setForm((prev: any) => ({
                                    ...prev,
                                    meta_data: {
                                      ...(prev.meta_data || {}),
                                      job_types: {
                                        ...(prev.meta_data?.job_types || {}),
                                        [jt]: {
                                          ...(prev.meta_data?.job_types?.[jt] ||
                                            {}),
                                          start_date: e.target.value,
                                        },
                                      },
                                    },
                                  }))
                                }
                                className="w-full border-2 border-gray-300 px-2 py-1 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-700 font-bold mb-1">
                                End Date
                              </label>
                              <input
                                type="date"
                                value={
                                  form?.meta_data?.job_types?.[jt]?.end_date ||
                                  ""
                                }
                                onChange={(e) =>
                                  setForm((prev: any) => ({
                                    ...prev,
                                    meta_data: {
                                      ...(prev.meta_data || {}),
                                      job_types: {
                                        ...(prev.meta_data?.job_types || {}),
                                        [jt]: {
                                          ...(prev.meta_data?.job_types?.[jt] ||
                                            {}),
                                          end_date: e.target.value,
                                        },
                                      },
                                    },
                                  }))
                                }
                                className="w-full border-2 border-gray-300 px-2 py-1 rounded-lg"
                              />
                            </div>
                            <div className="flex items-center mt-6">
                              <input
                                type="checkbox"
                                checked={
                                  !!form?.meta_data?.job_types?.[jt]
                                    ?.is_continue
                                }
                                onChange={(e) =>
                                  setForm((prev: any) => ({
                                    ...prev,
                                    meta_data: {
                                      ...(prev.meta_data || {}),
                                      job_types: {
                                        ...(prev.meta_data?.job_types || {}),
                                        [jt]: {
                                          ...(prev.meta_data?.job_types?.[jt] ||
                                            {}),
                                          is_continue: e.target.checked,
                                        },
                                      },
                                    },
                                  }))
                                }
                                className="mr-2"
                              />
                              <label className="text-gray-700 font-bold">
                                Continue
                              </label>
                            </div>
                            <div>
                              <label className="block text-gray-700 font-bold mb-1">
                                Type
                              </label>
                              <select
                                value={
                                  form?.meta_data?.job_types?.[jt]?.type || ""
                                }
                                onChange={(e) =>
                                  setForm((prev: any) => ({
                                    ...prev,
                                    meta_data: {
                                      ...(prev.meta_data || {}),
                                      job_types: {
                                        ...(prev.meta_data?.job_types || {}),
                                        [jt]: {
                                          ...(prev.meta_data?.job_types?.[jt] ||
                                            {}),
                                          type: e.target.value,
                                        },
                                      },
                                    },
                                  }))
                                }
                                className="w-full border-2 border-gray-300 px-2 py-1 rounded-lg"
                              >
                                <option value="">Select Type</option>
                                <option value="full_time">Full Time</option>
                                <option value="contract">Contract</option>
                                <option value="freelance">Freelance</option>
                              </select>
                            </div>
                            <div className="flex items-center mt-6">
                              <input
                                type="checkbox"
                                checked={
                                  !!form?.meta_data?.job_types?.[jt]?.is_show
                                }
                                onChange={(e) =>
                                  setForm((prev: any) => ({
                                    ...prev,
                                    meta_data: {
                                      ...(prev.meta_data || {}),
                                      job_types: {
                                        ...(prev.meta_data?.job_types || {}),
                                        [jt]: {
                                          ...(prev.meta_data?.job_types?.[jt] ||
                                            {}),
                                          is_show: e.target.checked,
                                        },
                                      },
                                    },
                                  }))
                                }
                                className="mr-2"
                              />
                              <label className="text-gray-700 font-bold">
                                Show
                              </label>
                            </div>
                            <div>
                              <label className="block text-gray-700 font-bold mb-1">
                                Job Nature
                              </label>
                              <select
                                value={
                                  form?.meta_data?.job_types?.[jt]
                                    ?.job_nature || "Onsite"
                                }
                                onChange={(e) =>
                                  setForm((prev: any) => ({
                                    ...prev,
                                    meta_data: {
                                      ...(prev.meta_data || {}),
                                      job_types: {
                                        ...(prev.meta_data?.job_types || {}),
                                        [jt]: {
                                          ...(prev.meta_data?.job_types?.[jt] ||
                                            {}),
                                          job_nature: e.target.value,
                                        },
                                      },
                                    },
                                  }))
                                }
                                className="w-full border-2 border-gray-300 px-2 py-1 rounded-lg"
                              >
                                <option value="Onsite">Onsite</option>
                                <option value="Hybrid">Hybrid</option>
                                <option value="Remote">Remote</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    ),
                  )}

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
                      Company Name
                    </label>
                    <input
                      name="company_name"
                      value={form?.company_name || ""}
                      onChange={handleFormChange}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Company Website
                    </label>
                    <input
                      name="company_website"
                      value={form?.company_website || ""}
                      onChange={handleFormChange}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Company LinkedIn
                    </label>
                    <input
                      name="company_linkedIn"
                      value={form?.company_linkedIn || ""}
                      onChange={handleFormChange}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      name="type"
                      value={form?.type || ""}
                      onChange={handleFormChange}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Type</option>
                      <option value="full_time">Full Time</option>
                      <option value="contract">Contract</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      name="location"
                      value={form?.location || ""}
                      onChange={handleFormChange}
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Starting Date
                    </label>
                    <input
                      name="starting_date"
                      type="datetime-local"
                      value={
                        form?.starting_date
                          ? new Date(form.starting_date)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setForm((prev: any) => ({
                          ...prev,
                          starting_date: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        }))
                      }
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">
                      Ending Date
                    </label>
                    <input
                      name="ending_Date"
                      type="datetime-local"
                      value={
                        form?.ending_Date
                          ? new Date(form.ending_Date)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setForm((prev: any) => ({
                          ...prev,
                          ending_Date: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        }))
                      }
                      className="w-full border-2 border-gray-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mb-6">
                  <label className="inline-flex items-center gap-2 font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!form?.working}
                      onChange={(e) =>
                        setForm((prev: any) => ({
                          ...prev,
                          working: e.target.checked,
                        }))
                      }
                      className="w-5 h-5"
                    />
                    Working
                  </label>
                </div>
                <div className="mb-6">
                  <label className="block font-bold text-gray-700 mb-2">
                    Thumbnail (max 2MB)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
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
                <div className="mb-6">
                  <label className="block font-bold text-gray-700 mb-2">
                    Short Description
                  </label>
                  <QuillEditor
                    value={form?.short_description || ""}
                    onChange={(val: string) =>
                      handleQuillChange("short_description", val)
                    }
                  />
                </div>
                <div className="mb-6">
                  <label className="block font-bold text-gray-700 mb-2">
                    Long Description
                  </label>
                  <QuillEditor
                    value={form?.long_description || ""}
                    onChange={(val: string) =>
                      handleQuillChange("long_description", val)
                    }
                  />
                </div>
                <div className="mb-6">
                  <label className="block font-bold text-gray-700 mb-2">
                    App Worked Description
                  </label>
                  <QuillEditor
                    value={form?.app_worked_description || ""}
                    onChange={(val: string) =>
                      handleQuillChange("app_worked_description", val)
                    }
                  />
                </div>
                <div className="mb-6">
                  <label className="block font-bold text-gray-700 mb-2">
                    Tech Descriptions
                  </label>
                  <QuillEditor
                    value={form?.tech_descriptions || ""}
                    onChange={(val: string) =>
                      handleQuillChange("tech_descriptions", val)
                    }
                  />
                </div>
              </div>
            </div>
            <div className="bg-gray-100 border-t-2 border-gray-200 p-6 flex gap-3 justify-end">
              <button
                type="button"
                className="bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-500 transition"
                onClick={() => {
                  setShowForm(false);
                  setForm(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {isEdit ? "Update Experience" : "Create Experience"}
              </button>
            </div>
          </form>
        </div>
      )}
      <ImageViewer />
    </div>
  );
}
