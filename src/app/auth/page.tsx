"use client";
import React, { useEffect, useState } from "react";
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
  upwork_access_token: "",
  upwork_referesh_token: "",
  roles: [],
};

export default function AuthCrudPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleRoleChange = (role: string) => {
    setForm((prev) => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter((r: string) => r !== role)
        : [...prev.roles, role];
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
      upwork_access_token: user.upwork_access_token || "",
      upwork_referesh_token: user.upwork_referesh_token || "",
      roles: Array.isArray(user.roles) ? user.roles : [],
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
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block font-semibold mb-1">
              Upwork Access Token
            </label>
            <input
              name="upwork_access_token"
              value={form.upwork_access_token}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">
              Upwork Refresh Token
            </label>
            <input
              name="upwork_referesh_token"
              value={form.upwork_referesh_token}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Roles</label>
          <div className="flex gap-4 flex-wrap max-h-40 overflow-y-auto">
            {NAV_ROLES.map((role) => (
              <label
                key={role.value}
                className="flex items-center gap-1 min-w-[180px]"
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
