import React, { useState, useEffect, useMemo, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getIdToken } from "firebase/auth";
import { db, auth } from "../../firebase/firebaseConfig";
import { subscribeToCollection } from "../../firebase/firestore";
import { logout } from "../../firebase/auth";
import { useNavigate } from "react-router-dom";

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const Verify = () => {
  const navigate = useNavigate();

  // Instructor filter state
  const [participantsList, setParticipantsList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedInstructor, setSelectedInstructor] = useState("");

  // Single participant search/verify state
  const [search, setSearch] = useState("");
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const printRef = useRef(null);

  // Subscribe to all participants from Firestore (database)
  useEffect(() => {
    const unsubscribe = subscribeToCollection(
      "participants",
      (items) => {
        setParticipantsList(items || []);
        setLoadingList(false);
      },
      (error) => {
        console.error("Failed to load participants:", error);
        setLoadingList(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Extract unique instructors that exist in the database
  const instructors = useMemo(() => {
    const set = new Set();
    participantsList.forEach((p) => {
      if (p.instructor && typeof p.instructor === "string" && p.instructor.trim()) {
        set.add(p.instructor.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [participantsList]);

  // Students under the selected instructor
  const instructorStudents = useMemo(() => {
    if (!selectedInstructor) return [];
    return participantsList.filter(
      (p) => (p.instructor || "").trim().toLowerCase() === selectedInstructor.trim().toLowerCase()
    );
  }, [participantsList, selectedInstructor]);

  // Handle single participant search
  const searchParticipant = async () => {
    const queryValue = search.trim();
    if (!queryValue) {
      setParticipant(null);
      setMessage("Enter a participant name, email, phone number, or serial number.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let token = "";
      if (auth.currentUser) {
        token = await getIdToken(auth.currentUser);
      }

      const response = await fetch(`${apiBaseUrl}/search-participants?q=${encodeURIComponent(queryValue)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        // Fallback to local participantsList search if server auth requirement differs
        const term = queryValue.toLowerCase();
        const localMatch = participantsList.find(
          (p) =>
            (p.name || "").toLowerCase().includes(term) ||
            (p.serialNumber || "").toLowerCase().includes(term) ||
            (p.email || "").toLowerCase().includes(term) ||
            (p.instructorPhone || "").includes(term)
        );
        if (localMatch) {
          setParticipant(localMatch);
          return;
        }
        throw new Error("Search request failed");
      }

      const data = await response.json();
      const results = data.participants || [];

      if (results.length === 0) {
        setParticipant(null);
        setMessage("No participant found for that search.");
      } else {
        setParticipant(results[0]);
      }
    } catch (error) {
      // Fallback local search
      const term = queryValue.toLowerCase();
      const localMatch = participantsList.find(
        (p) =>
          (p.name || "").toLowerCase().includes(term) ||
          (p.serialNumber || "").toLowerCase().includes(term) ||
          (p.email || "").toLowerCase().includes(term) ||
          (p.instructorPhone || "").includes(term)
      );
      if (localMatch) {
        setParticipant(localMatch);
      } else {
        setParticipant(null);
        setMessage("No participant found for that search.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!participant) return;

    try {
      await updateDoc(doc(db, "participants", participant.id), {
        verificationStatus: "verified",
        verifiedAt: new Date().toISOString(),
      });

      setParticipant({ ...participant, verificationStatus: "verified", verifiedAt: new Date().toISOString() });
      setMessage("Participant verified successfully.");
    } catch (error) {
      console.error("Verify participant failed:", error);
      setMessage("Verification failed. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/committee/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-4 md:p-8">
      {/* Print-specific stylesheet */}
      <style>{`
        @media print {
          /* Hide all navbar, footer, buttons, and search inputs */
          nav, footer, .no-print, header, .no-print * {
            display: none !important;
          }
          body, html {
            background: #fff !important;
            color: #000 !important;
            font-size: 12pt;
          }
          .printable-report {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #444 !important;
            padding: 6px 8px !important;
            font-size: 10pt !important;
            color: #000 !important;
          }
          th {
            background-color: #f2f2f2 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 no-print border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧘</span>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                Committee Dashboard
              </h1>
            </div>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Filter by instructor, print student batches as PDF, and verify participants.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-center px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
          >
            Sign Out
          </button>
        </div>

        {/* SECTION 1: FILTER BY INSTRUCTOR & STUDENT DETAILS + PRINT */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-purple-100 printable-report">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-print">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span>📋</span>
                <span>Student Details by Instructor</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select an instructor to view their registered students and print as PDF.
              </p>
            </div>

            {/* Print as PDF Button */}
            {selectedInstructor && instructorStudents.length > 0 && (
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print as PDF
              </button>
            )}
          </div>

          {/* Filter by Instructor Dropdown */}
          <div className="mb-6 no-print">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Instructor:
            </label>
            {loadingList ? (
              <div className="text-sm text-gray-500 py-2">Loading instructors from database...</div>
            ) : instructors.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                No instructors found in database.
              </div>
            ) : (
              <select
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                className="w-full md:w-96 px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none bg-white text-gray-800 text-base shadow-sm font-medium"
              >
                <option value="">-- Select Instructor --</option>
                {instructors.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Print Header (Only visible on print or report display) */}
          {selectedInstructor && (
            <div className="mb-6 p-4 rounded-2xl bg-purple-50 border border-purple-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-lg font-bold text-purple-900">
                    Instructor: <span className="text-purple-700">{selectedInstructor}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Institution: <span className="font-semibold text-gray-800">{instructorStudents[0]?.institution || "—"}</span>
                    {instructorStudents[0]?.instructorPhone && (
                      <span className="ml-3">
                        Phone: <span className="font-semibold text-gray-800">{instructorStudents[0]?.instructorPhone}</span>
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-purple-200 text-sm font-bold text-purple-700">
                  Total Students: {instructorStudents.length}
                </div>
              </div>
            </div>
          )}

          {/* Student Details Display */}
          {selectedInstructor ? (
            instructorStudents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No students found under instructor "{selectedInstructor}".
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200" ref={printRef}>
                <table className="w-full text-left text-sm">
                  <thead className="bg-gradient-to-r from-purple-600 to-orange-500 text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">Serial No</th>
                      <th className="px-4 py-3 font-semibold">Student Name</th>
                      <th className="px-4 py-3 font-semibold">Age</th>
                      <th className="px-4 py-3 font-semibold">Gender</th>
                      <th className="px-4 py-3 font-semibold">Class</th>
                      <th className="px-4 py-3 font-semibold">Event</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Level</th>
                      <th className="px-4 py-3 font-semibold">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {instructorStudents.map((student, idx) => (
                      <tr key={student.id || idx} className="hover:bg-purple-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-purple-700">
                          {student.serialNumber || "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-gray-700">{student.age || "—"}</td>
                        <td className="px-4 py-3 text-gray-700">{student.gender || "—"}</td>
                        <td className="px-4 py-3 text-gray-700">{student.class || "—"}</td>
                        <td className="px-4 py-3 capitalize text-gray-700">{student.event || "—"}</td>
                        <td className="px-4 py-3 capitalize text-gray-700">{student.category || "—"}</td>
                        <td className="px-4 py-3 capitalize text-gray-700">{student.level || "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              student.paymentStatus === "success"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {student.paymentStatus === "success" ? "Paid" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 no-print">
              <span className="text-4xl block mb-2">👆</span>
              <p className="text-gray-600 font-medium">
                Please choose an instructor from the dropdown above to display the student details and print the roster.
              </p>
            </div>
          )}
        </div>

        {/* SECTION 2: INDIVIDUAL PARTICIPANT SEARCH & VERIFY */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 no-print border border-purple-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
              <span>🔍</span>
              <span>Verify Individual Participant</span>
            </h2>
            <p className="text-gray-600 mt-1 text-sm">
              Search by participant name, email, phone number, or serial number to verify their registration.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search participant..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="button"
              onClick={searchParticipant}
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-95 disabled:opacity-60 transition-opacity"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {message && (
            <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
              {message}
            </div>
          )}

          {participant && (
            <div className="border border-purple-200 rounded-2xl p-5 bg-purple-50/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{participant.name}</h3>
                  <p className="text-xs text-gray-500">ID: {participant.id}</p>
                </div>
                <button
                  type="button"
                  onClick={handleVerify}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold shadow-sm transition-all"
                >
                  {participant.verificationStatus === "verified" ? "✓ Verified" : "Mark Verified"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-white p-4 rounded-xl border border-purple-100">
                <div>
                  <span className="font-semibold text-gray-500 block text-xs">Email</span>
                  <span className="text-gray-800">{participant.email || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block text-xs">Institution</span>
                  <span className="text-gray-800">{participant.institution || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block text-xs">Instructor</span>
                  <span className="text-gray-800">{participant.instructor || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block text-xs">Phone</span>
                  <span className="text-gray-800">{participant.instructorPhone || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block text-xs">Serial Number</span>
                  <span className="text-purple-700 font-bold">{participant.serialNumber || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block text-xs">Event / Category</span>
                  <span className="text-gray-800 capitalize">
                    {participant.event || "—"} / {participant.category || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block text-xs">Payment</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      participant.paymentStatus === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {participant.paymentStatus || "pending"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block text-xs">Verification</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      participant.verificationStatus === "verified"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {participant.verificationStatus || "pending"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Verify;
