"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Pencil, Trash2, ChevronDown, ChevronRight, ExternalLink, Plus, MessageCircle, X, ShieldCheck, Star, Briefcase, Mail, Globe, Wifi } from "lucide-react";
import { showAppNotification } from "@/utils/notificationService";
import {
    getAllProfessionals,
    createProfessional,
    updateProfessional,
    deleteProfessional,
} from "@/app/api_handlers/api/professionals.api";
import { getCountries, getCountryName } from "@/utils/countries";
import MatchJobsModal from "./MatchJobsModal";
import CourtesyEmailModal from "./CourtesyEmailModal";
import PlatformInviteModal from "./PlatformInviteModal";
import EmailCampaignsViewer from "./EmailCampaignsViewer";
import AssignGatewayModal from "./AssignGatewayModal";
import { getAllGmailGateways } from "@/app/api_handlers/api/gmail-gateways.api";

// ─── Constants ───────────────────────────────────────────────────────────────

const DESIGNATIONS = ["IT", "Accountant", "Medical", "Business", "Marketing", "Gamers", "Law"];
const JOB_MATCH_STATUSES = ["Not Matched", "Matched Jobs"];
const JOB_MATCH_COLORS: Record<string, string> = {
    "Matched Jobs": "bg-emerald-100 text-emerald-700",
    "Not Matched": "bg-gray-100 text-gray-500",
};
const QUALIFICATIONS = ["Graduation", "Master", "MPhil", "PHD"];
const STATUSES = ["Email Sent", "Positive Response", "Negative Response", "Hate Response", "Joined"];
const LIMIT_OPTIONS = [50, 100, 150];

