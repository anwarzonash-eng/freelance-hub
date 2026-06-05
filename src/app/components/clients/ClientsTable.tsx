"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Pencil, Trash2, ChevronDown, ChevronRight, ExternalLink, Plus, MessageCircle, X, Clock, Users, Building2, FileText, Calendar } from "lucide-react";
import { showAppNotification } from "@/utils/notificationService";
import { getAllClients, createClient, updateClient, deleteClient, logClientFollowup } from "@/app/api_handlers/api/clients.api";

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCES = ["Upwork", "LinkedIn", "Indeed", "Direct", "Referral", "Other"];
const CONTRACT_STATUSES = ["In Progress", "Continued", "Successfully Ended", "Failed Ended"];
const FOLLOWUP_AFTER_OPTIONS = ["1 week", "2 weeks", "3 weeks", "1 month", "2 months", "3 months", "6 months"];
const LIMIT_OPTIONS = [50, 100, 150];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CONTRACT_COLORS: Record<string, string> = {
    "In Progress": "bg-blue-100 text-blue-700",
    "Continued": "bg-indigo-100 text-indigo-700",
    "Successfully Ended": "bg-green-100 text-green-700",
    "Failed Ended": "bg-red-100 text-red-700",
};

const SOURCE_COLORS: Record<string, string> = {
    "Upwork": "bg-emerald-100 text-emerald-700",
    "LinkedIn": "bg-blue-100 text-blue-700",
    "Indeed": "bg-purple-100 text-purple-700",
    "Direct": "bg-orange-100 text-orange-700",
    "Referral": "bg-yellow-100 text-yellow-700",
    "Other": "bg-gray-100 text-gray-600",
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

// ─── Empty state helpers ──────────────────────────────────────────────────────

const emptyEmail = () => ({ email: "", label: "" });
const emptyPhone = () => ({ phone: "", is_whatsapp: false, label: "" });
const emptyPerson = () => ({ name: "", email: "", phone: "", designation: "", linkedin_url: "" });
const emptyTeamMember = () => ({ name: "", email: "", phone: "", designation: "", linkedin_url: "", role: "" });

const EMPTY_FORM = {
    first_name: "", last_name: "", linkedin_url: "", designation: "",
    emails: [emptyEmail()],
    phones: [emptyPhone()],
    company_name: "", website: "", location: "", source: "",
    job_description: "", proposal_submitted: "", contract_status: "", contract_notes: "",
    key_persons: [] as ReturnType<typeof emptyPerson>[],
    team_members: [] as ReturnType<typeof emptyTeamMember>[],
    followup_after: "", next_followup_date: "", followup_message: "",
    followup_history: [] as { date: string; message: string; notes: string; logged_at: string }[],
};

const EMPTY_FILTERS = {
    search_name: "", search_company: "", search_email: "",
    source: "", contract_status: "",
    date_filter: "", date_from: "", date_to: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const copyText = (t: string) => { navigator.clipboard.writeText(t); showAppNotification("success", "Copied", t); };
const whatsappUrl = (p: string) => `https://wa.me/${p.replace(/\D/g, "")}`;
const isValidUrl = (u: string) => { if (!u) return true; try { new URL(u); return true; } catch { return false; } };
const formatDate = (iso: string) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
const getIsAdmin = () => typeof window !== "undefined" && localStorage.getItem("userRole") === "admin";

// ─── Compact field components ─────────────────────────────────────────────────

function CInput({ label, name, value, onChange, type = "text", required = false, error = "", placeholder = "" }: any) {
    return (
        <div className="flex flex-col gap-0.5">
            {label && <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}{required && " *"}</label>}
            <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
                className={`border rounded px-1.5 py-1 text-xs focus:outline-none w-full ${error ? "border-red-400" : "border-gray-300 focus:border-gray-500"}`} />
            {error && <span className="text-[10px] text-red-500">{error}</span>}
        </div>
    );
}

function CSelect({ label, name, value, onChange, options, required = false }: any) {
    return (
        <div className="flex flex-col gap-0.5">
            {label && <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}{required && " *"}</label>}
            <select name={name} value={value} onChange={onChange}
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
            <textarea name={name} value={value} onChange={onChange} rows={rows} placeholder={placeholder}
                className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500 w-full resize-y" />
        </div>
    );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
    return (
        <div className="flex items-center gap-1.5 py-1 border-b border-gray-200 mt-2 mb-1.5">
            <Icon size={11} className="text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
        </div>
    );
}

