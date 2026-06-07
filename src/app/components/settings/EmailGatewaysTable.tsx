"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, ShieldCheck, ShieldOff, Send, Inbox, RefreshCw, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { showAppNotification } from "@/utils/notificationService";
import {
    getAllGmailGateways,
    createGmailGateway,
    updateGmailGateway,
    deleteGmailGateway,
    getGmailAuthUrl,
    testGmailGateway,
    getGmailInbox,
} from "@/app/api_handlers/api/gmail-gateways.api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gateway {
    id: string;
    label: string;
    email: string | null;
    is_authorized: boolean;
    last_used_at: string | null;
    createdAt: string;
}

// ─── Inbox Modal ──────────────────────────────────────────────────────────────

function InboxModal({ gateway, onClose }: { gateway: Gateway; onClose: () => void }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("in:inbox");

    const load = useCallback(async (q: string) => {
        setLoading(true);
        const res = await getGmailInbox(gateway.id, q, 20);
        if (res?.data) setMessages(res.data);
        setLoading(false);
    }, [gateway.id]);

    useEffect(() => { load(query); }, [load, query]);

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-2xl shadow-lg max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 shrink-0">
                    <div>
                        <span className="text-xs font-semibold text-gray-700">Inbox — {gateway.label}</span>
                        <span className="text-[10px] text-gray-400 ml-2">{gateway.email}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 shrink-0">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder='Gmail search (e.g. "from:someone@gmail.com")'
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500"
                        onKeyDown={(e) => e.key === "Enter" && load(query)}
                    />
                    <button onClick={() => load(query)} className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
                        <RefreshCw size={11} /> Search
                    </button>
                </div>
                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-gray-400 text-xs gap-2">
                            <Loader2 size={14} className="animate-spin" /> Loading…
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-xs">No messages found.</div>
                    ) : (
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                    <th className="px-3 py-1.5 text-left font-medium text-gray-500 w-40">From</th>
                                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Subject</th>
                                    <th className="px-3 py-1.5 text-left font-medium text-gray-500 w-28 whitespace-nowrap">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.map((m) => (
                                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-1.5 text-gray-600 truncate max-w-[140px]">{m.from?.replace(/<.*>/, "").trim() || m.from}</td>
                                        <td className="px-3 py-1.5">
                                            <p className="font-medium text-gray-800 truncate">{m.subject || "(no subject)"}</p>
                                            <p className="text-gray-400 truncate text-[10px]">{m.snippet}</p>
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap text-[10px]">
                                            {m.date ? new Date(m.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Gateway Row ──────────────────────────────────────────────────────────────

function GatewayRow({
    gw, idx, onEdit, onDelete, onAuthorize, onTest, onInbox, testingId
}: {
    gw: Gateway; idx: number;
    onEdit: () => void; onDelete: () => void;
    onAuthorize: () => void; onTest: () => void; onInbox: () => void;
    testingId: string | null;
}) {
    const isTesting = testingId === gw.id;
    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-2 py-2 text-gray-400 border-r border-gray-100 text-center text-xs w-8">{idx + 1}</td>
            <td className="px-3 py-2 border-r border-gray-100">
                <p className="text-xs font-medium text-gray-800">{gw.label}</p>
                {gw.email && <p className="text-[10px] text-gray-400">{gw.email}</p>}
            </td>
            <td className="px-3 py-2 border-r border-gray-100 text-center">
                {gw.is_authorized ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                        <CheckCircle size={9} /> Authorized
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                        <XCircle size={9} /> Not authorized
                    </span>
                )}
            </td>
            <td className="px-3 py-2 border-r border-gray-100 text-[10px] text-gray-400 whitespace-nowrap">
                {gw.last_used_at ? new Date(gw.last_used_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
            </td>
            <td className="px-3 py-2 text-[10px] text-gray-400 whitespace-nowrap border-r border-gray-100">
                {new Date(gw.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
            </td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Authorize */}
                    <button onClick={onAuthorize}
                        className={`flex items-center gap-1 text-[10px] border rounded px-2 py-0.5 ${gw.is_authorized ? "border-gray-300 text-gray-500 hover:bg-gray-50" : "border-blue-300 text-blue-600 hover:bg-blue-50"}`}
                        title={gw.is_authorized ? "Re-authorize" : "Authorize"}>
                        {gw.is_authorized ? <><ShieldCheck size={10} /> Re-auth</> : <><ShieldOff size={10} /> Authorize</>}
                    </button>

                    {/* Test */}
                    {gw.is_authorized && (
                        <button onClick={onTest} disabled={isTesting}
                            className="flex items-center gap-1 text-[10px] border border-green-300 text-green-600 rounded px-2 py-0.5 hover:bg-green-50 disabled:opacity-50"
                            title="Send test email to yourself">
                            {isTesting ? <><Loader2 size={10} className="animate-spin" /> Testing…</> : <><Send size={10} /> Test</>}
                        </button>
                    )}

                    {/* Inbox */}
                    {gw.is_authorized && (
                        <button onClick={onInbox}
                            className="flex items-center gap-1 text-[10px] border border-gray-300 text-gray-600 rounded px-2 py-0.5 hover:bg-gray-50"
                            title="Browse inbox">
                            <Inbox size={10} /> Inbox
                        </button>
                    )}

                    {/* Edit */}
                    <button onClick={onEdit} className="text-gray-500 hover:text-gray-800 ml-1"><Pencil size={11} /></button>
                    {/* Delete */}
                    <button onClick={onDelete} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                </div>
            </td>
        </tr>
    );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function GatewayFormModal({ editing, onClose, onSaved }: { editing: Gateway | null; onClose: () => void; onSaved: () => void }) {
    const [label, setLabel] = useState(editing?.label || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!label.trim()) { showAppNotification("error", "Validation", "Label is required."); return; }
        setSaving(true);
        const res = editing?.id
            ? await updateGmailGateway(editing.id, { label })
            : await createGmailGateway({ label });
        setSaving(false);
        if (res) { onSaved(); onClose(); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border border-gray-200 w-full max-w-sm shadow-lg">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">{editing?.id ? "Edit Gateway" : "Add Gmail Gateway"}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="p-3">
                    <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide block mb-0.5">Label *</label>
                    <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder='e.g. "Business Outreach"'
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500 mb-2" />
                    {!editing?.id && (
                        <p className="text-[10px] text-gray-400 bg-gray-50 rounded p-2 leading-relaxed">
                            After creating, click <strong>Authorize</strong> to connect your Gmail account via Google OAuth.
                            You will be redirected to Google to grant permission.
                        </p>
                    )}
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

// ─── Setup Guide ──────────────────────────────────────────────────────────────

function SetupGuide({ onClose }: { onClose: () => void }) {
    return (
        <div className="border border-blue-200 rounded bg-blue-50 p-3 mb-3 text-xs relative">
            <button onClick={onClose} className="absolute top-2 right-2 text-blue-300 hover:text-blue-600"><X size={12} /></button>
            <p className="font-semibold text-blue-800 mb-1.5">Google Console Setup (one-time)</p>
            <ol className="space-y-1 text-blue-700 list-decimal list-inside leading-relaxed">
                <li>Go to <strong>console.cloud.google.com</strong> → create/select a project</li>
                <li><strong>APIs & Services → Library</strong> → search <em>Gmail API</em> → Enable</li>
                <li><strong>OAuth Consent Screen</strong> → External → fill name & email → Add scope <code className="bg-blue-100 px-0.5 rounded">https://mail.google.com/</code> → Add test users</li>
                <li><strong>Credentials → Create OAuth 2.0 Client ID</strong> → Web application → add redirect URI: <code className="bg-blue-100 px-0.5 rounded">http://localhost:3001/gmail-gateways/oauth-callback</code></li>
                <li>Copy <strong>Client ID</strong> and <strong>Client Secret</strong> → paste into <code className="bg-blue-100 px-0.5 rounded">.env</code>: <code className="bg-blue-100 px-0.5 rounded">GOOGLE_CLIENT_ID</code>, <code className="bg-blue-100 px-0.5 rounded">GOOGLE_CLIENT_SECRET</code>, <code className="bg-blue-100 px-0.5 rounded">GOOGLE_REDIRECT_URI</code></li>
            </ol>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmailGatewaysTable() {
    const searchParams = useSearchParams();
    const [gateways, setGateways] = useState<Gateway[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Gateway | null>(null);
    const [inboxGateway, setInboxGateway] = useState<Gateway | null>(null);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getAllGmailGateways();
        if (res?.data) setGateways(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
    }, []);

    // Handle redirect back from Google OAuth
    useEffect(() => {
        const auth = searchParams.get("auth");
        const id = searchParams.get("id");
        if (auth === "success") {
            showAppNotification("success", "Gateway authorized", "Gmail account connected successfully.");
            load();
        } else if (auth === "error") {
            const msg = searchParams.get("message") || "Authorization failed.";
            showAppNotification("error", "Authorization failed", decodeURIComponent(msg));
        }
        // eslint-disable-next-line
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAuthorize = async (gw: Gateway) => {
        const res = await getGmailAuthUrl(gw.id);
        if (res?.data?.authUrl) {
            window.location.href = res.data.authUrl;
        }
    };

    const handleTest = async (gw: Gateway) => {
        setTestingId(gw.id);
        await testGmailGateway(gw.id);
        setTestingId(null);
    };

    const handleDelete = async (gw: Gateway) => {
        if (!confirm(`Delete gateway "${gw.label}"? This will remove the OAuth tokens.`)) return;
        const res = await deleteGmailGateway(gw.id);
        if (res) load();
    };

    const authorizedCount = gateways.filter((g) => g.is_authorized).length;

    return (
        <div className="p-3 bg-white min-h-screen">
            {/* Page header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h1 className="text-sm font-semibold text-gray-800">Email Gateways</h1>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        {gateways.length} gateway{gateways.length !== 1 ? "s" : ""} · {authorizedCount} authorized
                    </p>
                </div>
                <button onClick={() => { setEditing(null); setShowForm(true); }}
                    className="flex items-center gap-1 text-xs bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700">
                    <Plus size={12} /> Add Gateway
                </button>
            </div>

            {showGuide && <SetupGuide onClose={() => setShowGuide(false)} />}

            {/* Table */}
            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="w-8 px-2 py-1.5 text-left font-medium text-gray-500 border-r border-gray-200">#</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Label / Email</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Status</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Last Used</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Added</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-xs">
                                <Loader2 size={14} className="inline animate-spin mr-1" />Loading…
                            </td></tr>
                        )}
                        {!loading && gateways.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-xs">
                                No gateways yet. Add one and authorize it to start sending emails.
                            </td></tr>
                        )}
                        {!loading && gateways.map((gw, idx) => (
                            <GatewayRow
                                key={gw.id}
                                gw={gw}
                                idx={idx}
                                testingId={testingId}
                                onEdit={() => { setEditing(gw); setShowForm(true); }}
                                onDelete={() => handleDelete(gw)}
                                onAuthorize={() => handleAuthorize(gw)}
                                onTest={() => handleTest(gw)}
                                onInbox={() => setInboxGateway(gw)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Usage note */}
            <p className="text-[10px] text-gray-400 mt-2">
                Authorized gateways can be used from Professionals, Clients, and other screens to send emails directly via Gmail.
            </p>

            {showForm && (
                <GatewayFormModal editing={editing} onClose={() => setShowForm(false)} onSaved={load} />
            )}
            {inboxGateway && (
                <InboxModal gateway={inboxGateway} onClose={() => setInboxGateway(null)} />
            )}
        </div>
    );
}
