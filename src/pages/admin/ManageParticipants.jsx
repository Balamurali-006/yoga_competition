import React, { useEffect, useState } from "react";
import { subscribeToCollection, updateCollectionDocument, deleteCollectionDocument } from "../../firebase/firestore";
import * as XLSX from "xlsx";

const ManageParticipants = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", institution: "", event: "", category: "", level: "" });

  useEffect(() => {
    return subscribeToCollection("participants", (items) => {
      setParticipants(items);
      setLoading(false);
    }, (loadError) => {
      console.error("Participants load failed:", loadError);
      setError("Could not load participants. Check Firestore access.");
      setLoading(false);
    });
  }, []);

  const filtered = participants.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(term) ||
      (p.serialNumber || "").toString().toLowerCase().includes(term) ||
      (p.institution || "").toLowerCase().includes(term)
    );
  });

  const startEdit = (participant) => {
    setEditingId(participant.id);
    setEditForm({
      name: participant.name || "",
      institution: participant.institution || "",
      event: participant.event || "",
      category: participant.category || "",
      level: participant.level || "",
    });
    setExpandedId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", institution: "", event: "", category: "", level: "" });
  };

  const saveEdit = async () => {
    try {
      await updateCollectionDocument("participants", editingId, {
        name: editForm.name,
        institution: editForm.institution,
        event: editForm.event,
        category: editForm.category,
        level: editForm.level,
      });
      cancelEdit();
    } catch (updateError) {
      console.error("Participant update failed:", updateError);
      setError("Could not update participant.");
    }
  };

  const handleDelete = async (id, displayName) => {
    if (!window.confirm(`Delete participant "${displayName}"?`)) return;
    try {
      await deleteCollectionDocument("participants", id);
      if (editingId === id) cancelEdit();
      if (expandedId === id) setExpandedId(null);
    } catch (deleteError) {
      console.error("Participant delete failed:", deleteError);
      setError("Could not delete participant.");
    }
  };

  const exportToExcel = () => {
    const data = filtered.map((p) => ({
      Name: p.name || "",
      Institution: p.institution || "",
      Event: p.event || "",
      Category: p.category || "",
      Level: p.level || "",
      "Serial Number": p.serialNumber || "",
      "Payment Status": p.paymentStatus || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");
    XLSX.writeFile(workbook, "participants.xlsx");
  };

  const DetailField = ({ label, value }) => (
    <div>
      <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
      <p className="text-sm text-gray-800">{value || "-"}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl p-6">
        <h1 className="text-3xl font-bold text-purple-700 mb-5">Manage Participants</h1>
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}

        {/* Search bar and Export button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Search by name, serial number, or institution..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={exportToExcel}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 px-6 py-3 font-semibold text-white whitespace-nowrap hover:opacity-90"
          >
            Export to Excel
          </button>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading participants...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-600">{searchTerm ? "No participants match your search." : "No participants found yet."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-purple-600 to-orange-500 text-white text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Serial</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((participant) => (
                  <React.Fragment key={participant.id}>
                    {/* Main row */}
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3">{participant.name || "-"}</td>
                      <td className="px-4 py-3">{participant.institution || "-"}</td>
                      <td className="px-4 py-3">{participant.event || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${participant.paymentStatus === "success" || participant.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {participant.paymentStatus || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{participant.serialNumber || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => setExpandedId(expandedId === participant.id ? null : participant.id)} className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200">
                            {expandedId === participant.id ? "Hide" : "View"}
                          </button>
                          <button type="button" onClick={() => startEdit(participant)} className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200">Edit</button>
                          <button type="button" onClick={() => handleDelete(participant.id, participant.name || participant.id)} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200">Delete</button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {expandedId === participant.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-purple-50">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            <DetailField label="Name" value={participant.name} />
                            <DetailField label="Email" value={participant.email} />
                            <DetailField label="Institution" value={participant.institution} />
                            <DetailField label="Instructor" value={participant.instructor} />
                            <DetailField label="Instructor Phone" value={participant.instructorPhone} />
                            <DetailField label="Event" value={participant.event} />
                            <DetailField label="Category" value={participant.category} />
                            <DetailField label="Level" value={participant.level} />
                            <DetailField label="Age" value={participant.age} />
                            <DetailField label="Gender" value={participant.gender} />
                            <DetailField label="Class" value={participant.class} />
                            <DetailField label="Payment Status" value={participant.paymentStatus} />
                            <DetailField label="Serial Number" value={participant.serialNumber} />
                            <DetailField label="Verification Status" value={participant.verificationStatus} />
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Inline edit row */}
                    {editingId === participant.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-blue-50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Institution</label>
                              <input value={editForm.institution} onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Event</label>
                              <input value={editForm.event} onChange={(e) => setEditForm({ ...editForm, event: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                              <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                              <input value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button type="button" onClick={saveEdit} className="rounded-lg bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Save</button>
                            <button type="button" onClick={cancelEdit} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageParticipants;