const EMAIL_TYPE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
    courtesy_email:       { label: "Ce", bg: "bg-blue-100",   text: "text-blue-700"   },
    mercor_platform_join: { label: "Me", bg: "bg-violet-100", text: "text-violet-700" },
    micro1_platform_join: { label: "Mi", bg: "bg-sky-100",    text: "text-sky-700"    },
    aligner_platform_join:{ label: "Al", bg: "bg-teal-100",   text: "text-teal-700"   },
    outlier_platform_join:{ label: "Ou", bg: "bg-orange-100", text: "text-orange-700" },
    mercor_job:           { label: "Mj", bg: "bg-violet-200", text: "text-violet-800" },
    aligner_job:          { label: "Aj", bg: "bg-teal-200",   text: "text-teal-800"   },
};

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
    country: "",
    short_listed: false,
    job_match_status: "Not Matched",
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
    country: "",
    short_listed: "",
    job_match_status: "",
    is_email_verified: "",
    email_verification_status: "",
    date_filter: "",
    date_from: "",
    date_to: "",
    email_types: "",
    email_gateway_ids: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emailStatusColor(status: string) {
    if (status === "Deliverable") return "bg-green-100 text-green-700";
    if (status === "Undeliverable") return "bg-red-100 text-red-600";
    if (status === "Risky") return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-500";
}

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

                    <div className="grid grid-cols-4 gap-2">
                        <CSelect label="Designation" name="designation" value={form.designation} onChange={handleChange} options={DESIGNATIONS} />
                        <CSelect label="Qualification" name="qualification" value={form.qualification} onChange={handleChange} options={QUALIFICATIONS} />
                        <CSelect label="Status" name="status" value={form.status} onChange={handleChange} options={STATUSES} />
                        <CSelect label="Job Match Status" name="job_match_status" value={form.job_match_status} onChange={handleChange} options={JOB_MATCH_STATUSES} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Country</label>
                            <select name="country" value={form.country} onChange={handleChange}
                                className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500 w-full bg-white">
                                <option value="">— select —</option>
                                {getCountries().map((c) => (
                                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <CTextarea label="Overall LinkedIn Context" name="linkedin_context" value={form.linkedin_context} onChange={handleChange} rows={3} />
                    <CInput label="Email Subject" name="email_subject" value={form.email_subject} onChange={handleChange} />
                    <CTextarea label="Email Text (HTML)" name="email_text" value={form.email_text} onChange={handleChange} rows={6} />

                    <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                        <input type="checkbox" checked={!!form.short_listed}
                            onChange={(e) => setForm((p) => ({ ...p, short_listed: e.target.checked }))}
                            className="w-3.5 h-3.5" />
                        <span className="text-xs text-gray-700 flex items-center gap-1">
                            <Star size={11} className="text-yellow-400" /> Short Listed
                        </span>
                    </label>

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

// ─── Verify Emails Modal ──────────────────────────────────────────────────────

function VerifyEmailsModal({
    selectedProfessionals,
    onClose,
    onComplete,
}: {
    selectedProfessionals: any[];
    onClose: () => void;
    onComplete: () => void;
}) {
    const [phase, setPhase] = useState<"setup" | "verifying" | "done" | "error">("setup");
    const [progress, setProgress] = useState("");
    const [results, setResults] = useState<{ proId: string; name: string; email: string; classification: string; verified: boolean }[]>([]);
    const [error, setError] = useState("");

    const verifaliaSid = process.env.NEXT_PUBLIC_VERIFALIA_SID ?? "";
    const verifaliaPassword = process.env.NEXT_PUBLIC_VERIFALIA_PASSWORD ?? "";

    const eligible = selectedProfessionals.filter((p) => {
        const emails = Array.isArray(p.emails) ? p.emails : [];
        return emails.length > 0 && emails[0]?.email;
    });
    const skipped = selectedProfessionals.length - eligible.length;

    const handleVerify = async () => {
        if (!verifaliaSid || !verifaliaPassword) {
            setError("Verifalia credentials are not configured. Set NEXT_PUBLIC_VERIFALIA_SID and NEXT_PUBLIC_VERIFALIA_PASSWORD in .env and restart the dev server.");
            return;
        }
        if (eligible.length === 0) {
            setError("No selected professionals have email addresses.");
            return;
        }
        setPhase("verifying");
        setError("");

        try {
            const emailToPro = new Map<string, { id: string; name: string }>();
            for (const pro of eligible) {
                const emails = Array.isArray(pro.emails) ? pro.emails : [];
                if (emails[0]?.email) {
                    emailToPro.set(emails[0].email, { id: pro.id, name: `${pro.first_name} ${pro.last_name}` });
                }
            }

            const emailList = [...emailToPro.keys()];
            setProgress(`Submitting ${emailList.length} email${emailList.length !== 1 ? "s" : ""} to Verifalia…`);

            const authHeader = "Basic " + btoa(`${verifaliaSid}:${verifaliaPassword}`);

            const submitRes = await fetch("https://api.verifalia.com/v2.5/email-validations", {
                method: "POST",
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    entries: emailList.map((e) => ({ inputData: e })),
                    quality: "Standard",
                }),
            });

            if (!submitRes.ok) {
                const errText = await submitRes.text();
                throw new Error(`Verifalia returned ${submitRes.status}: ${errText.slice(0, 300)}`);
            }

            let jobData = await submitRes.json();
            const jobId: string = jobData.overview?.id;
            if (!jobId) throw new Error("No job ID returned from Verifalia.");

            let attempts = 0;
            while (jobData.overview?.status !== "Completed") {
                if (attempts > 60) throw new Error("Timed out after 3 minutes waiting for Verifalia.");
                attempts++;
                setProgress(`Waiting for results… (${jobData.overview?.status ?? "InProgress"})`);
                await new Promise((r) => setTimeout(r, 3000));
                const pollRes = await fetch(`https://api.verifalia.com/v2.5/email-validations/${jobId}`, {
                    headers: { Authorization: authHeader, Accept: "application/json" },
                });
                if (!pollRes.ok) {
                    const errText = await pollRes.text();
                    throw new Error(`Poll failed ${pollRes.status}: ${errText.slice(0, 200)}`);
                }
                jobData = await pollRes.json();
            }

            const entries: any[] = jobData.entries?.data ?? [];
            const verificationResults: typeof results = [];

            for (const entry of entries) {
                const pro = emailToPro.get(entry.inputData);
                if (pro) {
                    verificationResults.push({
                        proId: pro.id,
                        name: pro.name,
                        email: entry.inputData,
                        classification: entry.classification ?? "Unknown",
                        verified: entry.classification === "Deliverable",
                    });
                }
            }

            setProgress(`Saving ${verificationResults.length} result${verificationResults.length !== 1 ? "s" : ""} to database…`);
            for (const r of verificationResults) {
                await updateProfessional({ is_email_verified: r.verified, email_verification_status: r.classification }, r.proId);
            }

            setResults(verificationResults);
            setPhase("done");
            onComplete();
        } catch (err: any) {
            setError(err.message || "Unknown error occurred.");
            setPhase("error");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">Verify Emails via Verifalia</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>

                <div className="p-3 space-y-3">
                    <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2 space-y-0.5">
                        <p><span className="font-medium">{eligible.length}</span> professional{eligible.length !== 1 ? "s" : ""} with emails will be verified.</p>
                        {skipped > 0 && <p className="text-gray-400">{skipped} skipped — no email address on record.</p>}
                    </div>

                    {phase === "setup" && (
                        <>
                            {(!verifaliaSid || !verifaliaPassword) && (
                                <div className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded p-2">
                                    <p className="font-medium mb-0.5">Credentials not configured</p>
                                    <p>Set <span className="font-mono">NEXT_PUBLIC_VERIFALIA_SID</span> and <span className="font-mono">NEXT_PUBLIC_VERIFALIA_PASSWORD</span> in your <span className="font-mono">.env</span> file and restart the dev server.</p>
                                </div>
                            )}
                            {error && <p className="text-xs text-red-500">{error}</p>}
                            <div className="flex justify-end gap-2 pt-1">
                                <button onClick={onClose} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                                <button onClick={handleVerify} disabled={eligible.length === 0 || !verifaliaSid || !verifaliaPassword}
                                    className="px-3 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600 disabled:opacity-50">
                                    Start Verification
                                </button>
                            </div>
                        </>
                    )}

                    {phase === "verifying" && (
                        <div className="text-center py-6 space-y-2">
                            <div className="text-xs text-gray-600 animate-pulse">{progress}</div>
                            <div className="text-[10px] text-gray-400">Do not close this window…</div>
                        </div>
                    )}

                    {phase === "error" && (
                        <div className="space-y-2">
                            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 whitespace-pre-wrap break-all">{error}</div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setPhase("setup"); setError(""); }} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Try Again</button>
                                <button onClick={onClose} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700">Close</button>
                            </div>
                        </div>
                    )}

                    {phase === "done" && (
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-700">
                                {results.filter((r) => r.verified).length} verified · {results.filter((r) => !r.verified).length} not verified
                            </div>
                            <div className="border border-gray-200 rounded divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                {results.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between px-2 py-1.5 text-xs">
                                        <div>
                                            <div className="font-medium text-gray-800">{r.name}</div>
                                            <div className="text-gray-400 text-[10px]">{r.email}</div>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${emailStatusColor(r.classification)}`}>
                                            {r.classification}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end">
                                <button onClick={onClose} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700">Close</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
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
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPlatformModal, setShowPlatformModal] = useState(false);
    const [showAssignGatewayModal, setShowAssignGatewayModal] = useState(false);
    const [viewingEmailsPro, setViewingEmailsPro] = useState<any>(null);
    const [showEmailTypeDropdown, setShowEmailTypeDropdown] = useState(false);
    const [showGatewayDropdown, setShowGatewayDropdown] = useState(false);
    const [gateways, setGateways] = useState<any[]>([]);

    useEffect(() => { setIsAdmin(getAdminRole()); }, []);

    useEffect(() => {
        getAllGmailGateways().then((res: any) => {
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            setGateways(list);
        });
    }, []);

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

    const handleSelectOne = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const allPageIds = data.map((p) => p.id);
    const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
    const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

    const handleSelectAll = () => {
        if (allPageSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                allPageIds.forEach((id) => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                allPageIds.forEach((id) => next.add(id));
                return next;
            });
        }
    };

    const selectedProfessionals = data.filter((p) => selectedIds.has(p.id));

    const handleToggleShortlist = async (pro: any) => {
        await updateProfessional({ short_listed: !pro.short_listed }, pro.id);
        load(page, limit, appliedFilters);
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (!confirm(`Delete ${count} professional${count !== 1 ? "s" : ""}? This cannot be undone.`)) return;
        for (const id of [...selectedIds]) {
            await deleteProfessional(id);
        }
        setSelectedIds(new Set());
        load(page, limit, appliedFilters);
    };

    const COL_SPAN = isAdmin ? 9 : 8;

    return (
        <div className="p-3 bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-sm font-semibold text-gray-800">Professionals</h1>
                    {isAdmin && selectedIds.size > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
                            <button onClick={() => setShowVerifyModal(true)}
                                className="flex items-center gap-1 text-xs bg-green-700 text-white px-2 py-1 rounded hover:bg-green-600">
                                <ShieldCheck size={12} /> Verify Emails
                            </button>
                            <button onClick={() => setShowMatchModal(true)}
                                className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">
                                <Briefcase size={12} /> Match Jobs
                            </button>
                            <button onClick={() => setShowEmailModal(true)}
                                className="flex items-center gap-1 text-xs bg-teal-600 text-white px-2 py-1 rounded hover:bg-teal-700">
                                <Mail size={12} /> Courtesy Email
                            </button>
                            <button onClick={() => setShowPlatformModal(true)}
                                className="flex items-center gap-1 text-xs bg-violet-600 text-white px-2 py-1 rounded hover:bg-violet-700">
                                <Globe size={12} /> Platform Invite
                            </button>
                            <button onClick={() => setShowAssignGatewayModal(true)}
                                className="flex items-center gap-1 text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600">
                                <Wifi size={12} /> Assign Gateway
                            </button>
                            <button onClick={handleBulkDelete}
                                className="flex items-center gap-1 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
                                <Trash2 size={12} /> Delete Selected
                            </button>
                            <button onClick={() => setSelectedIds(new Set())}
                                className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
                        </div>
                    )}
                </div>
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

                <div className="flex items-end gap-1.5 flex-wrap">
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
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Short Listed</label>
                        <select name="short_listed" value={filters.short_listed} onChange={handleFilterChange}
                            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                            <option value="">All</option>
                            <option value="true">Shortlisted</option>
                            <option value="false">Not Shortlisted</option>
                        </select>
                    </div>
                    {isAdmin && (
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">Job Match</label>
                            <select name="job_match_status" value={filters.job_match_status} onChange={handleFilterChange}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                                <option value="">All</option>
                                {JOB_MATCH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Country</label>
                        <select name="country" value={filters.country} onChange={handleFilterChange}
                            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                            <option value="">All</option>
                            {getCountries().map((c) => (
                                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                            ))}
                        </select>
                    </div>
                    {isAdmin && (
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">Email Status</label>
                            <select name="email_verification_status" value={filters.email_verification_status} onChange={handleFilterChange}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                                <option value="">All</option>
                                <option value="Deliverable">Deliverable</option>
                                <option value="Undeliverable">Undeliverable</option>
                                <option value="Risky">Risky</option>
                                <option value="Unknown">Unknown</option>
                                <option value="not_checked">Not Checked</option>
                            </select>
                        </div>
                    )}
                    {/* Email Type multiselect — admin only */}
                    {isAdmin && (
                        <div className="relative mt-auto">
                            <button
                                onClick={() => setShowEmailTypeDropdown(p => !p)}
                                className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 text-gray-700"
                            >
                                Email Type
                                {filters.email_types && filters.email_types !== "" ? ` (${filters.email_types.split(',').length})` : ""}
                                <ChevronDown size={11} className="text-gray-400" />
                            </button>
                            {showEmailTypeDropdown && (
                                <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-2 space-y-1 min-w-[180px]">
                                    {[
                                        { value: "no_emails", label: "No Emails" },
                                        { value: "courtesy_email", label: "Courtesy Email" },
                                        { value: "mercor_platform_join", label: "Mercor Invite" },
                                        { value: "micro1_platform_join", label: "Micro1 Invite" },
                                        { value: "aligner_platform_join", label: "Aligner Invite" },
                                        { value: "outlier_platform_join", label: "Outlier Invite" },
                                        { value: "mercor_job", label: "Mercor Job" },
                                        { value: "aligner_job", label: "Aligner Job" },
                                    ].map(opt => {
                                        const selected = (filters.email_types ?? "").split(',').filter(Boolean).includes(opt.value)
                                        return (
                                            <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => {
                                                        const current = (filters.email_types ?? "").split(',').filter(Boolean)
                                                        const next = selected
                                                            ? current.filter(v => v !== opt.value)
                                                            : [...current, opt.value]
                                                        setFilters((f: any) => ({ ...f, email_types: next.join(',') }))
                                                    }}
                                                    className="w-3 h-3"
                                                />
                                                <span className="text-xs text-gray-700">{opt.label}</span>
                                            </label>
                                        )
                                    })}
                                    <div className="border-t border-gray-100 pt-1 mt-1">
                                        <button onClick={() => { setFilters((f: any) => ({ ...f, email_types: "" })); setShowEmailTypeDropdown(false) }}
                                            className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Gateway multiselect — admin only */}
                    {isAdmin && (
                        <div className="relative mt-auto">
                            <button
                                onClick={() => setShowGatewayDropdown(p => !p)}
                                className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 text-gray-700"
                            >
                                Gateway
                                {filters.email_gateway_ids && filters.email_gateway_ids !== "" ? ` (${filters.email_gateway_ids.split(',').length})` : ""}
                                <ChevronDown size={11} className="text-gray-400" />
                            </button>
                            {showGatewayDropdown && (
                                <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-2 space-y-1 min-w-[180px]">
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                        <input
                                            type="checkbox"
                                            checked={(filters.email_gateway_ids ?? "").split(',').filter(Boolean).includes('none')}
                                            onChange={() => {
                                                const current = (filters.email_gateway_ids ?? "").split(',').filter(Boolean)
                                                const selected = current.includes('none')
                                                const next = selected ? current.filter(v => v !== 'none') : [...current, 'none']
                                                setFilters((f: any) => ({ ...f, email_gateway_ids: next.join(',') }))
                                            }}
                                            className="w-3 h-3"
                                        />
                                        <span className="text-xs text-gray-500 italic">No Gateway</span>
                                    </label>
                                    {gateways.map(gw => {
                                        const selected = (filters.email_gateway_ids ?? "").split(',').filter(Boolean).includes(gw.id)
                                        return (
                                            <label key={gw.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => {
                                                        const current = (filters.email_gateway_ids ?? "").split(',').filter(Boolean)
                                                        const next = selected ? current.filter(v => v !== gw.id) : [...current, gw.id]
                                                        setFilters((f: any) => ({ ...f, email_gateway_ids: next.join(',') }))
                                                    }}
                                                    className="w-3 h-3"
                                                />
                                                <span className="text-xs text-gray-700">{gw.label}</span>
                                                {gw.email && <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{gw.email}</span>}
                                            </label>
                                        )
                                    })}
                                    <div className="border-t border-gray-100 pt-1 mt-1">
                                        <button onClick={() => { setFilters((f: any) => ({ ...f, email_gateway_ids: "" })); setShowGatewayDropdown(false) }}
                                            className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={applyFilters} className="px-3 py-0.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 mt-auto">Filter</button>
                    <button onClick={clearFilters} className="px-3 py-0.5 text-xs border border-gray-300 rounded hover:bg-white mt-auto">Clear</button>
                </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            {isAdmin && (
                                <th className="w-6 px-1 py-1 text-center border-r border-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={allPageSelected}
                                        ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                                        onChange={handleSelectAll}
                                        className="w-3 h-3 cursor-pointer"
                                    />
                                </th>
                            )}
                            <th className="w-6 px-1 py-1 text-left font-medium text-gray-500 border-r border-gray-200">#</th>
                            <th className="w-4 px-1 py-1 border-r border-gray-200"></th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Name</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Contact</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Profile</th>
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
                                    <tr key={pro.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isExpanded ? "bg-blue-50" : ""} ${selectedIds.has(pro.id) ? "bg-green-50" : ""}`}>
                                        {isAdmin && (
                                            <td className="px-1 py-1 border-r border-gray-100 text-center">
                                                <input type="checkbox" checked={selectedIds.has(pro.id)} onChange={() => handleSelectOne(pro.id)} className="w-3 h-3 cursor-pointer" />
                                            </td>
                                        )}
                                        <td className="px-1 py-1 text-gray-400 border-r border-gray-100 text-center">{rowNum}</td>
                                        <td className="px-1 py-1 border-r border-gray-100 text-center">
                                            <button onClick={() => toggleExpand(pro.id)} className="text-gray-400 hover:text-gray-700">
                                                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                            </button>
                                        </td>
                                        {/* Name */}
                                        <td className="px-2 py-1.5 border-r border-gray-100 whitespace-nowrap font-medium text-gray-800">
                                            <div className="flex items-center gap-1">
                                                {pro.short_listed && <Star size={10} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                                                <span className="text-xs">{pro.first_name} {pro.last_name}</span>
                                            </div>
                                        </td>
                                        {/* Contact: email + phone stacked */}
                                        <td className="px-2 py-1.5 border-r border-gray-100">
                                            <div className="space-y-0.5">
                                                {firstEmail ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[10px] truncate max-w-[140px] ${firstEmail.is_bounced ? "line-through text-red-400" : "text-gray-700"}`}>
                                                            {firstEmail.email}
                                                        </span>
                                                        {isAdmin && pro.email_verification_status && (
                                                            <span title={pro.email_verification_status}
                                                                className={`text-[8px] font-bold px-0.5 rounded ${emailStatusColor(pro.email_verification_status)}`}>
                                                                {pro.email_verification_status[0]}
                                                            </span>
                                                        )}
                                                        <button onClick={() => copyText(firstEmail.email)} className="text-gray-300 hover:text-gray-600 shrink-0"><Copy size={9} /></button>
                                                        {emails.length > 1 && <span className="text-[9px] text-gray-400">+{emails.length - 1}</span>}
                                                    </div>
                                                ) : null}
                                                {firstPhone ? (
                                                    <div className="flex items-center gap-1">
                                                        {firstPhone.is_whatsapp
                                                            ? <a href={whatsappUrl(firstPhone.phone)} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-0.5 text-[10px] text-green-700 hover:underline">
                                                                <MessageCircle size={9} />{firstPhone.phone}
                                                              </a>
                                                            : <span className="text-[10px] text-gray-600">{firstPhone.phone}</span>}
                                                        <button onClick={() => copyText(firstPhone.phone)} className="text-gray-300 hover:text-gray-600 shrink-0"><Copy size={9} /></button>
                                                        {phones.length > 1 && <span className="text-[9px] text-gray-400">+{phones.length - 1}</span>}
                                                    </div>
                                                ) : null}
                                                {!firstEmail && !firstPhone && <span className="text-gray-400 text-[10px]">—</span>}
                                            </div>
                                        </td>
                                        {/* Profile: designation + qual + country stacked */}
                                        <td className="px-2 py-1.5 border-r border-gray-100">
                                            <div className="space-y-0.5">
                                                {pro.designation && <div className="text-[10px] text-gray-700 font-medium">{pro.designation}</div>}
                                                {pro.qualification && <div className="text-[10px] text-gray-500">{pro.qualification}</div>}
                                                {pro.country && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-mono text-[9px] bg-gray-100 px-0.5 rounded">{pro.country}</span>
                                                        <span className="text-[9px] text-gray-400">{getCountryName(pro.country)}</span>
                                                    </div>
                                                )}
                                                {!pro.designation && !pro.qualification && !pro.country && <span className="text-gray-400 text-[10px]">—</span>}
                                            </div>
                                        </td>
                                        {/* Status: compact badges + email type icons */}
                                        <td className="px-2 py-1.5 border-r border-gray-100">
                                            <div className="space-y-0.5">
                                                {pro.status
                                                    ? <span className={`inline-block px-1 py-0 rounded text-[9px] font-medium whitespace-nowrap ${STATUS_COLORS[pro.status] || "bg-gray-100 text-gray-600"}`}>{pro.status}</span>
                                                    : null}
                                                {isAdmin && pro.job_match_status && pro.job_match_status !== "Not Matched" && (
                                                    <div>
                                                        <span className={`inline-block px-1 py-0 rounded text-[9px] font-medium whitespace-nowrap ${JOB_MATCH_COLORS[pro.job_match_status] || "bg-gray-100 text-gray-500"}`}>
                                                            {pro.matched_jobs_count > 0 ? `${pro.matched_jobs_count} matched` : "Matched"}
                                                        </span>
                                                    </div>
                                                )}
                                                {/* Email campaign type icons — admin only */}
                                                {isAdmin && Array.isArray(pro.email_campaigns) && pro.email_campaigns.length > 0 && (
                                                    <div className="flex items-center gap-0.5 flex-wrap">
                                                        {pro.email_campaigns.map((ec: any, i: number) => {
                                                            const badge = EMAIL_TYPE_BADGES[ec.email_type];
                                                            const tip = `${(ec.email_type || "").replace(/_/g, " ")} · ${(ec.status || "").replace(/_/g, " ")}`;
                                                            return (
                                                                <span key={i} title={tip}
                                                                    className={`text-[8px] font-bold px-1 py-0 rounded cursor-default select-none ${badge ? badge.bg + " " + badge.text : "bg-gray-100 text-gray-600"}`}>
                                                                    {badge ? badge.label : ec.email_type[0].toUpperCase()}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {/* Gateway badge — admin only */}
                                                {isAdmin && pro.email_gateway_id && (() => {
                                                    const gw = gateways.find(g => g.id === pro.email_gateway_id);
                                                    return gw ? (
                                                        <span title={gw.email || gw.label}
                                                            className="inline-flex items-center gap-0.5 text-[8px] font-medium px-1 py-0 rounded bg-indigo-100 text-indigo-700 whitespace-nowrap">
                                                            <Wifi size={8} />{gw.label}
                                                        </span>
                                                    ) : null;
                                                })()}
                                                {!pro.status && !(pro.job_match_status && pro.job_match_status !== "Not Matched") && !(Array.isArray(pro.email_campaigns) && pro.email_campaigns.length > 0) && !pro.email_gateway_id && (
                                                    <span className="text-gray-400 text-[10px]">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-gray-100 text-gray-500 whitespace-nowrap text-[10px]">{formatDate(pro.createdAt)}</td>
                                        <td className="px-2 py-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => handleToggleShortlist(pro)} title={pro.short_listed ? "Remove from shortlist" : "Add to shortlist"}
                                                    className={pro.short_listed ? "text-yellow-400 hover:text-yellow-500" : "text-gray-300 hover:text-yellow-400"}>
                                                    <Star size={11} className={pro.short_listed ? "fill-yellow-400" : ""} />
                                                </button>
                                                <button onClick={() => handleEdit(pro)} className="text-gray-500 hover:text-gray-800"><Pencil size={11} /></button>
                                                {isAdmin && (
                                                    <button onClick={() => setViewingEmailsPro(pro)} title="View Email Campaigns"
                                                        className="text-gray-400 hover:text-teal-600">
                                                        <Mail size={11} />
                                                    </button>
                                                )}
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
            {showVerifyModal && (
                <VerifyEmailsModal
                    selectedProfessionals={selectedProfessionals}
                    onClose={() => setShowVerifyModal(false)}
                    onComplete={() => { load(page, limit, appliedFilters); setSelectedIds(new Set()); }}
                />
            )}
            {showMatchModal && (
                <MatchJobsModal
                    professionals={selectedProfessionals}
                    onClose={() => setShowMatchModal(false)}
                    onMatchSaved={() => { load(page, limit, appliedFilters); }}
                />
            )}
            {showEmailModal && (
                <CourtesyEmailModal
                    professionals={selectedProfessionals}
                    onClose={() => setShowEmailModal(false)}
                    onSaved={() => { load(page, limit, appliedFilters); }}
                />
            )}
            {showPlatformModal && (
                <PlatformInviteModal
                    professionals={selectedProfessionals}
                    onClose={() => setShowPlatformModal(false)}
                    onSaved={() => { load(page, limit, appliedFilters); }}
                />
            )}
            {viewingEmailsPro && (
                <EmailCampaignsViewer
                    professional={viewingEmailsPro}
                    onClose={() => setViewingEmailsPro(null)}
                />
            )}
            {showAssignGatewayModal && (
                <AssignGatewayModal
                    selectedProfessionals={selectedProfessionals}
                    onClose={() => setShowAssignGatewayModal(false)}
                    onComplete={() => { setShowAssignGatewayModal(false); setSelectedIds(new Set()); load(page, limit, appliedFilters); }}
                />
            )}
        </div>
    );
}
