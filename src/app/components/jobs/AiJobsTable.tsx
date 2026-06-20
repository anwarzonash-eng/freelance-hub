"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Copy, Pencil, Trash2, Plus, Upload, ChevronDown, ChevronUp,
    ExternalLink, Code2, RotateCcw, Check, Link2, RefreshCw,
} from "lucide-react";
import { showAppNotification } from "@/utils/notificationService";
import {
    getAllAiJobs, createAiJob, updateAiJob, deleteAiJob,
    importMercorJobs, importAlignerJobs, syncMercorReferrals,
} from "@/app/api_handlers/api/ai-jobs.api";

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCES = ["mercor", "aligner"];
const STATUSES = ["active", "inactive", "paused"];
const WORK_ARRANGEMENTS = ["remote", "hybrid", "onsite"];
const COMMITMENTS = ["hourly", "full-time", "part-time", "contract"];
const RATE_FREQUENCIES = ["hourly", "fixed", "monthly"];
const LIMIT_OPTIONS = [25, 50, 100];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SOURCE_COLORS: Record<string, string> = {
    mercor: "bg-violet-100 text-violet-700 border-violet-200",
    aligner: "bg-teal-100 text-teal-700 border-teal-200",
};
const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    paused: "bg-yellow-100 text-yellow-700",
};

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
    source: "mercor" as string,
    title: "",
    description: "",
    short_description: "",
    rate_min: "" as any,
    rate_max: "" as any,
    rate_frequency: "hourly",
    work_arrangement: "remote",
    location: "",
    status: "active",
    category: "",
    commitment: "",
    hours_per_week: "" as any,
    company_name: "",
    listing_type: "",
    listing_domain: "",
    remaining_slots: "" as any,
    referral_amount: "" as any,
    // Mercor manual
    mercor_referral_link: "",
    // Aligner referral (from JSON, editable)
    referral_id: "",
    referral_program_id: "",
    referral_program_name: "",
    referral_percentage: "" as any,
    referral_max_cap: "" as any,
    referral_description: "",
    // Common manual
    apply_url: "",
    priority: "" as any,
    is_active: true,
    notes: "",
};

