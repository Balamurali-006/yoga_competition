import React, { useEffect, useState } from "react";
import { createCollectionDocument, deleteCollectionDocument, subscribeToCollection, updateCollectionDocument } from "../../firebase/firestore";

const ManageEvents = () => {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", level: "", location: "", date: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeToCollection("events", setEvents, () => setError("Could not load events from Firestore."));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.level || !form.location.trim() || !form.date) {
      return;
    }

    const event = {
      name: form.name.trim(),
      level: form.level,
      location: form.location.trim(),
      date: form.date,
    };

    try {
      if (form.id) await updateCollectionDocument("events", form.id, event);
      else await createCollectionDocument("events", event);
      setError("");
      setForm({ id: null, name: "", level: "", location: "", date: "" });
    } catch (saveError) {
      console.error("Event save failed:", saveError);
      setError("Could not save event. Check your Firestore permissions and try again.");
    }
  };

  const handleEdit = (event) => {
    setForm({
      id: event.id,
      name: event.name,
      level: event.level,
      location: event.location,
      date: event.date,
    });
  };

  const handleDelete = async (id) => {
    try {
      await deleteCollectionDocument("events", id);
    } catch (deleteError) {
      console.error("Event delete failed:", deleteError);
      setError("Could not delete event.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6">
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-purple-700 mb-5">Manage Events</h1>
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select level</option>
                <option value="district">District</option>
                <option value="state">State</option>
                <option value="national">National</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-3 rounded-xl font-semibold">
              {form.id ? "Update Event" : "Add Event"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Event List</h2>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex flex-col md:flex-row md:items-center md:justify-between border border-gray-200 rounded-xl p-4 gap-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{event.name}</h3>
                  <p className="text-sm text-gray-500">{event.level} • {event.location} • {event.date}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleEdit(event)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">Edit</button>
                  <button type="button" onClick={() => handleDelete(event.id)} className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageEvents;
