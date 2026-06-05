"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Pencil, Trash2, ChevronDown, ChevronRight, ExternalLink, Plus, MessageCircle, X } from "lucide-react";
import { showAppNotification } from "@/utils/notificationService";
import {
    getAllProfessionals,
    createProfessional,
    updateProfessional,
    deleteProfessional,
} from "@/app/api_handlers/api/professionals.api";

// ─── Constants ───────────────────────────────────────────────────────────────

const DESIGNATIONS = ["IT", "Accountant", "Medical", "Business", "Marketing", "Gamers", "Law"];
const QUALIFICATIONS = ["Graduation", "Master", "MPhil", "PHD"];
const STATUSES = ["Email Sent", "Positive Response", "Negative Response", "Hate Response", "Joined"];
const LIMIT_OPTIONS = [50, 100, 150];

const STATUS_COLORS: Record<string, string> = {
    "Email Sent": "bg-blue-100 text-blue-700",
    "Positive Response": "bg-green-100 text-green-700",
    "Negative Response": "bg-red-100 text-red-700",
    "Hate Response": "bg-red-200 text-red-800",
    "Joined": "bg-emerald-100 text-emerald-700",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function buildDateFilterOptions() {
    const now = new Date();
    const opts: { label: string; value: string }[] = [
        { label: "Today", value: "today" },
        { label: "Yesterday", value: "yesterday" },
    ];
    for (let i = 2; i <= 7; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        opts.push({ label: DAY_NAMES[d.getDay()], value: `day_${i}` });
    }
    opts.push(
        { label: "Last Week", value: "last_week" },
        { label: "2 Weeks Ago", value: "2_weeks" },
        { label: "3 Weeks Ago", value: "3_weeks" },
        { label: "1 Month Ago", value: "1_month" },
        { label: "Custom Date…", value: "custom" },
    );
    return opts;
}

const DATE_FILTER_OPTIONS = buildDateFilterOptions();

const EMPTY_FORM = {
    first_name: "",
    last_name: "",
    linkedin_url: "",
    emails: [{ email: "", is_bounced: false }] as { email: string; is_bounced: boolean }[],
    phones: [{ phone: "", is_whatsapp: false }] as { phone: string; is_whatsapp: boolean }[],
    designation: "",
    linkedin_context: "",
    qualification: "",
    status: "",
    email_text: "",
    email_subject: "",
};

const EMPTY_FILTERS = {
    search_name: "",
    search_email: "",
    search_phone: "",
    designation: "",
    qualification: "",
    status: "",
    date_filter: "",
    date_from: "",
    date_to: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function copyText(text: string) {
    navigator.clipboard.writeText(text);
    showAppNotification("success", "Copied", text);
}

async function copyAsHtml(html: string) {
    try {
        const blob = new Blob([html], { type: "text/html" });
        await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
        showAppNotification("success", "Copied as HTML", "Paste in Gmail to send as HTML email.");
    } catch {
        await navigator.clipboard.writeText(html);
        showAppNotification("success", "Copied as text", "HTML clipboard not supported; copied as plain text.");
    }
}

function whatsappUrl(phone: string) {
    return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

function isValidUrl(url: string) {
    if (!url) return true;
    try { new URL(url); return true; } catch { return false; }
}

function formatDate(iso: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function getAdminRole() {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("userRole") === "admin";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CInput({ label, name, value, onChange, type = "text", required = false, error = "" }: any) {
    return (
        <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}{required && " *"}</label>
            <input type={type} name={name} value={value} onChange={onChange}
                className={`border rounded px-1.5 py-1 text-xs focus:outline-none w-full ${error ? "border-red-400" : "border-gray-300 focus:border-gray-500"}`} />
            {error && <span className="text-[10px] text-red-500">{error}</span>}
        </div>
    );
}

function CSelect({ label, name, value, onChange, options, required = false }: any) {
    return (
        <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}{required && " *"}</label>
            <select name={name} value={value} onChange={onChange}
                className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500 w-full bg-white">
                <option value="">— select —</option>
                {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

function CTextarea({ label, name, value, onChange, rows = 3 }: any) {
    return (
        <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</label>
            <textarea name={name} value={value} onChange={onChange} rows={rows}
                className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500 w-full resize-y" />
        </div>
    );
}

// ─── Emails sub-form ──────────────────────────────────────────────────────────

function EmailsField({ emails, onChange }: { emails: { email: string; is_bounced: boolean }[]; onChange: (v: typeof emails) => void }) {
    const add = () => onChange([...emails, { email: "", is_bounced: false }]);
    const remove = (i: number) => onChange(emails.filter((_, idx) => idx !== i));
    const set = (i: number, field: string, value: any) => {
        const next = emails.map((e, idx) => idx === i ? { ...e, [field]: value } : e);
        onChange(next);
    };
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Emails</label>
                <button type="button" onClick={add} className="flex items-center gap-0.5 text-[10px] text-gray-600 hover:text-gray-900">
                    <Plus size={10} /> Add
                </button>
            </div>
            {emails.map((entry, i) => (
                <div key={i} className="flex items-center gap-1">
                    <input
                        type="email"
                        placeholder="email@example.com"
                        value={entry.email}
                        onChange={(e) => set(i, "email", e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500"
                    />
                    <label className="flex items-center gap-0.5 text-[10px] text-gray-500 whitespace-nowrap cursor-pointer">
                        <input type="checkbox" checked={entry.is_bounced} onChange={(e) => set(i, "is_bounced", e.target.checked)} className="w-3 h-3" />
                        Bounced
                    </label>
                    {emails.length > 1 && (
                        <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600"><X size={11} /></button>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Phones sub-form ──────────────────────────────────────────────────────────

function PhonesField({ phones, onChange }: { phones: { phone: string; is_whatsapp: boolean }[]; onChange: (v: typeof phones) => void }) {
    const add = () => onChange([...phones, { phone: "", is_whatsapp: false }]);
    const remove = (i: number) => onChange(phones.filter((_, idx) => idx !== i));
    const set = (i: number, field: string, value: any) => {
        const next = phones.map((p, idx) => idx === i ? { ...p, [field]: value } : p);
        onChange(next);
    };
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Phone Numbers</label>
                <button type="button" onClick={add} className="flex items-center gap-0.5 text-[10px] text-gray-600 hover:text-gray-900">
                    <Plus size={10} /> Add
                </button>
            </div>
            {phones.map((entry, i) => (
                <div key={i} className="flex items-center gap-1">
                    <input
                        type="tel"
                        placeholder="+1234567890"
                        value={entry.phone}
                        onChange={(e) => set(i, "phone", e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500"
                    />
                    <label className="flex items-center gap-0.5 text-[10px] text-green-700 whitespace-nowrap cursor-pointer">
                        <input type="checkbox" checked={entry.is_whatsapp} onChange={(e) => set(i, "is_whatsapp", e.target.checked)} className="w-3 h-3" />
                        WhatsApp
                    </label>
                    {phones.length > 1 && (
                        <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600"><X size={11} /></button>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function ProfessionalFormModal({ editing, onClose, onSaved }: { editing: any | null; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState<typeof EMPTY_FORM>(() => {
        if (!editing?.id) return { ...EMPTY_FORM };
        return {
            ...EMPTY_FORM,
            ...editing,
            emails: Array.isArray(editing.emails) && editing.emails.length ? editing.emails : [{ email: "", is_bounced: false }],
            phones: Array.isArray(editing.phones) && editing.phones.length ? editing.phones : [{ phone: "", is_whatsapp: false }],
        };
    });
    const [saving, setSaving] = useState(false);
    const [urlError, setUrlError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === "linkedin_url") setUrlError(value && !isValidUrl(value) ? "Must be a valid URL (include https://)" : "");
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (closeAfter: boolean) => {
        if (!form.first_name.trim() || !form.last_name.trim()) {
            showAppNotification("error", "Validation", "First name and last name are required.");
            return;
        }
        if (form.linkedin_url && !isValidUrl(form.linkedin_url)) {
            showAppNotification("error", "Validation", "LinkedIn URL must be a valid URL.");
            return;
        }
        setSaving(true);
        const payload = {
            ...form,
            emails: form.emails.filter((e) => e.email.trim()),
            phones: form.phones.filter((p) => p.phone.trim()),
        };
        const res = editing?.id
            ? await updateProfessional(payload, editing.id)
            : await createProfessional(payload);
        setSaving(false);
        if (res) {
            onSaved();
            if (closeAfter) {
                onClose();
            } else {
                setForm({ ...EMPTY_FORM });
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">{editing?.id ? "Edit Professional" : "Add Professional"}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>

                <form onSubmit={(e) => e.preventDefault()} className="p-3 grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                        <CInput label="First Name" name="first_name" value={form.first_name} onChange={handleChange} required />
                        <CInput label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} required />
                    </div>

                    <CInput label="LinkedIn URL" name="linkedin_url" value={form.linkedin_url} onChange={handleChange} error={urlError} />

                    <EmailsField emails={form.emails} onChange={(v) => setForm((p) => ({ ...p, emails: v }))} />
                    <PhonesField phones={form.phones} onChange={(v) => setForm((p) => ({ ...p, phones: v }))} />

                    <div className="grid grid-cols-3 gap-2">
                        <CSelect label="Designation" name="designation" value={form.designation} onChange={handleChange} options={DESIGNATIONS} />
                        <CSelect label="Qualification" name="qualification" value={form.qualification} onChange={handleChange} options={QUALIFICATIONS} />
                        <CSelect label="Status" name="status" value={form.status} onChange={handleChange} options={STATUSES} />
                    </div>

                    <CTextarea label="Overall LinkedIn Context" name="linkedin_context" value={form.linkedin_context} onChange={handleChange} rows={3} />
                    <CInput label="Email Subject" name="email_subject" value={form.email_subject} onChange={handleChange} />
                    <CTextarea label="Email Text (HTML)" name="email_text" value={form.email_text} onChange={handleChange} rows={6} />

                    <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 mt-1">
                        <button type="button" onClick={onClose} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                        <button type="button" onClick={() => handleSave(!!editing?.id)} disabled={saving} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50">
                            {saving ? "Saving…" : "Save"}
                        </button>
                        {!editing?.id && (
                            <button type="button" onClick={() => handleSave(true)} disabled={saving} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                                {saving ? "Saving…" : "Save & Close"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Email Preview Modal ──────────────────────────────────────────────────────

function EmailPreviewModal({ pro, onClose }: { pro: any; onClose: () => void }) {
    const primaryEmail = Array.isArray(pro.emails) && pro.emails.length ? pro.emails[0].email : "";
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">Email Preview</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => copyAsHtml(pro.email_text)} className="flex items-center gap-1 text-[10px] border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-50">
                            <Copy size={10} /> Copy as HTML
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                    </div>
                </div>
                <div className="p-4">
                    <div className="border border-gray-200 rounded bg-gray-50 px-3 py-2 mb-3 text-xs space-y-0.5">
                        <div><span className="text-gray-500 w-16 inline-block">To:</span> <span className="text-gray-800">{primaryEmail || "—"}</span></div>
                        <div><span className="text-gray-500 w-16 inline-block">Subject:</span> <span className="text-gray-800">{pro.email_subject || "—"}</span></div>
                    </div>
                    <div className="border border-gray-200 rounded bg-white px-8 py-6 text-sm leading-relaxed"
                        style={{ fontFamily: "Arial, sans-serif" }}
                        dangerouslySetInnerHTML={{ __html: pro.email_text || "<em style='color:#999'>No email text</em>" }} />
                </div>
            </div>
        </div>
    );
}

// ─── Expanded Row ─────────────────────────────────────────────────────────────

function ExpandedRow({ pro, colSpan, onViewEmail }: { pro: any; colSpan: number; onViewEmail: () => void }) {
    const emails: { email: string; is_bounced: boolean }[] = Array.isArray(pro.emails) ? pro.emails : [];
    const phones: { phone: string; is_whatsapp: boolean }[] = Array.isArray(pro.phones) ? pro.phones : [];
    return (
        <tr className="bg-gray-50 border-b border-gray-200">
            <td colSpan={colSpan} className="px-3 py-2">
                <div className="grid gap-1.5 text-xs">
                    {pro.linkedin_url && (
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-[10px] w-24 shrink-0">LinkedIn</span>
                            <a href={pro.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 truncate">
                                {pro.linkedin_url} <ExternalLink size={10} />
                            </a>
                        </div>
                    )}
                    {emails.length > 1 && (
                        <div>
                            <span className="text-gray-400 text-[10px] block mb-0.5">All Emails</span>
                            <div className="flex flex-wrap gap-2">
                                {emails.map((e, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <span className={e.is_bounced ? "line-through text-red-400" : "text-gray-700"}>{e.email}</span>
                                        {e.is_bounced && <span className="text-[9px] bg-red-100 text-red-500 rounded px-1">bounced</span>}
                                        <button onClick={() => copyText(e.email)} className="text-gray-400 hover:text-gray-600"><Copy size={9} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {phones.length > 1 && (
                        <div>
                            <span className="text-gray-400 text-[10px] block mb-0.5">All Phones</span>
                            <div className="flex flex-wrap gap-2">
                                {phones.map((p, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        {p.is_whatsapp
                                            ? <a href={whatsappUrl(p.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-green-700 hover:underline"><MessageCircle size={10} />{p.phone}</a>
                                            : <span className="text-gray-700">{p.phone}</span>}
                                        <button onClick={() => copyText(p.phone)} className="text-gray-400 hover:text-gray-600"><Copy size={9} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {pro.linkedin_context && (
                        <div>
                            <span className="text-gray-400 text-[10px] block mb-0.5">LinkedIn Context</span>
                            <p className="text-gray-700 whitespace-pre-wrap text-[11px] leading-relaxed">{pro.linkedin_context}</p>
                        </div>
                    )}
                    {(pro.email_subject || pro.email_text) && (
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-gray-400 text-[10px]">Subject: <span className="text-gray-700 font-medium">{pro.email_subject || "—"}</span></span>
                            <button onClick={onViewEmail} className="text-[10px] border border-gray-300 rounded px-2 py-0.5 hover:bg-white">View Email</button>
                            <button onClick={() => copyAsHtml(pro.email_text)} className="flex items-center gap-1 text-[10px] border border-gray-300 rounded px-2 py-0.5 hover:bg-white">
                                <Copy size={9} /> Copy HTML
                            </button>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfessionalsTable() {
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS });

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [emailPreviewPro, setEmailPreviewPro] = useState<any | null>(null);

    useEffect(() => { setIsAdmin(getAdminRole()); }, []);

    const load = useCallback(async (pg: number, lim: number, af: typeof EMPTY_FILTERS) => {
        setLoading(true);
        const params: any = { ...af, page: pg, limit: lim };
        // strip empty
        Object.keys(params).forEach((k) => { if (params[k] === "") delete params[k]; });
        const res = await getAllProfessionals(params);
        if (res?.data) {
            setData(res.data.data || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 0);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(page, limit, appliedFilters); }, [page, limit, appliedFilters, load]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value, ...(name === "date_filter" && value !== "custom" ? { date_from: "", date_to: "" } : {}) }));
    };

    const applyFilters = () => { setPage(1); setAppliedFilters({ ...filters }); };
    const clearFilters = () => { setFilters({ ...EMPTY_FILTERS }); setAppliedFilters({ ...EMPTY_FILTERS }); setPage(1); };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        const res = await deleteProfessional(id);
        if (res) load(page, limit, appliedFilters);
    };

    const handleEdit = (pro: any) => { setEditing(pro); setShowForm(true); };
    const handleAdd = () => { setEditing(null); setShowForm(true); };
    const handleSaved = () => { load(page, limit, appliedFilters); };
    const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

    const COL_SPAN = 10;

    return (
        <div className="p-3 bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-sm font-semibold text-gray-800">Professionals</h1>
                <button onClick={handleAdd} className="flex items-center gap-1 text-xs bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700">
                    <Plus size={12} /> Add
                </button>
            </div>

            {/* Filter Bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                    {[
                        { name: "search_name", placeholder: "Search name…" },
                        { name: "search_email", placeholder: "Search email…" },
                        { name: "search_phone", placeholder: "Search phone…" },
                    ].map(({ name, placeholder }) => (
                        <div key={name} className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">{name.replace("search_", "")}</label>
                            <input name={name} value={(filters as any)[name]} onChange={handleFilterChange} placeholder={placeholder}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                        </div>
                    ))}
                    {/* Date filter */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Date Added</label>
                        <select name="date_filter" value={filters.date_filter} onChange={handleFilterChange}
                            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                            <option value="">Any time</option>
                            {DATE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Custom date row */}
                {filters.date_filter === "custom" && (
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">From</label>
                            <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">To</label>
                            <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                        </div>
                    </div>
                )}

                <div className="flex items-end gap-1.5">
                    {(["designation", "qualification", "status"] as const).map((f) => (
                        <div key={f} className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">{f}</label>
                            <select name={f} value={filters[f]} onChange={handleFilterChange}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                                <option value="">All</option>
                                {(f === "designation" ? DESIGNATIONS : f === "qualification" ? QUALIFICATIONS : STATUSES).map((v) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                    <button onClick={applyFilters} className="px-3 py-0.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 mt-auto">Filter</button>
                    <button onClick={clearFilters} className="px-3 py-0.5 text-xs border border-gray-300 rounded hover:bg-white mt-auto">Clear</button>
                </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="w-6 px-1 py-1 text-left font-medium text-gray-500 border-r border-gray-200">#</th>
                            <th className="w-4 px-1 py-1 border-r border-gray-200"></th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Name</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Email</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Phone</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Designation</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Qual.</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Status</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Added</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={COL_SPAN} className="text-center py-6 text-gray-400 text-xs">Loading…</td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={COL_SPAN} className="text-center py-6 text-gray-400 text-xs">No records found.</td></tr>
                        )}
                        {!loading && data.map((pro, idx) => {
                            const isExpanded = expandedId === pro.id;
                            const rowNum = (page - 1) * limit + idx + 1;
                            const emails: { email: string; is_bounced: boolean }[] = Array.isArray(pro.emails) ? pro.emails : [];
                            const phones: { phone: string; is_whatsapp: boolean }[] = Array.isArray(pro.phones) ? pro.phones : [];
                            const firstEmail = emails[0];
                            const firstPhone = phones[0];
                            return (
                                <>
                                    <tr key={pro.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isExpanded ? "bg-blue-50" : ""}`}>
                                        <td className="px-1 py-1 text-gray-400 border-r border-gray-100 text-center">{rowNum}</td>
                                        <td className="px-1 py-1 border-r border-gray-100 text-center">
                                            <button onClick={() => toggleExpand(pro.id)} className="text-gray-400 hover:text-gray-700">
                                                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                            </button>
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap font-medium text-gray-800">
                                            {pro.first_name} {pro.last_name}
                                        </td>
                                        {/* Email — show first, indicate more */}
                                        <td className="px-2 py-1 border-r border-gray-100 max-w-[160px]">
                                            {firstEmail ? (
                                                <div className="flex items-center gap-1">
                                                    <span className={`truncate ${firstEmail.is_bounced ? "line-through text-red-400" : "text-gray-700"}`}>{firstEmail.email}</span>
                                                    {firstEmail.is_bounced && <span className="text-[9px] bg-red-100 text-red-500 rounded px-0.5">!</span>}
                                                    <button onClick={() => copyText(firstEmail.email)} className="shrink-0 text-gray-400 hover:text-gray-600"><Copy size={10} /></button>
                                                    {emails.length > 1 && <span className="text-[9px] text-gray-400">+{emails.length - 1}</span>}
                                                </div>
                                            ) : <span className="text-gray-400">—</span>}
                                        </td>
                                        {/* Phone — show first */}
                                        <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">
                                            {firstPhone ? (
                                                <div className="flex items-center gap-1">
                                                    {firstPhone.is_whatsapp
                                                        ? <a href={whatsappUrl(firstPhone.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-green-700 hover:underline">
                                                            <MessageCircle size={10} />{firstPhone.phone}
                                                        </a>
                                                        : <span className="text-gray-700">{firstPhone.phone}</span>}
                                                    <button onClick={() => copyText(firstPhone.phone)} className="text-gray-400 hover:text-gray-600"><Copy size={10} /></button>
                                                    {phones.length > 1 && <span className="text-[9px] text-gray-400">+{phones.length - 1}</span>}
                                                </div>
                                            ) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-100 text-gray-700">{pro.designation || "—"}</td>
                                        <td className="px-2 py-1 border-r border-gray-100 text-gray-700 whitespace-nowrap">{pro.qualification || "—"}</td>
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {pro.status
                                                ? <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[pro.status] || "bg-gray-100 text-gray-600"}`}>{pro.status}</span>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-100 text-gray-500 whitespace-nowrap">{formatDate(pro.createdAt)}</td>
                                        <td className="px-2 py-1">
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => handleEdit(pro)} className="text-gray-500 hover:text-gray-800"><Pencil size={11} /></button>
                                                {isAdmin && (
                                                    <button onClick={() => handleDelete(pro.id, `${pro.first_name} ${pro.last_name}`)} className="text-red-400 hover:text-red-600">
                                                        <Trash2 size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <ExpandedRow key={`${pro.id}-exp`} pro={pro} colSpan={COL_SPAN} onViewEmail={() => setEmailPreviewPro(pro)} />
                                    )}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{total} record{total !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>Rows:</span>
                    <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                        className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none">
                        {LIMIT_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-1 text-xs">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                        className="px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">‹</button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let n: number;
                        if (totalPages <= 7) n = i + 1;
                        else if (page <= 4) n = i + 1;
                        else if (page >= totalPages - 3) n = totalPages - 6 + i;
                        else n = page - 3 + i;
                        return (
                            <button key={n} onClick={() => setPage(n)}
                                className={`px-2 py-0.5 border rounded ${n === page ? "bg-gray-800 text-white border-gray-800" : "border-gray-300 hover:bg-gray-50"}`}>
                                {n}
                            </button>
                        );
                    })}
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                        className="px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">›</button>
                    <span className="text-gray-400 ml-1">Page {page} of {totalPages || 1}</span>
                </div>
            </div>

            {showForm && <ProfessionalFormModal editing={editing} onClose={() => setShowForm(false)} onSaved={handleSaved} />}
            {emailPreviewPro && <EmailPreviewModal pro={emailPreviewPro} onClose={() => setEmailPreviewPro(null)} />}
        </div>
    );
}
