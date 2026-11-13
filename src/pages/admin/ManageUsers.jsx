import React, { useEffect, useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";
import { subscribeToCollection, updateCollectionDocument, deleteCollectionDocument } from "../../firebase/firestore";

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "committee" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => subscribeToCollection("users", setUsers, () => setError("Could not load users from Firestore.")), []);

  const resetForm = () => {
    setForm({ name: "", email: "", password: "", role: "committee" });
    setEditingId(null);
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setForm({ name: user.name || "", email: "", password: "", role: user.role || "committee" });
  };

  const handleDelete = async (id, displayName) => {
    if (!window.confirm(`Delete user "${displayName}"? This removes the Firestore document only.`)) return;
    try {
      await deleteCollectionDocument("users", id);
    } catch (deleteError) {
      console.error("User delete failed:", deleteError);
      setError("Could not delete user.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (editingId) {
        // Update existing user (name + role only)
        await updateCollectionDocument("users", editingId, { name: form.name, role: form.role });
        resetForm();
      } else {
        // Create new user via backend API
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Sign in again before creating users.");

        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
        const response = await fetch(`${apiBaseUrl}/admin/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getIdToken(currentUser)}`,
          },
          body: JSON.stringify(form),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not create user.");

        resetForm();
      }
    } catch (submitError) {
      console.error("User operation failed:", submitError);
      setError(submitError.message || "Could not complete user operation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-purple-700 mb-5">
            {editingId ? "Edit User" : "Manage Users"}
          </h1>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Name
              <input required value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" />
            </label>
            {!editingId && (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                  <input required type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Temporary password
                  <input required type="password" minLength="8" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" />
                </label>
              </>
            )}
            <label className="block text-sm font-medium text-gray-700">
              Role
              <select value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3">
                <option value="committee">Committee</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60">
              {loading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update User" : "Create User")}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            )}
          </form>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">User List</h2>
          <div className="space-y-3">
            {users.length === 0 && <p className="text-gray-600">No user profiles found.</p>}
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between border border-gray-200 rounded-xl p-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{user.name || user.email || user.id}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-xs font-semibold">{user.role}</span>
                  <button type="button" onClick={() => startEdit(user)} className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200">Edit</button>
                  <button type="button" onClick={() => handleDelete(user.id, user.name || user.email || user.id)} className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageUsers;
