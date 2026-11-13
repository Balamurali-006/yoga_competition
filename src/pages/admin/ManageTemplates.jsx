import React, { useEffect, useState } from "react";
import { createCollectionDocument, deleteCollectionDocument, updateCollectionDocument, subscribeToCollection } from "../../firebase/firestore";

const ManageTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ name: "", criteriaText: "" });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    return subscribeToCollection("scoringTemplates", setTemplates, () => setError("Could not load scoring templates from Firestore."));
  }, []);

  const resetForm = () => {
    setForm({ name: "", criteriaText: "" });
    setEditingId(null);
  };

  const startEdit = (template) => {
    setEditingId(template.id);
    setForm({
      name: template.name || "",
      criteriaText: (template.criteria || []).join(", "),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.criteriaText.trim()) return;

    const criteria = form.criteriaText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      if (editingId) {
        await updateCollectionDocument("scoringTemplates", editingId, {
          name: form.name.trim(),
          criteria,
        });
      } else {
        await createCollectionDocument("scoringTemplates", {
          name: form.name.trim(),
          criteria,
          createdAt: new Date().toISOString(),
        });
      }
      setError("");
      resetForm();
    } catch (saveError) {
      console.error("Scoring template save failed:", saveError);
      setError("Could not save template. Check your Firestore permissions and try again.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCollectionDocument("scoringTemplates", id);
    } catch (deleteError) {
      console.error("Scoring template delete failed:", deleteError);
      setError("Could not delete template.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-purple-700 mb-5">
            {editingId ? "Edit Template" : "Add Template"}
          </h1>
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Criteria (comma separated)</label>
              <textarea
                value={form.criteriaText}
                onChange={(e) => setForm({ ...form, criteriaText: e.target.value })}
                rows={5}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-3 rounded-xl font-semibold">
              {editingId ? "Update Template" : "Add Template"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            )}
          </form>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Templates</h2>
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800">{template.name}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {template.criteria.map((item, index) => (
                    <span key={`${template.id}-${index}`} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">{item}</span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => startEdit(template)} className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200">Edit</button>
                  <button type="button" onClick={() => handleDelete(template.id)} className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTemplates;
