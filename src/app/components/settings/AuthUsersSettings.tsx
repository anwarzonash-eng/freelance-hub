"use client";
import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { getAllNavRoles } from "@/app/components/Header";
import {
    listAuthUsers,
    addAuthUser,
    updateAuthUser,
    deleteAuthUser,
} from "@/app/api_handlers/api/auth.api";

const ALL_NAV_ROLES = getAllNavRoles();

// Mirrors the sidebar navItems structure
const NAV_GROUPS = [
    {
        label: "Leads",
        roles: [
            { label: "All Leads", value: "/leads" },
            { label: "Upwork Jobs", value: "/upwork-jobs" },
        ],
    },
    {
        label: "Personal Websites",
        roles: [
            { label: "Websites", value: "/manage-detail-profiles" },
            { label: "Main Profiles", value: "/main-profiles" },
            { label: "Portfolios", value: "/manage-portfolios" },
            { label: "Educations", value: "/manage-educations" },
            { label: "Experiences", value: "/experiences" },
            { label: "Media Upload", value: "/media-upload" },
            { label: "Testimonials", value: "/manage-testimonials" },
            { label: "FAQ", value: "/faq" },
            { label: "Skill Groups", value: "/manage-skill-groups" },
            { label: "Skills", value: "/manage-skills" },
            { label: "Categories", value: "/manage-categories" },
        ],
    },
    {
        label: "Jobs",
        roles: [
            { label: "AI Jobs", value: "/jobs/ai-jobs" },
            { label: "Companies", value: "/jobs/companies" },
            { label: "Listed Jobs", value: "/jobs/listed-jobs" },
            { label: "CVs", value: "/jobs/cvs" },
            { label: "Applicants", value: "/applicants" },
        ],
    },
    {
        label: "Professionals",
        roles: [
            { label: "All Professionals", value: "/professionals" },
            { label: "Email Campaigns", value: "/professionals/email-campaigns" },
            { label: "Clients", value: "/clients" },
        ],
    },
];

const GROUP_ROLE_VALUES = new Set(NAV_GROUPS.flatMap(g => g.roles.map(r => r.value)));

// Roles not belonging to any nav group (*, /auth, /settings, /viewCV, /best-match, etc.)
const ADDITIONAL_ROLES = ALL_NAV_ROLES.filter(r => !GROUP_ROLE_VALUES.has(r.value));

function groupState(roles: string[], groupRoles: { value: string }[]): "all" | "some" | "none" {
    const selected = groupRoles.filter(r => roles.includes(r.value)).length;
    if (selected === 0) return "none";
    if (selected === groupRoles.length) return "all";
    return "some";
}

