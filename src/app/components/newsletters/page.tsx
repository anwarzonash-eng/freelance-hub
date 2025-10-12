"use client";

import React, { useEffect, useState } from "react";
import TemplateEditor, { ParamsMap, NewsletterType } from "./templateEditor";
import {
  getALLNewsLetters,
  getNewsLettersByID,
  addNewsLettersByID,
  updateNewsLettersByID,
  deleteNewsLettersByID,
} from "@/app/api_handlers/api/newsletters.api";
import { IApiParams } from "@/app/api_handlers/api.interface";

type Newsletter = {
  id: string;
  title: string;
  type: NewsletterType;
  html: string;
  params: ParamsMap;
};

type newsletterProps = {
  isSelectMode;
  onClose?: () => void;
  handleNewsletterSelected?: (id: string) => void;
};

export default function NewsletterManager({
  isSelectMode,
  onClose,
  handleNewsletterSelected,
}: newsletterProps) {
  // useEffect(() => {
  //   alert(JSON.stringify(isSelectMode));
  // }, []);

  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [selected, setSelected] = useState<Newsletter | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editing, setEditing] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null); // id being deleted
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // fetch all newsletters
  const fetchNewsletters = async () => {
    setLoading(true);
    try {
      const res = await getALLNewsLetters();
      console.log(res);
      if (!res) {
        setLoading(false);
        return;
      }
      const data = res.data;

      const sanitized: Newsletter[] = data.map((n: any) => ({
        id: n.id?.toString() ?? "",
        title: n.title ?? "Untitled",
        type: (n.type as NewsletterType) ?? "student",
        html: n.html ?? "<p>No content</p>",
        params:
          typeof n.params === "object" && n.params !== null ? n.params : {},
      }));

      setNewsletters(sanitized);
    } catch (err: any) {
      console.error("Failed to fetch newsletters", err);
      setError("Failed to load newsletters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const filtered =
    filterType === "all"
      ? newsletters
      : newsletters.filter((n) => n.type === filterType);

  const handleAdd = () => {
    setEditing(null);
    setIsPopupOpen(true);
  };

  const handleEdit = async (nl: Newsletter) => {
    try {
      setSaving(true);
      const params: IApiParams = { path: { id: nl.id } };
      const res = await getNewsLettersByID(params);
      if (!res) {
        setSaving(false);
        return;
      }

      const fresh = res?.data ?? nl;
      setEditing(fresh);
      setIsPopupOpen(true);
    } catch (err) {
      console.error("Failed to load newsletter", err);
      alert("Error loading newsletter");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    setDeleting(id);

    try {
      const params: IApiParams = { path: { id: id } };

      const res = await deleteNewsLettersByID(params);
      if (!res) {
        setDeleting(null);
        return;
      }

      setNewsletters((prev) => prev.filter((n) => n.id !== id));
      if (selected?.id === id) setSelected(null);
      setMessage("Newsletter deleted successfully ✅");
    } catch (err) {
      console.error("Failed to delete newsletter", err);
      setError("Error deleting newsletter");
    } finally {
      setDeleting(null);
    }
  };

  const handleSelect = async (id: string) => {
    handleNewsletterSelected(id);
    onClose();
  };

  const handleSubmit = async (data: {
    html: string;
    title: string;
    type: NewsletterType;
    values: ParamsMap;
  }) => {
    setSaving(true);
    setMessage(null);
    setError(null);

    if (!data.title?.trim()) {
      setError("Title is required");
      setSaving(false);
      return;
    }

    try {
      if (editing) {
        const params: IApiParams = { path: { id: editing.id } };
        const payload: any = {
          title: data.title,
          type: data.type,
          html: data.html || "<p>No content</p>",
          params: data.values || {},
        };
        const res = await updateNewsLettersByID(payload, params);
        // const res = await fetch(
        //   `http://localhost:3001/newsletters/${editing.id}`,
        //   {
        //     method: "PUT",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify({
        //       title: data.title,
        //       type: data.type,
        //       html: data.html || "<p>No content</p>",
        //       params: data.values || {},
        //     }),
        //   }
        // );
        if (!res) {
          setSaving(false);
          return;
        }
        const updated = res?.data ?? null;

        if (updated) {
          setNewsletters((prev) =>
            prev.map((n) => (n.id === editing.id ? updated : n))
          );
        }
        setMessage("Newsletter updated successfully ✅");
      } else {
        const payload: any = {
          title: data.title,
          type: data.type,
          html: data.html || "<p>No content</p>",
          params: data.values || {},
        };
        const res = await addNewsLettersByID(payload);
        // const res = await fetch("http://localhost:3001/newsletters", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({
        //     title: data.title,
        //     type: data.type,
        //     html: data.html || "<p>No content</p>",
        //     params: data.values || {},
        //   }),
        // });
        if (!res) {
          setSaving(false);
          return;
        }
        const created = res?.data ?? null;

        if (created) {
          setNewsletters((prev) => [...prev, created]);
        }
        setMessage("Newsletter created successfully ✅");
      }
    } catch (err) {
      console.error("Save error", err);
      setError("Error saving newsletter");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 flex h-screen gap-4">
      {/* Left side: table */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-1 border rounded-md text-xs"
          >
            <option value="all">All Types</option>
            <option value="student">student</option>
            <option value="upwork">upwork</option>
            <option value="tech_stack_wise">tech_stack_wise</option>
            <option value="newly_created_domain">newly_created_domain</option>
            <option value="startups">startups</option>
          </select>
          {!isSelectMode && (
            <button
              onClick={handleAdd}
              className="px-2 py-1 text-xs border rounded-md"
            >
              Add
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-gray-500">Loading newsletters...</p>
        ) : error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : newsletters.length === 0 ? (
          <p className="text-xs text-gray-500">No newsletters found</p>
        ) : (
          <table className="border w-full text-xs">
            <thead>
              <tr>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Type</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr
                  key={n.id}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelected(n)}
                >
                  <td className="border px-2 py-1">{n.title}</td>
                  <td className="border px-2 py-1">{n.type}</td>
                  {!isSelectMode && (
                    <td className="border px-2 py-1 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(n);
                        }}
                        disabled={saving}
                        className="px-1 py-0.5 border rounded text-xs"
                      >
                        {saving && editing?.id === n.id ? "Loading..." : "Edit"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(n.id);
                        }}
                        disabled={deleting === n.id}
                        className="px-1 py-0.5 border rounded text-xs"
                      >
                        {deleting === n.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  )}{" "}
                  {isSelectMode && (
                    <td className="border px-2 py-1 flex gap-1 self-center">
                      <button
                        onClick={(e) => {
                          handleSelect(n.id);
                        }}
                        className="px-1 py-0.5 border rounded text-xs"
                      >
                        Select
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {message && <p className="text-xs text-green-600 mt-2">{message}</p>}
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      {/* Right side: preview */}
      <div className="w-[610px] border rounded-md p-2 overflow-auto bg-white">
        {selected ? (
          <div dangerouslySetInnerHTML={{ __html: selected.html }} />
        ) : (
          <p className="text-xs text-gray-500">
            Select a newsletter to preview
          </p>
        )}
      </div>

      {/* Template editor popup */}
      <TemplateEditor
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        initialHtml={editing?.html}
        initialTitle={editing?.title || ""}
        initialType={editing?.type}
        initialValues={editing?.params || {}}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
