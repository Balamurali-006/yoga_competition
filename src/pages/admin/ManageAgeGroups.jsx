import React, { useEffect, useState } from "react";
import { createCollectionDocument, deleteCollectionDocument, subscribeToCollection, updateCollectionDocument } from "../../firebase/firestore";

const ManageAgeGroups = () => {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", min: "", max: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeToCollection("ageGroups", setGroups, () => setError("Could not load age groups from Firestore."));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || form.min === "" || form.max === "") {
      return;
    }

    const group = {
      name: form.name.trim(),
      min: Number(form.min),
      max: Number(form.max),
    };

    try {
      if (form.id) await updateCollectionDocument("ageGroups", form.id, group);
      else await createCollectionDocument("ageGroups", group);
      setError("");
      setForm({ id: null, name: "", min: "", max: "" });
    } catch (saveError) {
      console.error("Age group save failed:", saveError);
      setError("Could not save age group. Check your Firestore permissions and try again.");
    }
  };

  const handleEdit = (group) => {
    setForm({ id: group.id, name: group.name, min: group.min, max: group.max });
  };

  const handleDelete = async (id) => {
    try {
      await deleteCollectionDocument("ageGroups", id);
    } catch (deleteError) {
      console.error("Age group delete failed:", deleteError);
      setError("Could not delete age group.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-purple-700 mb-4">Manage Age Groups</h1>
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Age</label>
                <input
                  type="number"
                  name="min"
                  value={form.min}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Age</label>
                <input
                  type="number"
                  name="max"
                  value={form.max}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-3 rounded-xl font-semibold"
            >
              {form.id ? "Update Group" : "Add Group"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Age Group List</h2>

          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center justify-between border border-gray-200 rounded-xl p-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{group.name}</h3>
                  <p className="text-sm text-gray-500">Ages {group.min} to {group.max}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(group)}
                    className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(group.id)}
                    className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAgeGroups;
