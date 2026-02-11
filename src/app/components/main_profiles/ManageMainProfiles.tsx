"use client";
import { uploadPortfolioImage } from "@/app/api_handlers/api/portfolios.api";
import React, { useEffect, useState } from "react";
import {
  getALLMainProfiles,
  createMainProfile,
  updateMainProfile,
  deleteMainProfile,
} from "@/app/api_handlers/api/main_profiles.api";

// Fullscreen popup modal
function Popup({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full h-full max-w-none max-h-none overflow-y-auto relative flex flex-col">
        <button
          className="absolute top-4 right-6 text-3xl text-gray-500 hover:text-gray-800 z-10"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex-1 flex flex-col justify-center">{children}</div>
      </div>
    </div>
  );
}

export default function ManageMainProfiles() {
  // Ensure FontAwesome CSS is loaded for icons
  useEffect(() => {
    const id = "fa-cdn-stylesheet";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }
  }, []);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const [uploading, setUploading] = useState<any>({});
  const [previewError, setPreviewError] = useState<any>({});
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);

  const colorFields = [
    "color1",
    "color2",
    "color3",
    "color4",
    "primary_color",
    "page_bg_color",
    "banner_bg_color",
    "section_bg_color",
    "heading_color",
    "paragrapgh1_color",
    "paragrapgh2_color",
    "border_color",
  ];

  const iconMap = {
    domain: {
      icon: "fas fa-globe", // FontAwesome 5 solid
      getHref: (profile) =>
        profile.domain
          ? profile.domain.startsWith("http")
            ? profile.domain
            : `https://${profile.domain}`
          : null,
    },
    email: {
      icon: "fas fa-envelope",
      getHref: (profile) => (profile.email ? `mailto:${profile.email}` : null),
    },
    whatsapp: {
      icon: "fab fa-whatsapp",
      getHref: (profile) =>
        profile.phone_no
          ? `https://wa.me/${profile.phone_no.replace(/[^\d]/g, "")}`
          : null,
      color: "#25D366",
    },
    linkedIn: {
      icon: "fab fa-linkedin-in",
      getHref: (profile) => profile.linkedIn || null,
      color: "#0077b5",
    },
    facebook: {
      icon: "fab fa-facebook-f",
      getHref: (profile) => profile.facebook || null,
      color: "#1877f3",
    },
    twitter: {
      icon: "fab fa-twitter",
      getHref: (profile) => profile.twitter || null,
      color: "#1da1f2",
    },
    behance_link: {
      icon: "fab fa-behance",
      getHref: (profile) => profile.behance_link || null,
      color: "#1769ff",
    },
    instagram: {
      icon: "fab fa-instagram",
      getHref: (profile) => profile.instagram || null,
      color: "#e1306c",
    },
    upwork: {
      icon: "fab fa-upwork",
      getHref: (profile) => profile.upwork || null,
      color: "#6fda44",
    },
    github: {
      icon: "fab fa-github",
      getHref: (profile) => profile.github || null,
      color: "#333",
    },
    phone_no: {
      icon: "fas fa-phone",
      getHref: (profile) =>
        profile.phone_no ? `tel:${profile.phone_no}` : null,
      color: "#d93025",
    },
    location: {
      icon: "fas fa-map-marker-alt",
      getHref: (profile) =>
        profile.location
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              profile.location,
            )}`
          : null,
      color: "#ea4335",
    },
    calendly_link: {
      icon: "fas fa-calendar-alt",
      getHref: (profile) => profile.calendly_link || null,
      color: "#f87171",
    },
  };

  // Open popup for add
  const handleAdd = () => {
    setForm({});
    setIsEdit(false);
    setEditId(null);
    setShowPopup(true);
  };

  // Open popup for edit
  const handleEdit = (profile) => {
    setForm({ ...profile });
    setIsEdit(true);
    setEditId(profile.id);
    setShowPopup(true);
  };

  // Handle form field change and upload for images/videos
  const handleFormChange = async (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file" && files && files[0]) {
      setUploading((prev) => ({ ...prev, [name]: true }));
      setPreviewError((prev) => ({ ...prev, [name]: false }));
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await uploadPortfolioImage(formData);
        if (res?.data?.url) {
          setForm((prev) => ({ ...prev, [name]: res.data.url }));
        } else {
          const url = URL.createObjectURL(file);
          setForm((prev) => ({ ...prev, [name]: url }));
        }
      } catch {
        const url = URL.createObjectURL(file);
        setForm((prev) => ({ ...prev, [name]: url }));
      } finally {
        setUploading((prev) => ({ ...prev, [name]: false }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Save (add or update)
  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isEdit && editId) {
        await updateMainProfile(form, editId);
      } else {
        await createMainProfile(form);
      }
      // Refresh list
      const res = await getALLMainProfiles();
      setProfiles(res?.data || []);
      setShowPopup(false);
    } finally {
      setBusy(false);
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this profile?"))
      return;
    setBusy(true);
    try {
      await deleteMainProfile(id);
      const res = await getALLMainProfiles();
      setProfiles(res?.data || []);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    getALLMainProfiles().then((res) => {
      setProfiles(res?.data || []);
      setLoading(false);
    });
  }, []);

  const filteredProfiles = profiles.filter((profile) => {
    const q = search.toLowerCase();
    return (
      (profile.id && profile.id.toLowerCase().includes(q)) ||
      (profile.domain && profile.domain.toLowerCase().includes(q)) ||
      (profile.name && profile.name.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">
        Main Profiles
      </h1>
      <div className="mb-6 flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search by ID, domain, or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
          onClick={handleAdd}
        >
          + Add Main Profile
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          onClick={async () => {
            setLoading(true);
            const res = await getALLMainProfiles();
            setProfiles(res?.data || []);
            setLoading(false);
          }}
          title="Refresh List"
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {filteredProfiles.map((profile) => (
          <div
            key={profile.id}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 flex flex-col items-stretch relative transition-transform hover:scale-[1.025] hover:shadow-2xl"
          >
            {/* Top Banner */}
            <div
              className="rounded-t-2xl h-6 w-full"
              style={{ background: profile.banner_bg_color || "#f3f4f6" }}
            ></div>
            {/* Profile Image */}
            <div className="flex flex-col items-center -mt-10">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100 flex items-center justify-center">
                {profile.profile_photo_1 ? (
                  <img
                    src={profile.profile_photo_1}
                    alt={profile.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
                    <i className="fa-solid fa-user"></i>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="text-lg font-bold text-gray-900 text-center truncate max-w-[120px]"
                  title={profile.name}
                >
                  {profile.name}
                </span>
                <button
                  title="Copy ID"
                  className="ml-1 px-2 py-1 rounded bg-gray-100 hover:bg-blue-200 text-xs font-semibold border border-gray-300"
                  onClick={() => navigator.clipboard.writeText(profile.id)}
                >
                  ID
                </button>
                <button
                  title="Copy Domain"
                  className="ml-1 px-2 py-1 rounded bg-gray-100 hover:bg-blue-200 text-xs font-semibold border border-gray-300"
                  onClick={() =>
                    profile.domain &&
                    navigator.clipboard.writeText(profile.domain)
                  }
                  disabled={!profile.domain}
                >
                  Domain
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  className="px-3 py-1 rounded bg-yellow-100 hover:bg-yellow-200 text-xs font-semibold border border-yellow-300"
                  onClick={() => handleEdit(profile)}
                >
                  Edit
                </button>
                {/* <button
                  className="px-3 py-1 rounded bg-red-100 hover:bg-red-200 text-xs font-semibold border border-red-300"
                  onClick={() => handleDelete(profile.id)}
                  disabled={busy}
                >
                  Delete
                </button> */}
              </div>
            </div>
            {/* Hourly Rate & Colors */}
            <div className="flex flex-col items-center mt-3 px-4">
              <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold rounded px-3 py-1 border border-blue-200 mb-2">
                Hourly Rate: {profile.hourly_rate}
              </span>
              <div className="flex gap-1 mb-2 flex-wrap justify-center">
                {colorFields.map((field) =>
                  profile[field] ? (
                    <span
                      key={field}
                      title={field}
                      className="w-5 h-4 rounded border border-gray-300"
                      style={{ background: profile[field] }}
                    ></span>
                  ) : null,
                )}
              </div>
            </div>
            {/* Social Icons */}
            <div className="flex gap-2 text-lg mb-2 flex-wrap justify-center px-4 mt-1">
              {Object.entries(iconMap).map(([field, value]) => {
                const { icon, getHref } = value;
                const color = (value as any).color;
                const href = getHref(profile);
                if (!href) return null;
                return (
                  <a
                    key={field}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-red-900"
                    title={field.replace(/_/g, " ")}
                    style={color ? { color } : {}}
                  >
                    <i className={icon}></i>
                  </a>
                );
              })}
            </div>
            {/* Details Section */}
            <div className="w-full mt-2 text-xs text-gray-700 px-4 pb-4">
              <div className="flex flex-col gap-1">
                <div>
                  <span className="font-semibold">Domain:</span>{" "}
                  <span className="text-gray-900">{profile.domain || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold">Email:</span>{" "}
                  <span className="text-gray-900">{profile.email || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold">Non-Business Email:</span>{" "}
                  <span className="text-gray-900">
                    {profile.non_business_email || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Tagline:</span>{" "}
                  <span className="text-gray-900">
                    {profile.home_page_tagline || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Location:</span>{" "}
                  <span className="text-gray-900">
                    {profile.location || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Company Type:</span>{" "}
                  <span className="text-gray-900">
                    {profile.companytype || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Experiences:</span>{" "}
                  <span className="text-gray-900">
                    {profile.no_of_experiences || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Projects Completed:</span>{" "}
                  <span className="text-gray-900">
                    {profile.projects_completed || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Popup for add/edit */}
      <Popup open={showPopup} onClose={() => setShowPopup(false)}>
        <h2 className="text-xl font-bold mb-4">
          {isEdit ? "Edit" : "Add"} Main Profile
        </h2>
        <form onSubmit={handleSave} className="space-y-3">
          {/* Basic Info */}
          <div className="mb-2">
            <label className="block font-semibold mb-1">Name</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="name"
              value={form.name || ""}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Domain</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="domain"
              value={form.domain || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Email</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="email"
              value={form.email || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">
              Non-Business Email
            </label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="non_business_email"
              value={form.non_business_email || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Location</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="location"
              value={form.location || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Tagline</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="home_page_tagline"
              value={form.home_page_tagline || ""}
              onChange={handleFormChange}
            />
          </div>

          {/* Media */}
          <div className="mb-2 pt-2 border-t">
            <label className="block font-semibold mb-1">Profile Photo 1</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                name="profile_photo_1"
                onChange={handleFormChange}
              />
              {uploading.profile_photo_1 && (
                <span className="text-xs text-blue-600">Uploading...</span>
              )}
              {form.profile_photo_1 &&
                !uploading.profile_photo_1 &&
                !previewError.profile_photo_1 && (
                  <img
                    src={form.profile_photo_1}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded border"
                    onError={() =>
                      setPreviewError((prev) => ({
                        ...prev,
                        profile_photo_1: true,
                      }))
                    }
                  />
                )}
              {previewError.profile_photo_1 && (
                <span className="text-xs text-red-600">
                  Image failed to load
                </span>
              )}
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Profile Photo 2</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                name="profile_photo_2"
                onChange={handleFormChange}
              />
              {uploading.profile_photo_2 && (
                <span className="text-xs text-blue-600">Uploading...</span>
              )}
              {form.profile_photo_2 &&
                !uploading.profile_photo_2 &&
                !previewError.profile_photo_2 && (
                  <img
                    src={form.profile_photo_2}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded border"
                    onError={() =>
                      setPreviewError((prev) => ({
                        ...prev,
                        profile_photo_2: true,
                      }))
                    }
                  />
                )}
              {previewError.profile_photo_2 && (
                <span className="text-xs text-red-600">
                  Image failed to load
                </span>
              )}
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Profile Photo 3</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                name="profile_photo_3"
                onChange={handleFormChange}
              />
              {uploading.profile_photo_3 && (
                <span className="text-xs text-blue-600">Uploading...</span>
              )}
              {form.profile_photo_3 &&
                !uploading.profile_photo_3 &&
                !previewError.profile_photo_3 && (
                  <img
                    src={form.profile_photo_3}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded border"
                    onError={() =>
                      setPreviewError((prev) => ({
                        ...prev,
                        profile_photo_3: true,
                      }))
                    }
                  />
                )}
              {previewError.profile_photo_3 && (
                <span className="text-xs text-red-600">
                  Image failed to load
                </span>
              )}
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Banner Image</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                name="banner_image"
                onChange={handleFormChange}
              />
              {uploading.banner_image && (
                <span className="text-xs text-blue-600">Uploading...</span>
              )}
              {form.banner_image &&
                !uploading.banner_image &&
                !previewError.banner_image && (
                  <img
                    src={form.banner_image}
                    alt="Preview"
                    className="w-16 h-12 object-cover rounded border"
                    onError={() =>
                      setPreviewError((prev) => ({
                        ...prev,
                        banner_image: true,
                      }))
                    }
                  />
                )}
              {previewError.banner_image && (
                <span className="text-xs text-red-600">
                  Image failed to load
                </span>
              )}
            </div>
            {/* Video */}
            <div className="mb-2">
              <label className="block font-semibold mb-1">Profile Video</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="video/*"
                  name="video"
                  onChange={handleFormChange}
                />
                {uploading.video && (
                  <span className="text-xs text-blue-600">Uploading...</span>
                )}
                {form.video && !uploading.video && !previewError.video && (
                  <video
                    src={form.video}
                    className="w-32 h-20 object-cover rounded border"
                    controls
                    onError={() =>
                      setPreviewError((prev) => ({ ...prev, video: true }))
                    }
                  />
                )}
                {previewError.video && (
                  <span className="text-xs text-red-600">
                    Video failed to load
                  </span>
                )}
              </div>
              <input
                className="w-full border px-3 py-2 rounded mt-2"
                name="video"
                placeholder="Or paste video URL..."
                value={form.video || ""}
                onChange={handleFormChange}
              />
            </div>
          </div>

          {/* Social & Contact */}
          <div className="mb-2 pt-2 border-t">
            <label className="block font-semibold mb-1">Phone Number</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="phone_no"
              value={form.phone_no || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">LinkedIn</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="linkedIn"
              value={form.linkedIn || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Facebook</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="facebook"
              value={form.facebook || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Twitter</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="twitter"
              value={form.twitter || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Behance</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="behance_link"
              value={form.behance_link || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Instagram</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="instagram"
              value={form.instagram || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Upwork</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="upwork"
              value={form.upwork || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">GitHub</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="github"
              value={form.github || ""}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Calendly</label>
            <input
              className="w-full border px-3 py-2 rounded"
              name="calendly_link"
              value={form.calendly_link || ""}
              onChange={handleFormChange}
            />
          </div>

          {/* Colors */}
          <div className="mb-2 pt-2 border-t">
            <label className="block font-semibold mb-1">Banner BG Color</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="banner_bg_color"
                value={form.banner_bg_color || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.banner_bg_color || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="primary_color"
                value={form.primary_color || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.primary_color || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Color 1</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="color1"
                value={form.color1 || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.color1 || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Color 2</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="color2"
                value={form.color2 || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.color2 || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Color 3</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="color3"
                value={form.color3 || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.color3 || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Color 4</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="color4"
                value={form.color4 || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.color4 || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Page BG Color</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="page_bg_color"
                value={form.page_bg_color || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.page_bg_color || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Section BG Color</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="section_bg_color"
                value={form.section_bg_color || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.section_bg_color || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Heading Color</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="heading_color"
                value={form.heading_color || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.heading_color || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">
              Paragraph 1 Color
            </label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="paragrapgh1_color"
                value={form.paragrapgh1_color || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.paragrapgh1_color || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">
              Paragraph 2 Color
            </label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="paragrapgh2_color"
                value={form.paragrapgh2_color || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.paragrapgh2_color || "#fff" }}
              ></span>
            </div>
          </div>
          <div className="mb-2">
            <label className="block font-semibold mb-1">Border Color</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border px-3 py-2 rounded"
                name="border_color"
                value={form.border_color || ""}
                onChange={handleFormChange}
                placeholder="#RRGGBB"
                maxLength={7}
              />
              <span
                className="inline-block w-6 h-6 rounded border"
                style={{ background: form.border_color || "#fff" }}
              ></span>
            </div>
          </div>

          {/* About */}
          <div className="mb-2 pt-2 border-t">
            <label className="block font-semibold mb-1">About</label>
            <textarea
              className="w-full border px-3 py-2 rounded"
              name="about"
              value={form.about || ""}
              onChange={handleFormChange}
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              onClick={() => setShowPopup(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              disabled={busy}
            >
              {busy ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Popup>
    </div>
  );
}
