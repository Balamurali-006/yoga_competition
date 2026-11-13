import React, { useState } from "react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import PaymentButton from "./PaymentButton";

const SchoolRegistrationTable = () => {
  const [students, setStudents] = useState([
    { name: "", age: "", gender: "", class: "", event: "district", category: "group", level: "district" },
  ]);
  const [savedParticipants, setSavedParticipants] = useState([]);
  const [institution, setInstitution] = useState("");
  const [instructor, setInstructor] = useState("");
  const [instructorPhone, setInstructorPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (index, e) => {
    const updated = [...students];
    updated[index][e.target.name] = e.target.value;
    setStudents(updated);
  };

  const addRow = () => {
    setStudents([...students, { name: "", age: "", gender: "", class: "", event: "district", category: "group", level: "district" }]);
  };

  const removeRow = (index) => {
    if (students.length > 1) {
      const updated = students.filter((_, i) => i !== index);
      setStudents(updated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validStudents = students.filter(s => s.name && s.age && s.gender && s.class);
    if (validStudents.length === 0) {
      setError("Please complete at least one student entry.");
      return;
    }
    if (!institution.trim() || !instructor.trim() || !/^\d{10}$/.test(instructorPhone.replace(/\D/g, "")) || !email.trim()) {
      setError("Enter the institution, instructor, a valid 10-digit phone number, and email.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const batch = writeBatch(db);
      const registrations = validStudents.map((student) => {
        const participantRef = doc(collection(db, "participants"));
        batch.set(participantRef, {
        name: student.name.trim(),
        age: Number(student.age),
        gender: student.gender,
        class: student.class.trim(),
        institution: institution.trim(),
        instructor: instructor.trim(),
        instructorPhone: instructorPhone.replace(/\D/g, ""),
        email: email.trim(),
        event: student.event,
        category: student.category,
        level: student.level,
        paymentStatus: "pending",
        serialNumber: null,
        createdAt: serverTimestamp(),
        });
        return { id: participantRef.id, name: student.name.trim() };
      });
      await batch.commit();
      setSavedParticipants(registrations);
    } catch (submitError) {
      console.error("Group registration failed:", submitError);
      setError("Could not save group registrations. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = students.some(s => s.name && s.age && s.gender && s.class);

  const selectClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-orange-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-orange-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent mb-2">
            Add Participants
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Register students for the upcoming event
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 border-b border-gray-200 p-6 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">Institution
                <input value={institution} onChange={(event) => setInstitution(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2" required />
              </label>
              <label className="text-sm font-medium text-gray-700">Instructor
                <input value={instructor} onChange={(event) => setInstructor(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2" required />
              </label>
              <label className="text-sm font-medium text-gray-700">Instructor phone
                <input value={instructorPhone} onChange={(event) => setInstructorPhone(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2" required />
              </label>
              <label className="text-sm font-medium text-gray-700">Contact email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2" required />
              </label>
            </div>
            {error && <p role="alert" className="px-6 pt-4 text-sm text-red-700">{error}</p>}
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-600 to-orange-500">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Age</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Gender</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Class</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Event</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Level</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          name="name"
                          placeholder="Student Name"
                          value={student.name}
                          onChange={(e) => handleChange(index, e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          name="age"
                          type="number"
                          placeholder="14"
                          value={student.age}
                          onChange={(e) => handleChange(index, e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          name="gender"
                          value={student.gender}
                          onChange={(e) => handleChange(index, e)}
                          className={selectClass}
                        >
                          <option value="">Select</option>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          name="class"
                          placeholder="8th"
                          value={student.class}
                          onChange={(e) => handleChange(index, e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          name="event"
                          value={student.event}
                          onChange={(e) => handleChange(index, e)}
                          className={selectClass}
                        >
                          <option value="district">District</option>
                          <option value="state">State</option>
                          <option value="national">National</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          name="category"
                          value={student.category}
                          onChange={(e) => handleChange(index, e)}
                          className={selectClass}
                        >
                          <option value="forward">Forward</option>
                          <option value="backward">Backward</option>
                          <option value="twist">Twist</option>
                          <option value="balance">Balance</option>
                          <option value="standing">Standing</option>
                          <option value="group">Group</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          name="level"
                          value={student.level}
                          onChange={(e) => handleChange(index, e)}
                          className={selectClass}
                        >
                          <option value="district">District</option>
                          <option value="state">State</option>
                          <option value="south-india">South India</option>
                          <option value="national">National</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          disabled={students.length === 1}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Delete student"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {students.map((student, index) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-orange-50 rounded-2xl p-5 border border-purple-200 shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-purple-700">Student {index + 1}</h3>
                    {students.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-all"
                        title="Delete student"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        name="name"
                        placeholder="Student Name"
                        value={student.name}
                        onChange={(e) => handleChange(index, e)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <input
                          name="age"
                          type="number"
                          placeholder="14"
                          value={student.age}
                          onChange={(e) => handleChange(index, e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <input
                          name="class"
                          placeholder="8th"
                          value={student.class}
                          onChange={(e) => handleChange(index, e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        name="gender"
                        value={student.gender}
                        onChange={(e) => handleChange(index, e)}
                        className={selectClass}
                      >
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
                        <select
                          name="event"
                          value={student.event}
                          onChange={(e) => handleChange(index, e)}
                          className={selectClass}
                        >
                          <option value="district">District</option>
                          <option value="state">State</option>
                          <option value="national">National</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          name="category"
                          value={student.category}
                          onChange={(e) => handleChange(index, e)}
                          className={selectClass}
                        >
                          <option value="forward">Forward</option>
                          <option value="backward">Backward</option>
                          <option value="twist">Twist</option>
                          <option value="balance">Balance</option>
                          <option value="standing">Standing</option>
                          <option value="group">Group</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                        <select
                          name="level"
                          value={student.level}
                          onChange={(e) => handleChange(index, e)}
                          className={selectClass}
                        >
                          <option value="district">District</option>
                          <option value="state">State</option>
                          <option value="south-india">South India</option>
                          <option value="national">National</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="p-6 bg-gray-50 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={addRow}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-purple-600 text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add Student
              </button>
              
              <button
                type="submit"
                disabled={!isFormValid || saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-orange-600 transition-all shadow-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {saving ? "Saving registrations..." : "Submit Registration"}
              </button>
            </div>
          </form>
        </div>

        {savedParticipants.length > 0 && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-green-800">Registrations saved. Complete payment for each participant.</h2>
            <div className="space-y-3">
              {savedParticipants.map((participant) => (
                <div key={participant.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-gray-800">{participant.name}</span>
                  <PaymentButton amount={Number(process.env.REACT_APP_REGISTRATION_FEE || 2)} participantId={participant.id} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Total Participants: <span className="font-bold text-purple-600">{students.length}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistrationTable;