const EMPTY_FILTERS = {
    search: "",
    source: "",
    status: "",
    is_active: "",
    referral_enabled: "",
    category: "",
    work_arrangement: "",
    commitment: "",
    date_filter: "",
    date_from: "",
    date_to: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyText(text: string, label = "Copied") {
    navigator.clipboard.writeText(text);
    showAppNotification("success", label, text);
}

function formatDate(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function getAdminRole() {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("userRole") === "admin";
}

function fmtRate(min: number | null, max: number | null, freq: string | null) {
    if (!min && !max) return null;
    const f = freq ? `/${freq === "hourly" ? "hr" : freq}` : "";
    if (min && max) return `$${min}–$${max}${f}`;
    if (min) return `$${min}+${f}`;
    return `up to $${max}${f}`;
}

// ─── Compact field components ─────────────────────────────────────────────────

function CInput({ label, name, value, onChange, type = "text", placeholder = "", readonly = false }: any) {
    return (
        <div className="flex flex-col gap-0.5">
            {label && <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</label>}
            <input type={type} name={name} value={value ?? ""} onChange={onChange} placeholder={placeholder}
                readOnly={readonly}
                className={`border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500 w-full ${readonly ? "bg-gray-50 text-gray-500" : ""}`} />
        </div>
    );
}

function CSelect({ label, name, value, onChange, options }: any) {
    return (
        <div className="flex flex-col gap-0.5">
            {label && <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</label>}
            <select name={name} value={value ?? ""} onChange={onChange}
                className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500 w-full bg-white">
                <option value="">— select —</option>
                {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

function CTextarea({ label, name, value, onChange, rows = 3, placeholder = "" }: any) {
    return (
        <div className="flex flex-col gap-0.5">
            {label && <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</label>}
            <textarea name={name} value={value ?? ""} onChange={onChange} rows={rows} placeholder={placeholder}
                className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500 w-full resize-y" />
        </div>
    );
}

// ─── JSON Viewer Modal ────────────────────────────────────────────────────────

function JsonModal({ job, onClose }: { job: any; onClose: () => void }) {
    const json = JSON.stringify(job.raw_json, null, 2);
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">Raw JSON — {job.title}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => copyText(json, "JSON Copied")}
                            className="flex items-center gap-1 text-[10px] border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-50">
                            <Copy size={10} /> Copy
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                    </div>
                </div>
                <pre className="overflow-auto flex-1 p-3 text-[11px] text-gray-800 bg-gray-50 leading-relaxed font-mono">{json}</pre>
            </div>
        </div>
    );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ source, onClose, onDone }: { source: "mercor" | "aligner"; onClose: () => void; onDone: () => void }) {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const label = source === "mercor" ? "Mercor" : "Aligner";

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (ev) => setText(ev.target?.result as string);
        reader.readAsText(f);
    };

    const handleImport = async () => {
        setError("");
        let parsed: any;
        try { parsed = JSON.parse(text); }
        catch { setError("Invalid JSON — could not parse."); return; }
        setLoading(true);
        const fn = source === "mercor" ? importMercorJobs : importAlignerJobs;
        const res = await fn(parsed);
        setLoading(false);
        if (res) { setResult(res); onDone(); }
        else setError("Import failed — check server logs for details.");
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-2xl shadow-xl">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">Import {label} Jobs</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
                <div className="p-3 flex flex-col gap-2">
                    {result ? (
                        <div className="rounded border border-green-200 bg-green-50 p-3 text-xs space-y-1">
                            <div className="font-semibold text-green-700 flex items-center gap-1"><Check size={12} /> Import Complete</div>
                            <div className="text-gray-700">
                                Total: <b>{result.data?.total}</b> · New: <b>{result.data?.imported}</b> · Updated: <b>{result.data?.updated}</b> · Errors: <b>{result.data?.skipped}</b>
                            </div>
                            {result.data?.errors?.length > 0 && (
                                <div className="mt-1 text-red-600 max-h-24 overflow-y-auto text-[10px]">
                                    {result.data.errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
                                </div>
                            )}
                            <button onClick={onClose} className="mt-2 px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700">Close</button>
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] text-gray-500">
                                {label === "Mercor"
                                    ? <>Wrap in <code className="bg-gray-100 px-1 rounded">&#123;"listings":[…]&#125;</code> or paste a plain array. Duplicates are updated but your <b>referral link</b> is never overwritten.</>
                                    : <>Wrap in <code className="bg-gray-100 px-1 rounded">&#123;"data":&#123;"jobs":&#123;"jobs":[…]&#125;&#125;&#125;</code> or paste a plain array. Jobs without referral IDs are flagged as referral-disabled.</>
                                }
                            </p>
                            <div className="flex items-center gap-2">
                                <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
                                <button onClick={() => fileRef.current?.click()}
                                    className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
                                    <Upload size={11} /> Upload .json file
                                </button>
                                <span className="text-[10px] text-gray-400">or paste below</span>
                            </div>
                            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10}
                                placeholder={`Paste ${label} JSON here…`}
                                className="border border-gray-300 rounded px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:border-gray-500 w-full resize-y" />
                            {error && <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
                            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
                                <button onClick={onClose} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                                <button onClick={handleImport} disabled={loading || !text.trim()}
                                    className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                                    {loading ? "Importing…" : "Import"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sync Mercor Referrals Modal ──────────────────────────────────────────────

function SyncMercorModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const handleSync = async () => {
        if (!token.trim()) { setError("Please paste your Mercor bearer token."); return; }
        setError("");
        setLoading(true);
        const res = await syncMercorReferrals(token.trim());
        setLoading(false);
        if (res) { setResult(res); onDone(); }
        else setError("Sync failed — check server logs or verify the token.");
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-lg shadow-xl">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <RefreshCw size={12} className="text-violet-500" /> Sync Mercor Referral Links
                    </span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
                <div className="p-3 flex flex-col gap-2">
                    {result ? (
                        <div className="rounded border border-green-200 bg-green-50 p-3 text-xs space-y-1">
                            <div className="font-semibold text-green-700 flex items-center gap-1"><Check size={12} /> Sync Complete</div>
                            <div className="text-gray-700">
                                Jobs without link: <b>{result.data?.total}</b> · Updated: <b>{result.data?.updated}</b> · Failed: <b>{result.data?.failed}</b>
                            </div>
                            {result.data?.errors?.length > 0 && (
                                <div className="mt-1 text-red-600 max-h-48 overflow-y-auto text-[10px] space-y-1 bg-red-50 border border-red-100 rounded p-1.5">
                                    {result.data.errors.map((e: string, i: number) => (
                                        <div key={i} className="break-all font-mono">{e}</div>
                                    ))}
                                </div>
                            )}
                            <button onClick={onClose} className="mt-2 px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700">Close</button>
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] text-gray-500">
                                This will call the Mercor API for every Mercor job that doesn't have a referral link yet and save the returned link.
                                The token is sent directly to the Mercor API and is <b>never stored</b> in the database.
                            </p>
                            <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Bearer Token</label>
                                <textarea
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    rows={4}
                                    placeholder="Paste your Mercor bearer token here…"
                                    className="border border-gray-300 rounded px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:border-violet-400 w-full resize-none"
                                />
                            </div>
                            {error && <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
                            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
                                <button onClick={onClose} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                                <button onClick={handleSync} disabled={loading || !token.trim()}
                                    className="px-3 py-1 text-xs bg-violet-700 text-white rounded hover:bg-violet-800 disabled:opacity-50 flex items-center gap-1">
                                    {loading ? <><RefreshCw size={10} className="animate-spin" /> Syncing…</> : <><RefreshCw size={10} /> Sync</>}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Job Form Modal ───────────────────────────────────────────────────────────

function JobFormModal({ editing, onClose, onSaved }: { editing: any | null; onClose: () => void; onSaved: () => void }) {
    const isEdit = !!editing?.id;
    const [form, setForm] = useState<typeof EMPTY_FORM>(() =>
        isEdit ? { ...EMPTY_FORM, ...editing } : { ...EMPTY_FORM }
    );
    const [saving, setSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
        setForm((p) => ({ ...p, [name]: val }));
    };

    const handleSave = async (closeAfter: boolean) => {
        if (!form.title.trim()) { showAppNotification("error", "Validation", "Title is required."); return; }
        if (!form.source) { showAppNotification("error", "Validation", "Source is required."); return; }
        setSaving(true);
        const payload: any = { ...form };
        ["rate_min", "rate_max", "hours_per_week", "remaining_slots", "referral_amount",
            "referral_percentage", "referral_max_cap", "priority"].forEach((k) => {
                payload[k] = payload[k] !== "" && payload[k] != null ? Number(payload[k]) || null : null;
            });
        const res = isEdit ? await updateAiJob(editing.id, payload) : await createAiJob(payload);
        setSaving(false);
        if (res) { onSaved(); if (closeAfter) onClose(); else setForm({ ...EMPTY_FORM }); }
    };

    const isMercor = form.source === "mercor";
    const isAligner = form.source === "aligner";

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-3xl shadow-lg max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">{isEdit ? "Edit AI Job" : "Add AI Job"}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
                <form onSubmit={(e) => e.preventDefault()} className="p-3 grid gap-2">
                    <div className="grid grid-cols-3 gap-2">
                        <CSelect label="Source *" name="source" value={form.source} onChange={handleChange} options={SOURCES} />
                        <CSelect label="Status" name="status" value={form.status} onChange={handleChange} options={STATUSES} />
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Active</label>
                            <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                                <input type="checkbox" name="is_active" checked={!!form.is_active} onChange={handleChange} className="w-3.5 h-3.5" />
                                <span className="text-xs text-gray-700">Is Active</span>
                            </label>
                        </div>
                    </div>

                    <CInput label="Title *" name="title" value={form.title} onChange={handleChange} />
                    <CTextarea label="Short Description" name="short_description" value={form.short_description} onChange={handleChange} rows={2} />
                    <CTextarea label="Full Description" name="description" value={form.description} onChange={handleChange} rows={5} />

                    <div className="grid grid-cols-4 gap-2">
                        <CInput label="Rate Min $" name="rate_min" value={form.rate_min} onChange={handleChange} type="number" />
                        <CInput label="Rate Max $" name="rate_max" value={form.rate_max} onChange={handleChange} type="number" />
                        <CSelect label="Rate Freq" name="rate_frequency" value={form.rate_frequency} onChange={handleChange} options={RATE_FREQUENCIES} />
                        <CSelect label="Arrangement" name="work_arrangement" value={form.work_arrangement} onChange={handleChange} options={WORK_ARRANGEMENTS} />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <CInput label="Location" name="location" value={form.location} onChange={handleChange} />
                        <CInput label="Category" name="category" value={form.category} onChange={handleChange} />
                        <CSelect label="Commitment" name="commitment" value={form.commitment} onChange={handleChange} options={COMMITMENTS} />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <CInput label="Company Name" name="company_name" value={form.company_name} onChange={handleChange} />
                        <CInput label="Hours / Week" name="hours_per_week" value={form.hours_per_week} onChange={handleChange} type="number" />
                        <CInput label="Priority" name="priority" value={form.priority} onChange={handleChange} type="number" />
                    </div>

                    {/* Mercor referral section */}
                    {isMercor && (
                        <div className="border border-violet-100 rounded p-2 bg-violet-50 grid grid-cols-2 gap-2">
                            <div className="col-span-2 text-[10px] font-semibold text-violet-600 uppercase tracking-wide mb-0.5">Mercor</div>
                            <CInput label="Listing Type" name="listing_type" value={form.listing_type} onChange={handleChange} />
                            <CInput label="Listing Domain" name="listing_domain" value={form.listing_domain} onChange={handleChange} />
                            <CInput label="Remaining Slots" name="remaining_slots" value={form.remaining_slots} onChange={handleChange} type="number" />
                            <CInput label="Referral Amount $" name="referral_amount" value={form.referral_amount} onChange={handleChange} type="number" />
                            <div className="col-span-2">
                                <CInput label="Referral Link (manual)" name="mercor_referral_link" value={form.mercor_referral_link}
                                    onChange={handleChange} placeholder="https://mercor.com/…?ref=…" />
                                <p className="text-[10px] text-violet-500 mt-0.5">Setting this link marks the job as referral-enabled. Never overwritten by import.</p>
                            </div>
                        </div>
                    )}

                    {/* Aligner referral section */}
                    {isAligner && (
                        <div className="border border-teal-100 rounded p-2 bg-teal-50 grid grid-cols-2 gap-2">
                            <div className="col-span-2 text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-0.5">
                                Aligner Referral — job is referral-enabled when both IDs are set
                            </div>
                            <CInput label="Referral ID" name="referral_id" value={form.referral_id}
                                onChange={handleChange} placeholder="From JSON: referral.id" />
                            <CInput label="Program ID" name="referral_program_id" value={form.referral_program_id}
                                onChange={handleChange} placeholder="From JSON: referral.programId" />
                            <CInput label="Program Name" name="referral_program_name" value={form.referral_program_name} onChange={handleChange} />
                            <CInput label="Referral %" name="referral_percentage" value={form.referral_percentage} onChange={handleChange} type="number" />
                            <CInput label="Max Cap $" name="referral_max_cap" value={form.referral_max_cap} onChange={handleChange} type="number" />
                            <CTextarea label="Referral Description" name="referral_description" value={form.referral_description} onChange={handleChange} rows={2} />
                        </div>
                    )}

                    {/* Common fields */}
                    <CInput label="Apply / Personal Referral URL" name="apply_url" value={form.apply_url} onChange={handleChange} placeholder="https://…" />
                    <CTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} rows={2} />

                    <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 mt-1">
                        <button type="button" onClick={onClose} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                        <button type="button" onClick={() => handleSave(!!isEdit)} disabled={saving}
                            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50">
                            {saving ? "Saving…" : "Save"}
                        </button>
                        {!isEdit && (
                            <button type="button" onClick={() => handleSave(true)} disabled={saving}
                                className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                                {saving ? "Saving…" : "Save & Close"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function ReferralChip({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
    return (
        <div className="flex items-center gap-1 text-[10px]">
            <span className="text-gray-500">{label}:</span>
            <span className="font-mono text-gray-800 text-[9px] max-w-[140px] truncate">{value}</span>
            <button onClick={onCopy} className="text-teal-500 hover:text-teal-700 shrink-0"><Copy size={9} /></button>
        </div>
    );
}

function JobCard({ job, isAdmin, onEdit, onDelete, onViewJson }: {
    job: any; isAdmin: boolean;
    onEdit: () => void; onDelete: () => void; onViewJson: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const isMercor = job.source === "mercor";
    const isAligner = job.source === "aligner";
    const rate = fmtRate(job.rate_min, job.rate_max, job.rate_frequency);
    const locations: string[] = Array.isArray(job.locations) ? job.locations : [];

    return (
        <div className="border border-gray-200 rounded bg-white hover:shadow-sm transition-shadow flex flex-col">
            {/* Header */}
            <div className="flex items-start gap-2 p-2.5 pb-1.5">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 mb-1">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide ${SOURCE_COLORS[job.source] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {job.source}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[job.status] || "bg-gray-100 text-gray-600"}`}>
                            {job.status}
                        </span>
                        {job.referral_enabled ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-0.5">
                                <Link2 size={8} /> Referral
                            </span>
                        ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-200">No Referral</span>
                        )}
                        {job.category && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">{job.category}</span>
                        )}
                    </div>
                    <h3 className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{job.title}</h3>
                    {job.company_name && <div className="text-[10px] text-gray-500 mt-0.5">{job.company_name}</div>}
                </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-2.5 pb-1 text-[10px] text-gray-600">
                {rate && <span className="font-medium text-gray-800">{rate}</span>}
                {job.work_arrangement && <span>{job.work_arrangement}</span>}
                {job.commitment && <span>{job.commitment}</span>}
                {job.location && <span>{job.location}</span>}
                {job.remaining_slots != null && <span>{job.remaining_slots} slots</span>}
            </div>

            {/* Eligibility locations */}
            {locations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 px-2.5 pb-1.5">
                    <span className="text-[9px] text-gray-400 shrink-0">Eligible:</span>
                    {locations.map((loc, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 font-medium">
                            {loc}
                        </span>
                    ))}
                </div>
            )}

            {/* Mercor referral link */}
            {isMercor && job.referral_enabled && job.mercor_referral_link && (
                <div className="mx-2.5 mb-1.5 rounded bg-violet-50 border border-violet-100 px-2 py-1.5">
                    <div className="text-[9px] font-semibold text-violet-500 uppercase tracking-wide mb-0.5">Referral Link</div>
                    <div className="flex items-center gap-1 text-[10px]">
                        <span className="font-mono text-gray-700 text-[9px] truncate max-w-[200px]">{job.mercor_referral_link}</span>
                        <button onClick={() => copyText(job.mercor_referral_link, "Referral link copied")} className="text-violet-500 hover:text-violet-700 shrink-0"><Copy size={9} /></button>
                        <a href={job.mercor_referral_link} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-600 shrink-0"><ExternalLink size={9} /></a>
                    </div>
                    {job.referral_amount != null && (
                        <div className="text-[10px] text-violet-600 mt-0.5">+${job.referral_amount} per referral</div>
                    )}
                </div>
            )}

            {/* Aligner referral IDs */}
            {isAligner && (job.referral_id || job.referral_program_id) && (
                <div className="mx-2.5 mb-1.5 rounded bg-teal-50 border border-teal-100 px-2 py-1.5">
                    <div className="text-[9px] font-semibold text-teal-500 uppercase tracking-wide mb-0.5">Referral IDs</div>
                    <div className="flex flex-col gap-0.5">
                        {job.referral_id && (
                            <ReferralChip label="Referral ID" value={job.referral_id}
                                onCopy={() => copyText(job.referral_id, "Referral ID copied")} />
                        )}
                        {job.referral_program_id && job.referral_program_id !== job.referral_id && (
                            <ReferralChip label="Program ID" value={job.referral_program_id}
                                onCopy={() => copyText(job.referral_program_id, "Program ID copied")} />
                        )}
                        <div className="flex flex-wrap gap-2 mt-0.5 text-[10px] text-gray-500">
                            {job.referral_program_name && <span>{job.referral_program_name}</span>}
                            {job.referral_percentage != null && <span>{job.referral_percentage}%</span>}
                            {job.referral_max_cap != null && <span>cap ${job.referral_max_cap}</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* Aligner: not yet referral-enabled hint */}
            {isAligner && !job.referral_enabled && (
                <div className="mx-2.5 mb-1.5 text-[9px] text-gray-400 italic px-1">No referral IDs in source JSON</div>
            )}

            {/* Mercor: link not yet added hint */}
            {isMercor && !job.referral_enabled && (
                <div className="mx-2.5 mb-1.5 text-[9px] text-gray-400 italic px-1">Referral link not set — edit to add</div>
            )}

            {/* Apply URL */}
            {job.apply_url && (
                <div className="px-2.5 pb-1.5 flex items-center gap-1 text-[10px]">
                    <span className="text-gray-500 shrink-0">Apply:</span>
                    <span className="truncate max-w-[180px] text-blue-600 font-mono text-[9px]">{job.apply_url}</span>
                    <button onClick={() => copyText(job.apply_url, "Apply URL copied")} className="text-gray-400 hover:text-gray-700 shrink-0"><Copy size={9} /></button>
                    <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 shrink-0"><ExternalLink size={9} /></a>
                </div>
            )}

            {/* Expanded */}
            {expanded && (
                <div className="px-2.5 pb-2 border-t border-gray-100 pt-2 flex flex-col gap-1.5 text-[11px]">
                    {job.short_description && <p className="text-gray-600 leading-relaxed">{job.short_description}</p>}
                    {job.description && <p className="text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-8">{job.description}</p>}
                    {job.listing_domain && <div><span className="text-gray-400 text-[10px]">Domain: </span><span className="text-gray-700">{job.listing_domain}</span></div>}
                    {job.notes && <div><span className="text-gray-400 text-[10px] block">Notes</span><p className="text-gray-700 whitespace-pre-wrap">{job.notes}</p></div>}
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        Added {formatDate(job.createdAt)} · Source ID:
                        <span className="font-mono">{job.source_job_id}</span>
                        <button onClick={() => copyText(job.source_job_id, "Source ID copied")} className="text-gray-400 hover:text-gray-700 shrink-0"><Copy size={9} /></button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-gray-100 mt-auto">
                <span className="text-[10px] text-gray-400">{formatDate(job.createdAt)}</span>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => setExpanded((p) => !p)} className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-700">
                        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {expanded ? "Less" : "More"}
                    </button>
                    <button onClick={onViewJson} title="View raw JSON" className="text-gray-400 hover:text-gray-700"><Code2 size={12} /></button>
                    <button onClick={onEdit} title="Edit" className="text-gray-500 hover:text-gray-800"><Pencil size={12} /></button>
                    {isAdmin && (
                        <button onClick={onDelete} title="Delete" className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, onApply, onClear }: {
    filters: typeof EMPTY_FILTERS;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onApply: () => void;
    onClear: () => void;
}) {
    return (
        <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
            <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                <div className="flex flex-col gap-0.5 col-span-2">
                    <label className="text-[10px] text-gray-400 uppercase">Search</label>
                    <input name="search" value={filters.search} onChange={onChange} placeholder="Title, company, category…"
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-gray-400 uppercase">Source</label>
                    <select name="source" value={filters.source} onChange={onChange}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                        <option value="">All</option>
                        {SOURCES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-gray-400 uppercase">Status</label>
                    <select name="status" value={filters.status} onChange={onChange}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                        <option value="">All</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-gray-400 uppercase">Referral</label>
                    <select name="referral_enabled" value={filters.referral_enabled} onChange={onChange}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                        <option value="">All</option>
                        <option value="true">Enabled</option>
                        <option value="false">Not enabled</option>
                    </select>
                </div>
            </div>
            <div className="flex items-end gap-1.5 flex-wrap">
                <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-gray-400 uppercase">Active</label>
                    <select name="is_active" value={filters.is_active} onChange={onChange}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                        <option value="">All</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-gray-400 uppercase">Arrangement</label>
                    <select name="work_arrangement" value={filters.work_arrangement} onChange={onChange}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                        <option value="">All</option>
                        {WORK_ARRANGEMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-gray-400 uppercase">Commitment</label>
                    <select name="commitment" value={filters.commitment} onChange={onChange}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                        <option value="">All</option>
                        {COMMITMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-gray-400 uppercase">Date Added</label>
                    <select name="date_filter" value={filters.date_filter} onChange={onChange}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                        <option value="">Any time</option>
                        {DATE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                {filters.date_filter === "custom" && (
                    <>
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">From</label>
                            <input type="date" name="date_from" value={filters.date_from} onChange={onChange}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">To</label>
                            <input type="date" name="date_to" value={filters.date_to} onChange={onChange}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                        </div>
                    </>
                )}
                <button onClick={onApply} className="px-3 py-0.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 mt-auto">Filter</button>
                <button onClick={onClear} className="px-3 py-0.5 text-xs border border-gray-300 rounded hover:bg-white mt-auto flex items-center gap-1">
                    <RotateCcw size={10} /> Clear
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AiJobsTable() {
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS });

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [jsonJob, setJsonJob] = useState<any | null>(null);
    const [importSource, setImportSource] = useState<"mercor" | "aligner" | null>(null);
    const [showSyncMercor, setShowSyncMercor] = useState(false);

    useEffect(() => { setIsAdmin(getAdminRole()); }, []);

    const load = useCallback(async (pg: number, lim: number, af: typeof EMPTY_FILTERS) => {
        setLoading(true);
        const params: any = { ...af, page: pg, limit: lim };
        Object.keys(params).forEach((k) => { if (params[k] === "") delete params[k]; });
        const res = await getAllAiJobs(params);
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
        setFilters((prev) => ({
            ...prev, [name]: value,
            ...(name === "date_filter" && value !== "custom" ? { date_from: "", date_to: "" } : {}),
        }));
    };

    const applyFilters = () => { setPage(1); setAppliedFilters({ ...filters }); };
    const clearFilters = () => { setFilters({ ...EMPTY_FILTERS }); setAppliedFilters({ ...EMPTY_FILTERS }); setPage(1); };

    const handleDelete = async (job: any) => {
        if (!confirm(`Delete "${job.title}"?`)) return;
        const res = await deleteAiJob(job.id);
        if (res) load(page, limit, appliedFilters);
    };

    const handleEdit = (job: any) => { setEditing(job); setShowForm(true); };
    const handleAdd = () => { setEditing(null); setShowForm(true); };
    const handleSaved = () => load(page, limit, appliedFilters);

    return (
        <div className="p-3 bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-semibold text-gray-800">AI Jobs</h1>
                    <button onClick={() => load(page, limit, appliedFilters)} title="Refresh jobs list" disabled={loading}
                        className="flex items-center justify-center text-gray-600 hover:text-gray-800 disabled:opacity-50">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={() => setImportSource("mercor")}
                        className="flex items-center gap-1 text-xs border border-violet-300 text-violet-700 bg-violet-50 px-2 py-1 rounded hover:bg-violet-100">
                        <Upload size={11} /> Import Mercor Jobs
                    </button>
                    <button onClick={() => setShowSyncMercor(true)}
                        className="flex items-center gap-1 text-xs border border-violet-400 text-violet-800 bg-violet-100 px-2 py-1 rounded hover:bg-violet-200">
                        <RefreshCw size={11} /> Sync Mercor Referral
                    </button>
                    <button onClick={() => setImportSource("aligner")}
                        className="flex items-center gap-1 text-xs border border-teal-300 text-teal-700 bg-teal-50 px-2 py-1 rounded hover:bg-teal-100">
                        <Upload size={11} /> Import Aligner Jobs
                    </button>
                    <button onClick={handleAdd}
                        className="flex items-center gap-1 text-xs bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700">
                        <Plus size={12} /> Add
                    </button>
                </div>
            </div>

            <FilterBar filters={filters} onChange={handleFilterChange} onApply={applyFilters} onClear={clearFilters} />

            {/* Stats */}
            <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                <span>{total} job{total !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-1.5">
                    <span>Per page:</span>
                    <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                        className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none">
                        {LIMIT_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
            </div>

            {/* Cards */}
            {loading && <div className="text-center py-12 text-gray-400 text-xs">Loading…</div>}
            {!loading && data.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs">No jobs found. Import from Mercor or Aligner to get started.</div>
            )}
            {!loading && data.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                    {data.map((job) => (
                        <JobCard key={job.id} job={job} isAdmin={isAdmin}
                            onEdit={() => handleEdit(job)}
                            onDelete={() => handleDelete(job)}
                            onViewJson={() => setJsonJob(job)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 text-xs mt-2">
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
                    <span className="text-gray-400 ml-1">Page {page} of {totalPages}</span>
                </div>
            )}

            {/* Modals */}
            {showForm && <JobFormModal editing={editing} onClose={() => setShowForm(false)} onSaved={handleSaved} />}
            {jsonJob && <JsonModal job={jsonJob} onClose={() => setJsonJob(null)} />}
            {importSource && (
                <ImportModal source={importSource} onClose={() => setImportSource(null)} onDone={handleSaved} />
            )}
            {showSyncMercor && (
                <SyncMercorModal onClose={() => setShowSyncMercor(false)} onDone={handleSaved} />
            )}
        </div>
    );
}
