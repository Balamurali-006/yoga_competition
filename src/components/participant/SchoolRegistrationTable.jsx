import React, { useState } from "react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

const FEE_PER_STUDENT = Number(process.env.REACT_APP_REGISTRATION_FEE || 2);

const emptyStudent = () => ({
  name: "",
  age: "",
  gender: "",
  class: "",
  event: "district",
  category: "group",
  level: "district",
});

const selectClass =
  "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white text-gray-800";

const inputClass =
  "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all";

const SchoolRegistrationTable = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([emptyStudent()]);
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
    setStudents([...students, emptyStudent()]);
  };

  const removeRow = (index) => {
    if (students.length > 1) {
      setStudents(students.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validStudents = students.filter(
      (s) => s.name && s.age && s.gender && s.class
    );
    if (validStudents.length === 0) {
      setError("Please complete at least one student entry.");
      return;
    }
    if (
      !institution.trim() ||
      !instructor.trim() ||
      !/^\d{10}$/.test(instructorPhone.replace(/\D/g, "")) ||
      !email.trim()
    ) {
      setError(
        "Enter the institution, instructor, a valid 10-digit phone number, and email."
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      const batch = writeBatch(db);
      const participantIds = validStudents.map((student) => {
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
          registrationType: "school",
        });
        return participantRef.id;
      });

      await batch.commit();

      // Store all participant IDs and metadata so the payment-success page lists every student's name and serial number
      sessionStorage.setItem(
        "schoolParticipantIds",
        JSON.stringify(participantIds)
      );
      sessionStorage.setItem(
        "schoolParticipantsData",
        JSON.stringify(
          validStudents.map((student, idx) => ({
            id: participantIds[idx],
            name: student.name.trim(),
            level: student.level,
            institution: institution.trim(),
            instructor: instructor.trim(),
          }))
        )
      );

      const totalAmount = validStudents.length * FEE_PER_STUDENT;
      // Navigate to the first participant's payment page with total amount as query param
      navigate(
        `/pay/${participantIds[0]}?schoolTotal=${totalAmount}&schoolCount=${validStudents.length}`
      );
    } catch (submitError) {
      console.error("Group registration failed:", submitError);
      setError(
        "Could not save group registrations. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = students.some(
    (s) => s.name && s.age && s.gender && s.class
  );
  const totalAmount = students.length * FEE_PER_STUDENT;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-orange-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-orange-500 rounded-2xl mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent mb-2">
            Add Participants
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Register students for the upcoming event
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
          <form onSubmit={handleSubmit}>
            {/* Institution Details */}
            <div className="grid gap-4 border-b border-gray-200 p-6 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Institution
                <input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  required
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Instructor
                <input
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  required
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Instructor Phone
                <input
                  value={instructorPhone}
                  onChange={(e) => setInstructorPhone(e.target.value)}
                  inputMode="numeric"
                  className={`mt-1 ${inputClass}`}
                  required
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Contact Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  required
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="px-6 pt-4 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* Student Cards */}
            <div className="p-6 space-y-4">
              {students.map((student, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-purple-50 to-orange-50 rounded-2xl p-5 border border-purple-200 shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-purple-700">
                      Student {index + 1}
                    </h3>
                    {students.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-all"
                        title="Remove student"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Name — full width */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        name="name"
                        placeholder="Student Name"
                        value={student.name}
                        onChange={(e) => handleChange(index, e)}
                        className={inputClass}
                      />
                    </div>

                    {/* Age + Class side by side */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Age
                        </label>
                        <input
                          name="age"
                          type="number"
                          placeholder="14"
                          value={student.age}
                          onChange={(e) => handleChange(index, e)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Class
                        </label>
                        <input
                          name="class"
                          placeholder="8th"
                          value={student.class}
                          onChange={(e) => handleChange(index, e)}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Gender — full width */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
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

                    {/* Event + Category + Level */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Event
                        </label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Level
                        </label>
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

            {/* Footer Actions */}
            <div className="px-6 pb-6 bg-gray-50 flex flex-col sm:flex-row gap-3 items-center">
              <button
                type="button"
                onClick={addRow}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-purple-600 text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all shadow-sm"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Add Student
              </button>

              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium bg-purple-100 px-4 py-2 rounded-xl">
                  <span>
                    {students.length} student{students.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-purple-700 font-bold">
                    · Total: ₹{totalAmount}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-orange-600 transition-all shadow-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  {saving ? "Saving..." : "Submit Registration"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistrationTable;