// ─── Dynamic array fields ─────────────────────────────────────────────────────

function EmailsField({ emails, onChange }: { emails: typeof EMPTY_FORM.emails; onChange: (v: any) => void }) {
    const add = () => onChange([...emails, emptyEmail()]);
    const remove = (i: number) => onChange(emails.filter((_, idx) => idx !== i));
    const set = (i: number, f: string, v: any) => onChange(emails.map((e, idx) => idx === i ? { ...e, [f]: v } : e));
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Emails</label>
                <button type="button" onClick={add} className="flex items-center gap-0.5 text-[10px] text-gray-600 hover:text-gray-900"><Plus size={10} />Add</button>
            </div>
            {emails.map((e, i) => (
                <div key={i} className="flex items-center gap-1">
                    <input type="email" placeholder="email@example.com" value={e.email} onChange={(ev) => set(i, "email", ev.target.value)}
                        className="flex-1 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500" />
                    <input placeholder="label (work/personal)" value={e.label} onChange={(ev) => set(i, "label", ev.target.value)}
                        className="w-28 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500" />
                    {emails.length > 1 && <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600"><X size={11} /></button>}
                </div>
            ))}
        </div>
    );
}

function PhonesField({ phones, onChange }: { phones: typeof EMPTY_FORM.phones; onChange: (v: any) => void }) {
    const add = () => onChange([...phones, emptyPhone()]);
    const remove = (i: number) => onChange(phones.filter((_, idx) => idx !== i));
    const set = (i: number, f: string, v: any) => onChange(phones.map((p, idx) => idx === i ? { ...p, [f]: v } : p));
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Phones</label>
                <button type="button" onClick={add} className="flex items-center gap-0.5 text-[10px] text-gray-600 hover:text-gray-900"><Plus size={10} />Add</button>
            </div>
            {phones.map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                    <input type="tel" placeholder="+1234567890" value={p.phone} onChange={(ev) => set(i, "phone", ev.target.value)}
                        className="flex-1 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500" />
                    <input placeholder="label" value={p.label} onChange={(ev) => set(i, "label", ev.target.value)}
                        className="w-20 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gray-500" />
                    <label className="flex items-center gap-0.5 text-[10px] text-green-700 cursor-pointer whitespace-nowrap">
                        <input type="checkbox" checked={p.is_whatsapp} onChange={(ev) => set(i, "is_whatsapp", ev.target.checked)} className="w-3 h-3" />WA
                    </label>
                    {phones.length > 1 && <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600"><X size={11} /></button>}
                </div>
            ))}
        </div>
    );
}

