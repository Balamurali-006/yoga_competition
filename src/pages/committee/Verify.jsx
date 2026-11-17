import React, { useState, useEffect, useMemo, useRef } from "react";
import { doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import { getIdToken } from "firebase/auth";
import { db, auth } from "../../firebase/firebaseConfig";
import { subscribeToCollection } from "../../firebase/firestore";
import { login, logout } from "../../firebase/auth";

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const Verify = () => {
  // Local component-level authentication state (forces login on every visit/switch)
  const [committeeUser, setCommitteeUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Instructor filter state
  const [participantsList, setParticipantsList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState("");

  // Visited state for students under current filter: { [studentId]: boolean }
  const [visitedMap, setVisitedMap] = useState({});
  const [hasVisitedChanges, setHasVisitedChanges] = useState(false);
  const [savingVisited, setSavingVisited] = useState(false);
  const [visitedMessage, setVisitedMessage] = useState("");

  // Single participant search/verify state
  const [search, setSearch] = useState("");
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const printRef = useRef(null);

  // When leaving/unmounting the Committee module, clear session
  useEffect(() => {
    return () => {
      logout();
    };
  }, []);

  // Handle Committee Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const userCredential = await login(loginForm.email.trim(), loginForm.password);
      const signedInUser = userCredential?.user || null;

      if (!signedInUser) {
        throw new Error("No user returned from Firebase sign in.");
      }

      const userDoc = await getDoc(doc(db, "users", signedInUser.uid));
      const role = userDoc.exists() ? userDoc.data().role : null;

      if (!["committee", "admin"].includes(role)) {
        await logout();
        throw new Error(
          "This account is not authorized for committee access. Please ensure your Firestore document in 'users/{uid}' has role: 'committee'."
        );
      }

      setCommitteeUser({ ...signedInUser, role });
    } catch (err) {
      console.error("Committee login error:", err);
      let msg = err.message || "Committee login failed.";
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        msg = "Invalid email or password. Please verify your credentials.";
      }
      setLoginError(msg);
    } finally {
      setLoggingIn(false);
    }
  };

  // Subscribe to all participants from Firestore (database) only when logged in
  useEffect(() => {
    if (!committeeUser) {
      setParticipantsList([]);
      setLoadingList(false);
      return;
    }

    setLoadingList(true);
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
  }, [committeeUser]);

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

  // Inline search filter within selected instructor's students
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const displayedStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return instructorStudents;
    const q = studentSearchQuery.trim().toLowerCase();
    return instructorStudents.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.serialNumber || "").toLowerCase().includes(q) ||
        (s.class || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q)
    );
  }, [instructorStudents, studentSearchQuery]);

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const q = query.trim();
    if (!q) return text;
    const parts = String(text).split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // When selected instructor changes, initialize visitedMap from database values
  useEffect(() => {
    if (!selectedInstructor) {
      setVisitedMap({});
      setHasVisitedChanges(false);
      setVisitedMessage("");
      return;
    }
    const initial = {};
    instructorStudents.forEach((student) => {
      initial[student.id] = student.visited === true;
    });
    setVisitedMap(initial);
    setHasVisitedChanges(false);
    setVisitedMessage("");
  }, [selectedInstructor, instructorStudents]);

  // Count how many students under the current filter are marked visited
  const visitedCount = useMemo(() => {
    return instructorStudents.filter((s) => visitedMap[s.id]).length;
  }, [instructorStudents, visitedMap]);

  // Check if all students under current filter are marked visited
  const isAllSelected = useMemo(() => {
    if (instructorStudents.length === 0) return false;
    return instructorStudents.every((s) => visitedMap[s.id]);
  }, [instructorStudents, visitedMap]);

  // Toggle single student visited checkbox
  const toggleStudentVisited = (studentId) => {
    setVisitedMap((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
    setHasVisitedChanges(true);
    setVisitedMessage("");
  };

  // Select all or deselect all students under current instructor filter
  const toggleSelectAll = () => {
    const targetState = !isAllSelected;
    const nextMap = { ...visitedMap };
    instructorStudents.forEach((s) => {
      nextMap[s.id] = targetState;
    });
    setVisitedMap(nextMap);
    setHasVisitedChanges(true);
    setVisitedMessage("");
  };

  // Save visited changes to Firestore (both 'participants' and 'visitors' collections)
  const saveVisitedChanges = async () => {
    if (instructorStudents.length === 0) return;
    setSavingVisited(true);
    setVisitedMessage("");

    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();

      instructorStudents.forEach((student) => {
        const isVisited = !!visitedMap[student.id];
        const participantRef = doc(db, "participants", student.id);
        const visitorRef = doc(db, "visitors", student.id);

        if (isVisited) {
          // 1. Update participants collection
          batch.update(participantRef, {
            visited: true,
            visitedAt: timestamp,
          });

          // 2. Add / update document in visitors collection
          batch.set(visitorRef, {
            participantId: student.id,
            name: student.name || "",
            serialNumber: student.serialNumber || null,
            age: student.age || null,
            gender: student.gender || null,
            class: student.class || null,
            institution: student.institution || null,
            instructor: student.instructor || null,
            instructorPhone: student.instructorPhone || null,
            email: student.email || null,
            event: student.event || null,
            category: student.category || null,
            level: student.level || null,
            paymentStatus: student.paymentStatus || null,
            visited: true,
            visitedAt: timestamp,
            updatedAt: timestamp,
            markedBy: "committee",
          });
        } else {
          // If unchecked, mark not visited in participants and remove from visitors collection
          batch.update(participantRef, {
            visited: false,
            visitedAt: null,
          });
          batch.delete(visitorRef);
        }
      });

      await batch.commit();
      setHasVisitedChanges(false);
      setVisitedMessage("✓ Visited status saved successfully! Visitors collection updated.");
    } catch (err) {
      console.error("Failed to save visited status:", err);
      setVisitedMessage("❌ Failed to save visited status. Please check your connection and try again.");
    } finally {
      setSavingVisited(false);
    }
  };

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
    setCommitteeUser(null);
  };

  // ─────────────────────────────────────────────────────────────
  // VIEW: COMMITTEE LOGIN (shown on every visit/tab switch if not logged in)
  // ─────────────────────────────────────────────────────────────
  if (!committeeUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-orange-500 text-3xl">
              🧘
            </div>
            <h1 className="mt-4 text-3xl font-bold text-purple-700">Committee Login</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your committee credentials to access student attendance and verification.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="committeeuser@gmail.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 pl-4 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 text-sm select-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>

            {loginError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60 hover:opacity-95 transition-opacity"
            >
              {loggingIn ? "Signing in..." : "Login to Committee"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-4 md:p-8">
      {/* Print-specific stylesheet */}
      <style>{`
        @media print {
          /* Hide all navbar, footer, buttons, controls, and search inputs */
          nav, footer, .no-print, header, .no-print * {
            display: none !important;
          }
          body, html {
            background: #fff !important;
            color: #000 !important;
            font-size: 11pt;
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
          .print-only {
            display: inline-block !important;
          }
        }
        .print-only {
          display: none;
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
              Mark student attendance as visited, save changes to database & visitors collection, and print reports.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-center px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
          >
            Sign Out
          </button>
        </div>

        {/* SECTION 1: FILTER BY INSTRUCTOR & VISITED ATTENDANCE + PRINT */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-purple-100 printable-report">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-print">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span>📋</span>
                <span>Student Details & Event Attendance</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Filter by instructor, mark visited students, and save changes to update both participants and visitors collections.
              </p>
            </div>

            {/* Print Button */}
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

          {/* Report Header Bar */}
          {selectedInstructor && (
            <div className="mb-6 p-4 rounded-2xl bg-purple-50 border border-purple-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-purple-200 text-xs sm:text-sm font-bold text-purple-700 shadow-sm">
                    📊 Total: {instructorStudents.length}
                  </div>
                  <div className="bg-green-100 px-3 py-1.5 rounded-xl border border-green-300 text-xs sm:text-sm font-bold text-green-800 shadow-sm">
                    🟢 Visited: {visitedCount} ({instructorStudents.length > 0 ? Math.round((visitedCount / instructorStudents.length) * 100) : 0}%)
                  </div>
                  <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-300 text-xs sm:text-sm font-bold text-amber-800 shadow-sm">
                    🟡 Pending: {instructorStudents.length - visitedCount}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Details & Visited Attendance Table */}
          {selectedInstructor ? (
            instructorStudents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No students found under instructor "{selectedInstructor}".
              </p>
            ) : (
              <div className="space-y-4">
                {/* Controls Bar: Select All + Inline Search + Save Changes */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 no-print">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer accent-purple-600"
                      />
                      <span>Select All as Visited</span>
                    </label>
                    <span className="text-xs text-gray-500">
                      ({visitedCount} of {instructorStudents.length} marked)
                    </span>
                  </div>

                  {/* Quick Inline Student Search Filter */}
                  <div className="relative w-full md:w-auto">
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Filter student or serial..."
                      className="w-full md:w-64 pl-8 pr-7 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                    {studentSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setStudentSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={saveVisitedChanges}
                    disabled={savingVisited}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {savingVisited ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                {/* Status / Feedback Alert */}
                {visitedMessage && (
                  <div
                    className={`p-4 rounded-xl text-sm font-semibold no-print flex items-center justify-between ${
                      visitedMessage.startsWith("✓")
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : "bg-red-100 text-red-800 border border-red-300"
                    }`}
                  >
                    <span>{visitedMessage}</span>
                    <button onClick={() => setVisitedMessage("")} className="text-xs text-gray-500 hover:text-gray-800 font-bold ml-2">
                      ✕
                    </button>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm" ref={printRef}>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gradient-to-r from-purple-600 to-orange-500 text-white">
                      <tr>
                        <th className="px-3 py-3 text-center no-print w-16">
                          <span className="text-xs font-semibold block">Visited</span>
                        </th>
                        <th className="px-3 py-3 text-center print-only">Visited</th>
                        <th className="px-3 py-3 font-semibold text-center w-12">#</th>
                        <th className="px-4 py-3 font-semibold">Serial No</th>
                        <th className="px-4 py-3 font-semibold">Student Name</th>
                        <th className="px-3 py-3 font-semibold">Age</th>
                        <th className="px-3 py-3 font-semibold">Gender</th>
                        <th className="px-3 py-3 font-semibold">Class</th>
                        <th className="px-3 py-3 font-semibold">Event</th>
                        <th className="px-3 py-3 font-semibold">Category</th>
                        <th className="px-3 py-3 font-semibold">Level</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedStudents.map((student, idx) => {
                        const isVisited = !!visitedMap[student.id];
                        return (
                          <tr
                            key={student.id || idx}
                            className={`transition-colors ${
                              isVisited
                                ? "bg-green-50/70 hover:bg-green-100/60"
                                : "hover:bg-purple-50/50"
                            }`}
                          >
                            {/* Checkbox Column (Interactive) */}
                            <td className="px-3 py-3 text-center no-print">
                              <input
                                type="checkbox"
                                checked={isVisited}
                                onChange={() => toggleStudentVisited(student.id)}
                                className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer accent-purple-600"
                                title="Mark as Visited"
                              />
                            </td>

                            {/* Print-only status */}
                            <td className="px-3 py-3 text-center print-only font-bold">
                              {isVisited ? "✓ Yes" : "No"}
                            </td>

                            <td className="px-3 py-3 text-center text-gray-500 font-medium">
                              {idx + 1}
                            </td>

                            <td className="px-4 py-3 font-bold text-purple-700 font-mono">
                              {highlightText(student.serialNumber || "—", studentSearchQuery)}
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-900">
                              <div className="flex items-center gap-2">
                                <span>{highlightText(student.name, studentSearchQuery)}</span>
                                {isVisited && (
                                  <span className="text-xs bg-green-200 text-green-800 font-bold px-1.5 py-0.5 rounded no-print">
                                    Visited
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-3 text-gray-700">{student.age || "—"}</td>
                            <td className="px-3 py-3 text-gray-700">{student.gender || "—"}</td>
                            <td className="px-3 py-3 text-gray-700">{student.class || "—"}</td>
                            <td className="px-3 py-3 capitalize text-gray-700">{student.event || "—"}</td>
                            <td className="px-3 py-3 capitalize text-gray-700">{student.category || "—"}</td>
                            <td className="px-3 py-3 capitalize text-gray-700">{student.level || "—"}</td>

                            <td className="px-3 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  ["success", "paid", "verified"].includes(String(student.paymentStatus || "").toLowerCase()) ||
                                  student.registrationStatus === "CONFIRMED"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {["success", "paid", "verified"].includes(String(student.paymentStatus || "").toLowerCase()) ||
                                student.registrationStatus === "CONFIRMED"
                                  ? "Paid"
                                  : "Pending"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Action Footer with Save Changes Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-purple-50 to-orange-50 rounded-2xl border border-purple-200 no-print">
                  <div className="text-sm text-gray-700 font-medium">
                    Marked Visited: <span className="font-bold text-green-700">{visitedCount}</span> of{" "}
                    <span className="font-bold">{instructorStudents.length}</span> students.
                    {hasVisitedChanges && (
                      <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-bold">
                        Unsaved changes
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={saveVisitedChanges}
                    disabled={savingVisited}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 text-base"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {savingVisited ? "Saving to Database..." : "Save Changes"}
                  </button>
                </div>

                {/* Floating Sticky Save Bar (Fixed at bottom right for easy access while scrolling) */}
                {hasVisitedChanges && (
                  <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 z-40 bg-white/95 backdrop-blur-md border-2 border-purple-400 shadow-2xl rounded-2xl p-3 sm:px-5 sm:py-3 flex items-center justify-between sm:justify-start gap-4 transition-all no-print animate-bounce-subtle">
                    <div className="text-left">
                      <span className="text-[11px] text-orange-600 font-bold uppercase tracking-wider block">Unsaved Changes</span>
                      <span className="text-sm font-extrabold text-gray-800">
                        <span className="text-green-700">{visitedCount}</span> / {instructorStudents.length} Visited
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={saveVisitedChanges}
                      disabled={savingVisited}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 text-sm flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{savingVisited ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 no-print">
              <span className="text-4xl block mb-2">👆</span>
              <p className="text-gray-600 font-medium">
                Please choose an instructor from the dropdown above to display the student details and mark attendance.
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
                      ["success", "paid", "verified"].includes(String(participant.paymentStatus || "").toLowerCase()) ||
                      participant.registrationStatus === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {["success", "paid", "verified"].includes(String(participant.paymentStatus || "").toLowerCase()) ||
                    participant.registrationStatus === "CONFIRMED"
                      ? "Paid"
                      : "Pending"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 block text-xs">Visited</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      participant.visited
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {participant.visited ? "✓ Visited" : "Not Visited"}
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
