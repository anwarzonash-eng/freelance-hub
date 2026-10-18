"use client";
import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getAllNavRoles } from "../components/Header";
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
  roles: [],
  role: "user",
};

export default function AuthCrudPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Select-all logic for roles
  const handleRoleChange = (role: string) => {
    setForm((prev) => {
      let roles = prev.roles;
      if (role === "*") {
        if (roles.includes("*")) {
          // Unselect all
          roles = [];
        } else {
          // Select all
          roles = NAV_ROLES.map((r) => r.value);
        }
      } else {
        if (roles.includes(role)) {
          roles = roles.filter((r: string) => r !== role);
        } else {
          roles = [...roles, role];
        }
        // If all roles except * are selected, add *
        const allRoleValues = NAV_ROLES.map((r) => r.value);
        const nonStarRoles = allRoleValues.filter((v) => v !== "*");
        const selectedNonStar = roles.filter((r) => r !== "*");
        if (selectedNonStar.length === nonStarRoles.length) {
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
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    await deleteAuthUser({ path: { id } });
    fetchUsers();
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Users Management</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded shadow p-6 mb-8 border border-gray-200"
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block font-semibold mb-1">User ID</label>
            <input
              name="userid"
              value={form.userid}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showFormPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded pr-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowFormPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showFormPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {/* Freelance Platform token fields removed */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">Roles</label>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {NAV_ROLES.map((role) => (
              <label
                key={role.value}
                className="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={form.roles.includes(role.value)}
                  onChange={() => handleRoleChange(role.value)}
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            {editId ? "Update" : "Add"} User
          </button>
          {editId && (
            <button
              type="button"
              className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
              onClick={() => {
                setForm({ ...emptyForm });
                setEditId(null);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="bg-white rounded shadow p-6 border border-gray-200">
        <h2 className="text-lg font-bold mb-4">Users List</h2>
        {loading ? (
          <div>Loading...</div>
        ) : users.length === 0 ? (
          <div>No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">User ID</th>
                <th className="p-2 text-left">Password</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Roles</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(
                  (user: any) =>
                    user.id != "00000000-0000-0000-0000-000000000001",
                )
                .map((user: any) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-2">{user.userid}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {revealedIds.has(user.id) ? user.password : "••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleReveal(user.id)}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          {revealedIds.has(user.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                        {user.role || "user"}
                      </span>
                    </td>
                    <td className="p-2">
                      {Array.isArray(user.roles) ? user.roles.join(", ") : ""}
                    </td>
                    <td className="p-2 flex gap-2">
                      <button
                        className="bg-yellow-500 text-white px-3 py-1 rounded"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
