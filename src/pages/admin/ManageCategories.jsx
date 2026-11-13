import React, { useEffect, useState } from "react";
import { createCollectionDocument, deleteCollectionDocument, subscribeToCollection, updateCollectionDocument } from "../../firebase/firestore";

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", code: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeToCollection("categories", setCategories, () => setError("Could not load categories from Firestore."));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;

    const category = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
    };

    try {
      if (form.id) await updateCollectionDocument("categories", form.id, category);
      else await createCollectionDocument("categories", category);
      setError("");
      setForm({ id: null, name: "", code: "" });
    } catch (saveError) {
      console.error("Category save failed:", saveError);
      setError("Could not save category. Check your Firestore permissions and try again.");
    }
  };

  const handleEdit = (category) => {
    setForm({ id: category.id, name: category.name, code: category.code });
  };

  const handleDelete = async (id) => {
    try {
      await deleteCollectionDocument("categories", id);
    } catch (deleteError) {
      console.error("Category delete failed:", deleteError);
      setError("Could not delete category.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-purple-700 mb-5">Manage Categories</h1>
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-3 rounded-xl font-semibold">
              {form.id ? "Update Category" : "Add Category"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Categories</h2>
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between border border-gray-200 rounded-xl p-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{category.name}</h3>
                  <p className="text-sm text-gray-500">Code: {category.code}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleEdit(category)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">Edit</button>
                  <button type="button" onClick={() => handleDelete(category.id)} className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageCategories;