function PersonsField({ label, items, onChange, isTeam = false }: { label: string; items: any[]; onChange: (v: any) => void; isTeam?: boolean }) {
    const empty = () => isTeam ? emptyTeamMember() : emptyPerson();
    const add = () => onChange([...items, empty()]);
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const set = (i: number, f: string, v: any) => onChange(items.map((p, idx) => idx === i ? { ...p, [f]: v } : p));
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</label>
                <button type="button" onClick={add} className="flex items-center gap-0.5 text-[10px] text-gray-600 hover:text-gray-900"><Plus size={10} />Add</button>
            </div>
            {items.length === 0 && <p className="text-[10px] text-gray-400 italic">No entries yet.</p>}
            {items.map((p, i) => (
                <div key={i} className="border border-gray-200 rounded p-1.5 grid grid-cols-2 gap-1 relative">
                    <button type="button" onClick={() => remove(i)} className="absolute top-1 right-1 text-red-400 hover:text-red-600"><X size={10} /></button>
                    <input placeholder="Name" value={p.name} onChange={(ev) => set(i, "name", ev.target.value)}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                    <input placeholder="Designation" value={p.designation} onChange={(ev) => set(i, "designation", ev.target.value)}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                    <input type="email" placeholder="Email" value={p.email} onChange={(ev) => set(i, "email", ev.target.value)}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                    <input type="tel" placeholder="Phone" value={p.phone} onChange={(ev) => set(i, "phone", ev.target.value)}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                    <input placeholder="LinkedIn URL" value={p.linkedin_url} onChange={(ev) => set(i, "linkedin_url", ev.target.value)}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 col-span-2" />
                    {isTeam && (
                        <input placeholder="Role in team" value={p.role} onChange={(ev) => set(i, "role", ev.target.value)}
                            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 col-span-2" />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function ClientFormModal({ editing, onClose, onSaved }: { editing: any | null; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState<typeof EMPTY_FORM>(() => {
        if (!editing?.id) return { ...EMPTY_FORM };
        return {
            ...EMPTY_FORM, ...editing,
            emails: editing.emails?.length ? editing.emails : [emptyEmail()],
            phones: editing.phones?.length ? editing.phones : [emptyPhone()],
            key_persons: editing.key_persons || [],
            team_members: editing.team_members || [],
            followup_history: editing.followup_history || [],
        };
    });
    const [saving, setSaving] = useState(false);
    const [urlError, setUrlError] = useState("");
    const [activeTab, setActiveTab] = useState<"basic" | "contract" | "teams" | "followup">("basic");

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
            showAppNotification("error", "Validation", "LinkedIn URL must be a valid URL."); return;
        }
        setSaving(true);
        const payload = {
            ...form,
            emails: form.emails.filter((e) => e.email.trim()),
            phones: form.phones.filter((p) => p.phone.trim()),
        };
        const res = editing?.id ? await updateClient(payload, editing.id) : await createClient(payload);
        setSaving(false);
        if (res) { onSaved(); closeAfter ? onClose() : setForm({ ...EMPTY_FORM }); }
    };

    const TABS = [
        { id: "basic", label: "Personal & Company" },
        { id: "contract", label: "Contract" },
        { id: "teams", label: "Teams" },
        { id: "followup", label: "Follow-up" },
    ] as const;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-2xl shadow-lg max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 shrink-0">
                    <span className="text-xs font-semibold text-gray-700">{editing?.id ? "Edit Client" : "Add Client"}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 shrink-0">
                    {TABS.map((t) => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px ${activeTab === t.id ? "border-gray-800 text-gray-800" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <form onSubmit={(e) => e.preventDefault()} className="p-3 overflow-y-auto flex-1">

                    {/* ── Basic ── */}
                    {activeTab === "basic" && (
                        <div className="grid gap-2">
                            <SectionHeader icon={FileText} title="Personal Details" />
                            <div className="grid grid-cols-2 gap-2">
                                <CInput label="First Name" name="first_name" value={form.first_name} onChange={handleChange} required />
                                <CInput label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} required />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <CInput label="LinkedIn URL" name="linkedin_url" value={form.linkedin_url} onChange={handleChange} error={urlError} />
                                <CInput label="Designation" name="designation" value={form.designation} onChange={handleChange} />
                            </div>
                            <EmailsField emails={form.emails} onChange={(v) => setForm((p) => ({ ...p, emails: v }))} />
                            <PhonesField phones={form.phones} onChange={(v) => setForm((p) => ({ ...p, phones: v }))} />

                            <SectionHeader icon={Building2} title="Company Details" />
                            <div className="grid grid-cols-2 gap-2">
                                <CInput label="Company Name" name="company_name" value={form.company_name} onChange={handleChange} />
                                <CInput label="Website" name="website" value={form.website} onChange={handleChange} placeholder="https://..." />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <CInput label="Location" name="location" value={form.location} onChange={handleChange} />
                                <CSelect label="Source" name="source" value={form.source} onChange={handleChange} options={SOURCES} />
                            </div>
                        </div>
                    )}

                    {/* ── Contract ── */}
                    {activeTab === "contract" && (
                        <div className="grid gap-2">
                            <SectionHeader icon={FileText} title="Contract Details" />
                            <CSelect label="Contract Status" name="contract_status" value={form.contract_status} onChange={handleChange} options={CONTRACT_STATUSES} />
                            <CTextarea label="Job Description" name="job_description" value={form.job_description} onChange={handleChange} rows={4} placeholder="Describe the job or project…" />
                            <CTextarea label="Proposal Submitted" name="proposal_submitted" value={form.proposal_submitted} onChange={handleChange} rows={4} placeholder="Paste the proposal text…" />
                            <CTextarea label="Contract Notes" name="contract_notes" value={form.contract_notes} onChange={handleChange} rows={3} placeholder="How did the contract go? Key takeaways…" />
                        </div>
                    )}

                    {/* ── Teams ── */}
                    {activeTab === "teams" && (
                        <div className="grid gap-3">
                            <SectionHeader icon={Users} title="Key Persons" />
                            <PersonsField label="Key Persons (decision makers, main contacts)" items={form.key_persons}
                                onChange={(v) => setForm((p) => ({ ...p, key_persons: v }))} isTeam={false} />
                            <SectionHeader icon={Users} title="Team Members" />
                            <PersonsField label="Team Members (people you worked with)" items={form.team_members}
                                onChange={(v) => setForm((p) => ({ ...p, team_members: v }))} isTeam={true} />
                        </div>
                    )}

                    {/* ── Follow-up ── */}
                    {activeTab === "followup" && (
                        <div className="grid gap-2">
                            <SectionHeader icon={Clock} title="Follow-up Schedule" />
                            <div className="grid grid-cols-2 gap-2">
                                <CSelect label="Follow-up After" name="followup_after" value={form.followup_after} onChange={handleChange} options={FOLLOWUP_AFTER_OPTIONS} />
                                <CInput label="Next Follow-up Date" name="next_followup_date" value={form.next_followup_date} onChange={handleChange} type="date" />
                            </div>
                            <CTextarea label="Follow-up Message Template" name="followup_message" value={form.followup_message} onChange={handleChange} rows={4}
                                placeholder="Hi [Name], I wanted to follow up on our previous work together…" />

                            {/* Read-only history in form */}
                            {form.followup_history.length > 0 && (
                                <>
                                    <SectionHeader icon={Clock} title="History" />
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {form.followup_history.map((h, i) => (
                                            <div key={i} className="border border-gray-100 rounded p-1.5 text-[11px]">
                                                <div className="flex justify-between text-gray-400 mb-0.5">
                                                    <span>{h.date}</span><span>{new Date(h.logged_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                                                </div>
                                                <p className="text-gray-700">{h.message}</p>
                                                {h.notes && <p className="text-gray-400 italic">{h.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-100 shrink-0">
                    <button type="button" onClick={onClose} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={() => handleSave(!!editing?.id)} disabled={saving}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50">
                        {saving ? "Saving…" : "Save"}
                    </button>
                    {!editing?.id && (
                        <button type="button" onClick={() => handleSave(true)} disabled={saving}
                            className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                            {saving ? "Saving…" : "Save & Close"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Log Follow-up Modal ──────────────────────────────────────────────────────

function LogFollowupModal({ clientId, onClose, onLogged }: { clientId: string; onClose: () => void; onLogged: () => void }) {
    const [msg, setMsg] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const handleLog = async () => {
        if (!msg.trim()) { showAppNotification("error", "Validation", "Message is required."); return; }
        setSaving(true);
        const res = await logClientFollowup(clientId, { message: msg, notes });
        setSaving(false);
        if (res) { onLogged(); onClose(); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-md shadow-lg">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">Log Follow-up</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
                <div className="p-3 grid gap-2">
                    <CTextarea label="Message Sent" name="message" value={msg} onChange={(e: any) => setMsg(e.target.value)} rows={3} placeholder="What did you send / say?" />
                    <CTextarea label="Notes (optional)" name="notes" value={notes} onChange={(e: any) => setNotes(e.target.value)} rows={2} placeholder="Any outcome or observations…" />
                </div>
                <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-100">
                    <button onClick={onClose} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                    <button onClick={handleLog} disabled={saving} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                        {saving ? "Saving…" : "Log"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Expanded Row ─────────────────────────────────────────────────────────────

function ExpandedRow({ pro, colSpan, onLogFollowup }: { pro: any; colSpan: number; onLogFollowup: () => void }) {
    const emails: any[] = pro.emails || [];
    const phones: any[] = pro.phones || [];
    const keyPersons: any[] = pro.key_persons || [];
    const teamMembers: any[] = pro.team_members || [];
    const history: any[] = pro.followup_history || [];

    return (
        <tr className="bg-gray-50 border-b border-gray-200">
            <td colSpan={colSpan} className="px-3 py-2">
                <div className="grid grid-cols-3 gap-4 text-xs">

                    {/* Col 1 — Personal + Contact */}
                    <div className="space-y-1.5">
                        {pro.linkedin_url && (
                            <div>
                                <span className="text-[10px] text-gray-400 block">LinkedIn</span>
                                <a href={pro.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 truncate">
                                    {pro.linkedin_url} <ExternalLink size={9} />
                                </a>
                            </div>
                        )}
                        {emails.length > 1 && (
                            <div>
                                <span className="text-[10px] text-gray-400 block mb-0.5">All Emails</span>
                                {emails.map((e, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <span className="text-gray-700 truncate">{e.email}</span>
                                        {e.label && <span className="text-[9px] text-gray-400">({e.label})</span>}
                                        <button onClick={() => copyText(e.email)} className="text-gray-400 hover:text-gray-600"><Copy size={9} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {phones.length > 1 && (
                            <div>
                                <span className="text-[10px] text-gray-400 block mb-0.5">All Phones</span>
                                {phones.map((p, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        {p.is_whatsapp
                                            ? <a href={whatsappUrl(p.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-green-700 hover:underline"><MessageCircle size={9} />{p.phone}</a>
                                            : <span className="text-gray-700">{p.phone}</span>}
                                        {p.label && <span className="text-[9px] text-gray-400">({p.label})</span>}
                                        <button onClick={() => copyText(p.phone)} className="text-gray-400 hover:text-gray-600"><Copy size={9} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {pro.contract_notes && (
                            <div>
                                <span className="text-[10px] text-gray-400 block mb-0.5">Contract Notes</span>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{pro.contract_notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Col 2 — Teams */}
                    <div className="space-y-1.5">
                        {keyPersons.length > 0 && (
                            <div>
                                <span className="text-[10px] text-gray-400 font-semibold block mb-1">Key Persons</span>
                                {keyPersons.map((kp, i) => (
                                    <div key={i} className="border-l-2 border-gray-200 pl-1.5 mb-1">
                                        <p className="font-medium text-gray-800">{kp.name} {kp.designation && <span className="text-gray-400 font-normal">· {kp.designation}</span>}</p>
                                        {kp.email && <p className="text-gray-600 flex items-center gap-1">{kp.email} <button onClick={() => copyText(kp.email)} className="text-gray-400 hover:text-gray-600"><Copy size={9} /></button></p>}
                                        {kp.phone && <p className="text-gray-600">{kp.phone}</p>}
                                        {kp.linkedin_url && <a href={kp.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-[10px]">LinkedIn</a>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {teamMembers.length > 0 && (
                            <div>
                                <span className="text-[10px] text-gray-400 font-semibold block mb-1">Team Members</span>
                                {teamMembers.map((tm, i) => (
                                    <div key={i} className="border-l-2 border-indigo-200 pl-1.5 mb-1">
                                        <p className="font-medium text-gray-800">{tm.name} {tm.role && <span className="text-gray-400 font-normal">· {tm.role}</span>}</p>
                                        {tm.designation && <p className="text-gray-500">{tm.designation}</p>}
                                        {tm.email && <p className="text-gray-600 flex items-center gap-1">{tm.email} <button onClick={() => copyText(tm.email)} className="text-gray-400 hover:text-gray-600"><Copy size={9} /></button></p>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {keyPersons.length === 0 && teamMembers.length === 0 && (
                            <p className="text-gray-400 italic text-[11px]">No team members added.</p>
                        )}
                    </div>

                    {/* Col 3 — Follow-up */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-semibold">Follow-up</span>
                            <button onClick={onLogFollowup}
                                className="flex items-center gap-0.5 text-[10px] border border-gray-300 rounded px-1.5 py-0.5 hover:bg-white">
                                <Plus size={9} /> Log
                            </button>
                        </div>
                        {pro.next_followup_date && (
                            <div className="flex items-center gap-1 text-[11px]">
                                <Calendar size={10} className="text-gray-400" />
                                <span className="text-gray-600">Next: <strong>{formatDate(pro.next_followup_date)}</strong></span>
                                {pro.followup_after && <span className="text-gray-400">({pro.followup_after})</span>}
                            </div>
                        )}
                        {pro.followup_message && (
                            <div>
                                <span className="text-[10px] text-gray-400 block mb-0.5">Template</span>
                                <p className="text-gray-600 text-[11px] line-clamp-3">{pro.followup_message}</p>
                            </div>
                        )}
                        {history.length > 0 && (
                            <div>
                                <span className="text-[10px] text-gray-400 block mb-0.5">History ({history.length})</span>
                                <div className="space-y-1 max-h-36 overflow-y-auto">
                                    {[...history].reverse().map((h, i) => (
                                        <div key={i} className="border-l-2 border-blue-200 pl-1.5 text-[11px]">
                                            <p className="text-gray-400">{h.date}</p>
                                            <p className="text-gray-700">{h.message}</p>
                                            {h.notes && <p className="text-gray-400 italic">{h.notes}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!pro.next_followup_date && history.length === 0 && (
                            <p className="text-gray-400 italic text-[11px]">No follow-up scheduled.</p>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientsTable() {
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
    const [logFollowupId, setLogFollowupId] = useState<string | null>(null);

    useEffect(() => { setIsAdmin(getIsAdmin()); }, []);

    const load = useCallback(async (pg: number, lim: number, af: typeof EMPTY_FILTERS) => {
        setLoading(true);
        const params: any = { ...af, page: pg, limit: lim };
        Object.keys(params).forEach((k) => { if (params[k] === "") delete params[k]; });
        const res = await getAllClients(params);
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
        const res = await deleteClient(id);
        if (res) load(page, limit, appliedFilters);
    };

    const toggleExpand = (id: string) => setExpandedId((p) => p === id ? null : id);
    const COL_SPAN = 9;

    return (
        <div className="p-3 bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-sm font-semibold text-gray-800">Clients</h1>
                <button onClick={() => { setEditing(null); setShowForm(true); }}
                    className="flex items-center gap-1 text-xs bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700">
                    <Plus size={12} /> Add
                </button>
            </div>

            {/* Filter Bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                    {[
                        { name: "search_name", placeholder: "Search name…" },
                        { name: "search_company", placeholder: "Search company…" },
                        { name: "search_email", placeholder: "Search email…" },
                    ].map(({ name, placeholder }) => (
                        <div key={name} className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">{name.replace("search_", "")}</label>
                            <input name={name} value={(filters as any)[name]} onChange={handleFilterChange} placeholder={placeholder}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500" />
                        </div>
                    ))}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Date Added</label>
                        <select name="date_filter" value={filters.date_filter} onChange={handleFilterChange}
                            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white">
                            <option value="">Any time</option>
                            {DATE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>

                {filters.date_filter === "custom" && (
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">From</label>
                            <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">To</label>
                            <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none" />
                        </div>
                    </div>
                )}

                <div className="flex items-end gap-1.5">
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Source</label>
                        <select name="source" value={filters.source} onChange={handleFilterChange}
                            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none bg-white">
                            <option value="">All</option>
                            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Contract Status</label>
                        <select name="contract_status" value={filters.contract_status} onChange={handleFilterChange}
                            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none bg-white">
                            <option value="">All</option>
                            {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
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
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Company</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Email</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Source</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Contract</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Next Follow-up</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Added</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={COL_SPAN + 1} className="text-center py-6 text-gray-400 text-xs">Loading…</td></tr>}
                        {!loading && data.length === 0 && <tr><td colSpan={COL_SPAN + 1} className="text-center py-6 text-gray-400 text-xs">No clients found.</td></tr>}
                        {!loading && data.map((client, idx) => {
                            const isExpanded = expandedId === client.id;
                            const rowNum = (page - 1) * limit + idx + 1;
                            const emails: any[] = client.emails || [];
                            const firstEmail = emails[0];
                            const hasFollowup = !!client.next_followup_date;
                            const isOverdue = hasFollowup && new Date(client.next_followup_date) < new Date();

                            return (
                                <>
                                    <tr key={client.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isExpanded ? "bg-blue-50" : ""}`}>
                                        <td className="px-1 py-1 text-gray-400 border-r border-gray-100 text-center">{rowNum}</td>
                                        <td className="px-1 py-1 border-r border-gray-100 text-center">
                                            <button onClick={() => toggleExpand(client.id)} className="text-gray-400 hover:text-gray-700">
                                                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                            </button>
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap font-medium text-gray-800">
                                            {client.first_name} {client.last_name}
                                            {client.designation && <span className="text-gray-400 font-normal ml-1 text-[10px]">{client.designation}</span>}
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-100 max-w-[140px]">
                                            <div className="truncate text-gray-700">{client.company_name || "—"}</div>
                                            {client.location && <div className="text-[10px] text-gray-400 truncate">{client.location}</div>}
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-100 max-w-[150px]">
                                            {firstEmail ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="truncate text-gray-700">{firstEmail.email}</span>
                                                    <button onClick={() => copyText(firstEmail.email)} className="shrink-0 text-gray-400 hover:text-gray-600"><Copy size={10} /></button>
                                                    {emails.length > 1 && <span className="text-[9px] text-gray-400">+{emails.length - 1}</span>}
                                                </div>
                                            ) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {client.source
                                                ? <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${SOURCE_COLORS[client.source] || "bg-gray-100 text-gray-600"}`}>{client.source}</span>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {client.contract_status
                                                ? <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${CONTRACT_COLORS[client.contract_status] || "bg-gray-100 text-gray-600"}`}>{client.contract_status}</span>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className={`px-2 py-1 border-r border-gray-100 whitespace-nowrap text-[11px] ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                                            {hasFollowup ? (
                                                <span className="flex items-center gap-0.5">
                                                    {isOverdue && <span className="text-red-500">⚠</span>}
                                                    {formatDate(client.next_followup_date)}
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-100 text-gray-500 whitespace-nowrap">{formatDate(client.createdAt)}</td>
                                        <td className="px-2 py-1">
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => { setEditing(client); setShowForm(true); }} className="text-gray-500 hover:text-gray-800"><Pencil size={11} /></button>
                                                {isAdmin && (
                                                    <button onClick={() => handleDelete(client.id, `${client.first_name} ${client.last_name}`)} className="text-red-400 hover:text-red-600">
                                                        <Trash2 size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <ExpandedRow key={`${client.id}-exp`} pro={client} colSpan={COL_SPAN + 1}
                                            onLogFollowup={() => setLogFollowupId(client.id)} />
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
                        let n = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
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

            {/* Modals */}
            {showForm && <ClientFormModal editing={editing} onClose={() => setShowForm(false)} onSaved={() => load(page, limit, appliedFilters)} />}
            {logFollowupId && (
                <LogFollowupModal clientId={logFollowupId} onClose={() => setLogFollowupId(null)}
                    onLogged={() => load(page, limit, appliedFilters)} />
            )}
        </div>
    );
}
