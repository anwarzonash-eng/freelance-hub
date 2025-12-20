"use client";
import { useState, useEffect } from "react";
import { getALLMainProfiles } from "../api_handlers/api/main_profiles.api";
import {
  addFAQs,
  deleteFAQsByID,
  getALLFAQs,
  updateFAQsByID,
} from "../api_handlers/api/faq.api";
import { IApiParams } from "../api_handlers/api.interface";

export default function FAQPage() {
  const [list, setList] = useState(null);
  const [filteredList, setFilteredList] = useState(null);

  const [mainProfile, setMainProfile] = useState("");
  const [mainProfiles, setMainProfiles] = useState([]);
  const [selectedFAQ, setSelectedFAQ] = useState(null);

  const [form, setForm] = useState({
    main_profile_id: "",
    index: 0,
    question: "",
    answer: "",
    type: "all",
    altName: "",
    is_upwork_allowed: false,
  });

  const [faqSearch, setFaqSearch] = useState("");
  useEffect(() => {
    let filtered = list;
    if (list) {
      filtered = list.filter((i) => {
        const matchesProfile = mainProfile === String(i.main_profile_id);
        const searchLower = faqSearch.toLowerCase();
        const matchesSearch =
          i.id?.toLowerCase().includes(searchLower) ||
          i.question?.toLowerCase().includes(searchLower) ||
          i.answer?.toLowerCase().includes(searchLower);
        return matchesProfile && (!faqSearch || matchesSearch);
      });
    }
    setFilteredList(filtered);
  }, [list, mainProfile, faqSearch]);

  const loadFaqs = async () => {
    const res = await getALLFAQs();
    console.log(res);
    if (res) {
      setList(res.data);
    }
  };
  const loadMainProfiles = async () => {
    const res = await getALLMainProfiles();
    if (res && res.data && res.data.length > 0) {
      setMainProfiles(res.data);
      // Set first profile as default
      const firstProfileId = res.data[0].id;
      setMainProfile(firstProfileId);
      setForm((prev) => ({
        ...prev,
        main_profile_id: firstProfileId,
      }));
    }
  };

  useEffect(() => {
    loadFaqs();
    loadMainProfiles();
  }, []);

  const save = async () => {
    const confirmMessage = selectedFAQ
      ? "Are you sure you want to update this FAQ?"
      : "Are you sure you want to create this FAQ?";

    if (!confirm(confirmMessage)) {
      return;
    }

    let res = null;
    let params: IApiParams = null;

    if (selectedFAQ) {
      params = { path: { id: selectedFAQ } };
      res = await updateFAQsByID(form, params);
    } else res = await addFAQs(form);

    if (res) {
      loadFaqs();
      clearForm();
    }
  };
  function clearForm() {
    setSelectedFAQ(null);
    setForm({
      main_profile_id: mainProfile,
      index: 0,
      question: "",
      answer: "",
      type: "all",
      altName: "",
      is_upwork_allowed: false,
    });
  }

  const remove = async (id) => {
    if (
      !confirm(
        "Are you sure you want to delete this FAQ? This action cannot be undone."
      )
    ) {
      return;
    }

    const params = { path: { id: id } };
    const res = await deleteFAQsByID(params);

    if (res) {
      loadFaqs();
    }
  };

  const update = async (payload) => {
    setSelectedFAQ(payload.id);
    setForm({
      main_profile_id: mainProfile,
      index: payload.index,
      question: payload.question,
      answer: payload.answer,
      type: payload.type,
      altName: payload.altName,
      is_upwork_allowed: payload.is_upwork_allowed,
    });
  };

  return (
    <div
      style={{
        padding: 40,
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ marginBottom: 20 }}>FAQ Manager</h1>

      <div
        style={{
          background: "#f9f9f9",
          padding: 20,
          borderRadius: 8,
          marginBottom: 30,
          border: "1px solid #ddd",
        }}
      >
        <h3 style={{ marginBottom: 10 }}>Filter by Profile</h3>
        <select
          value={mainProfile}
          onChange={(e) => setMainProfile(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="">All Profiles</option>
          {mainProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          background: "#f4f4ff",
          padding: 20,
          borderRadius: 8,
          marginBottom: 40,
          border: "1px solid #ccd",
        }}
      >
        <h3 style={{ marginBottom: 10 }}>Create FAQ</h3>

        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "1fr 1fr",
            marginBottom: 15,
          }}
        >
          <select
            value={form.main_profile_id}
            onChange={(e) => {
              const selectedId = e.target.value;
              setForm({ ...form, main_profile_id: selectedId });
              setMainProfile(selectedId);
            }}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          >
            <option value="">Select Main Profile</option>
            {mainProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Index"
            type="number"
            value={form.index}
            onChange={(e) =>
              setForm({ ...form, index: Number(e.target.value) })
            }
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />

          <input
            placeholder="Question"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />

          <input
            placeholder="Answer"
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />

          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          >
            <option value="all">all</option>
            <option value="not_u">not_u</option>
            <option value="u">u</option>
          </select>

          <input
            placeholder="Alt Name"
            value={form.altName}
            onChange={(e) => setForm({ ...form, altName: e.target.value })}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.is_upwork_allowed}
            onChange={(e) =>
              setForm({ ...form, is_upwork_allowed: e.target.checked })
            }
          />
          Allowed for Upwork
        </label>

        <button
          onClick={save}
          style={{
            marginTop: 15,
            padding: "10px 15px",
            borderRadius: 6,
            border: "none",
            background: "#4a4aff",
            color: "white",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>

      <h3 style={{ marginBottom: 10 }}>FAQ List</h3>
      <input
        type="text"
        placeholder="Search by ID, question, or answer"
        value={faqSearch}
        onChange={(e) => setFaqSearch(e.target.value)}
        style={{
          marginBottom: 16,
          padding: 8,
          borderRadius: 6,
          border: "1px solid #ccc",
          width: 350,
        }}
      />
      {filteredList?.length === 0 && <p>No FAQs found.</p>}
      <ul style={{ padding: 0, listStyle: "none" }}>
        {filteredList?.map((i) => (
          <li
            key={i.id}
            style={{
              background: "#fafafa",
              padding: 15,
              marginBottom: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{i.question}</strong>
              <div style={{ fontSize: 13, color: "#666" }}>{i.answer}</div>
              <div style={{ fontSize: 13, color: "#666" }}>Type: {i.type}</div>
              <div style={{ fontSize: 13, color: "#666" }}>
                Upwork: {i.is_upwork_allowed ? "Yes" : "No"}
              </div>
              <button
                title="Copy ID"
                style={{
                  marginTop: 8,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "#eee",
                  border: "1px solid #ccc",
                  fontSize: 12,
                  cursor: "pointer",
                }}
                onClick={() => navigator.clipboard.writeText(i.id)}
              >
                Copy ID
              </button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => update(i)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: "#ffd966",
                  border: "1px solid #ccad33",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
              <button
                onClick={() => remove(i.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: "#ff4d4d",
                  border: "1px solid #b30000",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
