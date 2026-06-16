"use client";
import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Pencil, Trash2 } from "lucide-react";
import { getAllNavRoles } from "@/app/components/Header";
import {
    listAuthUsers,
    addAuthUser,
    updateAuthUser,
    deleteAuthUser,
} from "@/app/api_handlers/api/auth.api";

const NAV_ROLES = getAllNavRoles();

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

    const handleRoleChange = (role: string) => {
        setForm((prev) => {
            let roles = [...prev.roles];
            if (role === "*") {
                roles = roles.includes("*") ? [] : NAV_ROLES.map((r) => r.value);
            } else {
                roles = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
                const allNonStar = NAV_ROLES.filter((r) => r.value !== "*").map((r) => r.value);
                const selectedNonStar = roles.filter((r) => r !== "*");
                if (selectedNonStar.length === allNonStar.length) {
                    if (!roles.includes("*")) roles = [...roles, "*"];
                } else {
                    roles = roles.filter((r) => r !== "*");
                }
            }
            return { ...prev, roles };
        });
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
                        <div className="border border-gray-200 rounded bg-white p-2 grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                            {NAV_ROLES.map((navRole) => (
                                <label key={navRole.value} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                    <input
                                        type="checkbox"
                                        checked={form.roles.includes(navRole.value)}
                                        onChange={() => handleRoleChange(navRole.value)}
                                        className="w-3 h-3"
                                    />
                                    <span className="text-[10px] text-gray-700">{navRole.label}</span>
                                </label>
                            ))}
                        </div>
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
                                    <td className="px-2 py-1.5 border-r border-gray-100 text-gray-500 max-w-[300px] truncate text-[10px]">
                                        {Array.isArray(user.roles) ? user.roles.join(", ") : "—"}
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