function RoleTree({ roles, onChange }: { roles: string[]; onChange: (roles: string[]) => void }) {
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(NAV_GROUPS.map(g => g.label)));

    const toggleGroup = (label: string) =>
        setOpenGroups(prev => {
            const s = new Set(prev);
            if (s.has(label)) s.delete(label); else s.add(label);
            return s;
        });

    const toggleGroupRoles = (groupRoles: { value: string }[], state: "all" | "some" | "none") => {
        const vals = groupRoles.map(r => r.value);
        if (state === "all") {
            onChange(roles.filter(r => !vals.includes(r)));
        } else {
            const next = [...roles];
            vals.forEach(v => { if (!next.includes(v)) next.push(v); });
            onChange(next);
        }
    };

    const toggleRole = (value: string) => {
        if (roles.includes(value)) {
            onChange(roles.filter(r => r !== value));
        } else {
            onChange([...roles, value]);
        }
    };

    const allNonSpecial = ALL_NAV_ROLES.filter(r => r.value !== "*").map(r => r.value);
    const starSelected = roles.includes("*");

    return (
        <div className="border border-gray-200 rounded bg-white divide-y divide-gray-100">
            {/* Nav groups */}
            {NAV_GROUPS.map(group => {
                const state = groupState(roles, group.roles);
                const isOpen = openGroups.has(group.label);
                return (
                    <div key={group.label}>
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 cursor-pointer select-none"
                            onClick={() => toggleGroup(group.label)}>
                            <input
                                type="checkbox"
                                className="w-3 h-3 shrink-0"
                                checked={state === "all"}
                                ref={el => { if (el) el.indeterminate = state === "some"; }}
                                onChange={() => toggleGroupRoles(group.roles, state)}
                                onClick={e => e.stopPropagation()}
                            />
                            <span className="text-[11px] font-semibold text-gray-700 flex-1">{group.label}</span>
                            <span className="text-[10px] text-gray-400">
                                {group.roles.filter(r => roles.includes(r.value)).length}/{group.roles.length}
                            </span>
                            {isOpen
                                ? <ChevronDown size={11} className="text-gray-400 shrink-0" />
                                : <ChevronRight size={11} className="text-gray-400 shrink-0" />}
                        </div>
                        {isOpen && (
                            <div className="pl-6 pr-2 py-1 flex flex-col gap-0.5">
                                {group.roles.map(r => (
                                    <label key={r.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                                        <input
                                            type="checkbox"
                                            className="w-3 h-3"
                                            checked={roles.includes(r.value)}
                                            onChange={() => toggleRole(r.value)}
                                        />
                                        <span className="text-[10px] text-gray-700">{r.label}</span>
                                        <span className="text-[9px] text-gray-400 font-mono ml-auto">{r.value}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Additional roles */}
            <div>
                <div className="px-2 py-1.5 bg-gray-50">
                    <span className="text-[11px] font-semibold text-gray-700">Additional Roles</span>
                </div>
                <div className="pl-2 pr-2 py-1 flex flex-col gap-0.5">
                    {ADDITIONAL_ROLES.map(r => (
                        <label key={r.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                            <input
                                type="checkbox"
                                className="w-3 h-3"
                                checked={r.value === "*"
                                    ? starSelected || roles.filter(v => v !== "*").length === allNonSpecial.length
                                    : roles.includes(r.value)}
                                onChange={() => {
                                    if (r.value === "*") {
                                        if (starSelected) {
                                            onChange(roles.filter(v => v !== "*"));
                                        } else {
                                            onChange([...new Set([...roles, "*"])]);
                                        }
                                    } else {
                                        toggleRole(r.value);
                                    }
                                }}
                            />
                            <span className="text-[10px] text-gray-700">{r.label}</span>
                            <span className="text-[9px] text-gray-400 font-mono ml-auto">{r.value}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}

function RolesSummary({ roles }: { roles: string[] }) {
    if (!Array.isArray(roles) || roles.length === 0) return <span className="text-[10px] text-gray-300">—</span>;
    if (roles.includes("*")) return <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">All Access</span>;

    const groupBadges = NAV_GROUPS.map(g => {
        const matched = g.roles.filter(r => roles.includes(r.value));
        if (matched.length === 0) return null;
        const isFull = matched.length === g.roles.length;
        return (
            <span key={g.label}
                className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${isFull ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                title={matched.map(r => r.label).join(", ")}>
                {g.label}{!isFull && ` (${matched.length}/${g.roles.length})`}
            </span>
        );
    }).filter(Boolean);

    const extras = roles.filter(v => !GROUP_ROLE_VALUES.has(v) && v !== "*");
    const extraBadges = extras.map(v => {
        const found = ADDITIONAL_ROLES.find(r => r.value === v);
        return (
            <span key={v} className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                {found?.label || v}
            </span>
        );
    });

    return (
        <div className="flex flex-wrap gap-1">
            {groupBadges}
            {extraBadges}
        </div>
    );
}

const emptyForm = {
    userid: "",
    password: "",
    roles: [] as string[],
    role: "user",
};

export default function AuthUsersSettings() {
    const [users, setUsers] = useState<any[]>([]);
    const [form, setForm] = useState({ ...emptyForm });
    const [editId, setEditId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showFormPassword, setShowFormPassword] = useState(false);
    const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

    const toggleReveal = (id: string) => {
        setRevealedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const fetchUsers = async () => {
        setLoading(true);
        const res = await listAuthUsers();
        setUsers(res?.data || res || []);
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (editId) {
            await updateAuthUser(form, { path: { id: editId } });
        } else {
            await addAuthUser(form);
        }
        setForm({ ...emptyForm });
        setEditId(null);
        setShowForm(false);
        fetchUsers();
    };

    const handleEdit = (user: any) => {
        setForm({
            userid: user.userid || "",
            password: user.password || "",
            roles: Array.isArray(user.roles) ? user.roles : [],
            role: user.role || "user",
        });
        setEditId(user.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this user?")) return;
        await deleteAuthUser({ path: { id } });
        fetchUsers();
    };

    const cancelForm = () => {
        setForm({ ...emptyForm });
        setEditId(null);
        setShowForm(false);
    };

    return (
        <div className="p-3">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">{users.length} users</span>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-1 text-xs bg-gray-800 text-white rounded px-3 py-1 hover:bg-gray-700"
                    >
                        <Plus size={12} /> Add User
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-3 mb-3 bg-gray-50">
                    <div className="text-xs font-semibold text-gray-700 mb-2">{editId ? "Edit User" : "Add New User"}</div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">User ID</label>
                            <input
                                name="userid"
                                value={form.userid}
                                onChange={handleChange}
                                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 uppercase">Password</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showFormPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={handleChange}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none w-full pr-7"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowFormPassword((v) => !v)}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                >
                                    {showFormPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5 mb-3">
                        <label className="text-[10px] text-gray-400 uppercase">Role</label>
                        <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none w-40"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-0.5 mb-3">
                        <label className="text-[10px] text-gray-400 uppercase">Page Access</label>
                        <RoleTree
                            roles={form.roles}
                            onChange={roles => setForm(f => ({ ...f, roles }))}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700">
                            {editId ? "Update" : "Add"} User
                        </button>
                        <button type="button" onClick={cancelForm} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">User ID</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Password</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Role</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Page Access</th>
                            <th className="px-2 py-1.5 w-14"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-xs">Loading…</td></tr>
                        )}
                        {!loading && users.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-xs">No users found.</td></tr>
                        )}
                        {!loading && users
                            .filter((u: any) => u.id !== "00000000-0000-0000-0000-000000000001")
                            .map((user: any) => (
                                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-2 py-1.5 border-r border-gray-100 font-medium text-gray-800">{user.userid}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-[10px]">
                                                {revealedIds.has(user.id) ? user.password : "••••••••"}
                                            </span>
                                            <button type="button" onClick={() => toggleReveal(user.id)} className="text-gray-400 hover:text-gray-700">
                                                {revealedIds.has(user.id) ? <EyeOff size={11} /> : <Eye size={11} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                                            {user.role || "user"}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 border-r border-gray-100 max-w-[340px]">
                                        <RolesSummary roles={user.roles} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => handleEdit(user)} title="Edit" className="text-gray-400 hover:text-blue-600">
                                                <Pencil size={12} />
                                            </button>
                                            <button onClick={() => handleDelete(user.id)} title="Delete" className="text-gray-400 hover:text-red-600">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
