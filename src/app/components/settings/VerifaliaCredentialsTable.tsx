"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";
import { showAppNotification } from "@/utils/notificationService";
import {
    getAllVerifaliaCredentials,
    createVerifaliaCredential,
    updateVerifaliaCredential,
    deleteVerifaliaCredential,
    checkVerifaliaBalance,
} from "@/app/api_handlers/api/verifalia-credentials.api";

interface Credential {
    id: string;
    label: string;
    username: string;
    is_active: boolean;
    priority: number;
    credits_remaining: number | null;
    credits_checked_at: string | null;
    last_used_at: string | null;
    createdAt: string;
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function CredentialFormModal({ editing, onClose, onSaved }: { editing: Credential | null; onClose: () => void; onSaved: () => void }) {
    const [label, setLabel] = useState(editing?.label || "");
    const [username, setUsername] = useState(editing?.username || "");
    const [password, setPassword] = useState("");
    const [priority, setPriority] = useState<string>(editing ? String(editing.priority) : "0");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!label.trim() || !username.trim()) {
            showAppNotification("error", "Validation", "Label and username are required.");
            return;
        }
        if (!editing?.id && !password.trim()) {
            showAppNotification("error", "Validation", "Password is required.");
            return;
        }
        const parsedPriority = parseInt(priority, 10) || 0;
        setSaving(true);
        const res = editing?.id
            ? await updateVerifaliaCredential(editing.id, {
                label,
                username,
                priority: parsedPriority,
                ...(password.trim() ? { password } : {}),
            })
            : await createVerifaliaCredential({ label, username, password, priority: parsedPriority });
        setSaving(false);
        if (res) { onSaved(); onClose(); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-sm shadow-lg">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">{editing?.id ? "Edit Verifalia Account" : "Add Verifalia Account"}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="p-3 space-y-2">
                    <div>
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide block mb-0.5">Label *</label>
                        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder='e.g. "Main Account"'
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500" />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide block mb-0.5">Username / Account SID *</label>
                        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. you@example.com"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500" />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide block mb-0.5">
                            Password {editing?.id ? "" : "*"}
                        </label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder={editing?.id ? "Leave blank to keep current password" : ""}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500" />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide block mb-0.5">Priority</label>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500"
                        />
                        <p className="text-[10px] text-gray-400 mt-0.5">Lower number = used first. Accounts are tried in order until one has credits.</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-100">
                    <button onClick={onClose} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Credential Row ───────────────────────────────────────────────────────────

function CredentialRow({
    cred, idx, onEdit, onDelete, onToggleActive, onCheckBalance, checkingId,
}: {
    cred: Credential; idx: number;
    onEdit: () => void; onDelete: () => void;
    onToggleActive: () => void; onCheckBalance: () => void;
    checkingId: string | null;
}) {
    const isChecking = checkingId === cred.id;
    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-2 py-2 text-gray-400 border-r border-gray-100 text-center text-xs w-8">{idx + 1}</td>
            <td className="px-3 py-2 border-r border-gray-100">
                <p className="text-xs font-medium text-gray-800">{cred.label}</p>
                <p className="text-[10px] text-gray-400">{cred.username}</p>
            </td>
            <td className="px-3 py-2 border-r border-gray-100 text-center text-xs text-gray-600">{cred.priority}</td>
            <td className="px-3 py-2 border-r border-gray-100 text-center">
                {cred.is_active ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                        <CheckCircle size={9} /> Active
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                        <XCircle size={9} /> Inactive
                    </span>
                )}
            </td>
            <td className="px-3 py-2 border-r border-gray-100 text-center text-xs text-gray-600">
                {cred.credits_remaining != null ? cred.credits_remaining.toFixed(2) : "—"}
                {cred.credits_checked_at && (
                    <p className="text-[9px] text-gray-400">
                        {new Date(cred.credits_checked_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                )}
            </td>
            <td className="px-3 py-2 text-[10px] text-gray-400 whitespace-nowrap border-r border-gray-100">
                {cred.last_used_at ? new Date(cred.last_used_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
            </td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={onCheckBalance} disabled={isChecking}
                        className="flex items-center gap-1 text-[10px] border border-blue-300 text-blue-600 rounded px-2 py-0.5 hover:bg-blue-50 disabled:opacity-50">
                        {isChecking ? <><Loader2 size={10} className="animate-spin" /> Checking…</> : <><RefreshCw size={10} /> Check Balance</>}
                    </button>
                    <button onClick={onToggleActive}
                        className="text-[10px] border border-gray-300 text-gray-600 rounded px-2 py-0.5 hover:bg-gray-50">
                        {cred.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={onEdit} className="text-gray-500 hover:text-gray-800 ml-1"><Pencil size={11} /></button>
                    <button onClick={onDelete} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                </div>
            </td>
        </tr>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VerifaliaCredentialsTable() {
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Credential | null>(null);
    const [checkingId, setCheckingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getAllVerifaliaCredentials();
        if (res?.data) setCredentials(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id: string, label: string) => {
        if (!confirm(`Delete "${label}"?`)) return;
        const res = await deleteVerifaliaCredential(id);
        if (res) { showAppNotification("success", "Deleted", `"${label}" removed.`); load(); }
    };

    const handleToggleActive = async (cred: Credential) => {
        const res = await updateVerifaliaCredential(cred.id, { is_active: !cred.is_active });
        if (res) load();
    };

    const handleCheckBalance = async (id: string) => {
        setCheckingId(id);
        const res = await checkVerifaliaBalance(id);
        setCheckingId(null);
        if (res) load();
        else showAppNotification("error", "Balance check failed", "Could not retrieve Verifalia balance.");
    };

    return (
        <div className="p-3">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="text-sm font-semibold text-gray-700">Verifalia Credentials</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Add multiple Verifalia accounts. Email verification tries accounts in priority order and
                        automatically falls back to the next account when one runs out of credits.
                    </p>
                </div>
                <button onClick={() => { setEditing(null); setShowForm(true); }}
                    className="flex items-center gap-1 text-xs bg-gray-800 text-white rounded px-3 py-1.5 hover:bg-gray-700 shrink-0">
                    <Plus size={12} /> Add Account
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-400 text-xs gap-2">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
            ) : credentials.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs border border-gray-200 rounded">No Verifalia accounts configured yet.</div>
            ) : (
                <table className="w-full text-xs border-collapse border border-gray-200 rounded overflow-hidden">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-2 py-1.5 border-r border-gray-100 w-8"></th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-500 border-r border-gray-100">Account</th>
                            <th className="px-3 py-1.5 text-center font-medium text-gray-500 border-r border-gray-100">Priority</th>
                            <th className="px-3 py-1.5 text-center font-medium text-gray-500 border-r border-gray-100">Status</th>
                            <th className="px-3 py-1.5 text-center font-medium text-gray-500 border-r border-gray-100">Credits</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-500 border-r border-gray-100">Last Used</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {credentials.map((cred, idx) => (
                            <CredentialRow
                                key={cred.id}
                                cred={cred}
                                idx={idx}
                                onEdit={() => { setEditing(cred); setShowForm(true); }}
                                onDelete={() => handleDelete(cred.id, cred.label)}
                                onToggleActive={() => handleToggleActive(cred)}
                                onCheckBalance={() => handleCheckBalance(cred.id)}
                                checkingId={checkingId}
                            />
                        ))}
                    </tbody>
                </table>
            )}

            {showForm && (
                <CredentialFormModal
                    editing={editing}
                    onClose={() => setShowForm(false)}
                    onSaved={load}
                />
            )}
        </div>
    );
}
