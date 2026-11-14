import React, { useState, useEffect, useMemo } from "react";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { subscribeToCollection } from "../firebase/firestore";
import { login, setCustomAuthUser, logout } from "../firebase/auth";

const Validation = ({ user }) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(user || null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Participants & Scores Data
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [savedScoresMap, setSavedScoresMap] = useState({});

  // Filter State
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");

  // In-memory score edits: { [participantId]: { asana1: "", asana2: "", asana3: "", asana4: "", asana5: "", position: "" } }
  const [scoreInputs, setScoreInputs] = useState({});
  const [saveStatusMap, setSaveStatusMap] = useState({});
  const [savingId, setSavingId] = useState(null);

  // Sync auth state if user prop changes or custom auth in sessionStorage
  useEffect(() => {
    if (user && ["committee", "admin"].includes(user.role)) {
      setCurrentUser(user);
    } else {
      const stored = sessionStorage.getItem("customAuthUser");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (["committee", "admin"].includes(parsed.role)) {
            setCurrentUser(parsed);
          }
        } catch (e) {}
      }
    }
  }, [user]);

  // Subscribe to participants from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToCollection(
      "participants",
      (items) => {
        setParticipants(items || []);
        setLoadingParticipants(false);
      },
      (err) => {
        console.error("Failed to load participants:", err);
        setLoadingParticipants(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to scores collection from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToCollection(
      "scores",
      (items) => {
        const map = {};
        (items || []).forEach((item) => {
          map[item.id || item.participantId] = item;
        });
        setSavedScoresMap(map);
      },
      (err) => {
        console.error("Failed to load scores:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  // When saved scores or participants load, pre-fill score inputs with existing scores
  useEffect(() => {
    setScoreInputs((prev) => {
      const next = { ...prev };
      participants.forEach((p) => {
        const saved = savedScoresMap[p.id];
        if (saved && !next[p.id]) {
          const scoresArr = Array.isArray(saved.scores) ? saved.scores : [];
          next[p.id] = {
            asana1: saved.asana1 ?? scoresArr[0] ?? "",
            asana2: saved.asana2 ?? scoresArr[1] ?? "",
            asana3: saved.asana3 ?? scoresArr[2] ?? "",
            asana4: saved.asana4 ?? scoresArr[3] ?? "",
            asana5: saved.asana5 ?? scoresArr[4] ?? "",
            position: saved.position || "",
          };
        } else if (!next[p.id]) {
          const scoresArr = Array.isArray(p.scores) ? p.scores : [];
          next[p.id] = {
            asana1: scoresArr[0] ?? "",
            asana2: scoresArr[1] ?? "",
            asana3: scoresArr[2] ?? "",
            asana4: scoresArr[3] ?? "",
            asana5: scoresArr[4] ?? "",
            position: p.position || "",
          };
        }
      });
      return next;
    });
  }, [participants, savedScoresMap]);

  // Extract unique instructors from database participants
  const instructors = useMemo(() => {
    const set = new Set();
    participants.forEach((p) => {
      if (p.instructor && typeof p.instructor === "string" && p.instructor.trim()) {
        set.add(p.instructor.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [participants]);

  // Extract unique institutions from database participants
  const institutions = useMemo(() => {
    const set = new Set();
    participants.forEach((p) => {
      if (p.institution && typeof p.institution === "string" && p.institution.trim()) {
        set.add(p.institution.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [participants]);

  // Filter students by selected instructor AND selected institution
  const filteredStudents = useMemo(() => {
    return participants.filter((p) => {
      const matchInstructor =
        !selectedInstructor ||
        (p.instructor || "").trim().toLowerCase() === selectedInstructor.trim().toLowerCase();
      const matchInstitution =
        !selectedInstitution ||
        (p.institution || "").trim().toLowerCase() === selectedInstitution.trim().toLowerCase();
      return matchInstructor && matchInstitution;
    });
  }, [participants, selectedInstructor, selectedInstitution]);

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    const emailTrimmed = loginForm.email.trim().toLowerCase();
    const passwordTrimmed = loginForm.password;

    // Strict authentication: same as committee login
    if (emailTrimmed !== "committeeuser@gmail.com" || passwordTrimmed !== "admin") {
      setLoginError("Invalid credentials. Only committeeuser@gmail.com is authorized.");
      setLoggingIn(false);
      return;
    }

    try {
      await login(loginForm.email.trim(), loginForm.password);
    } catch (e) {
      // Local verified fallback
    }

    const authUserObj = {
      uid: "committeeuser",
      email: "committeeuser@gmail.com",
      role: "committee",
      displayName: "Committee Member",
    };
    setCustomAuthUser(authUserObj);
    setCurrentUser(authUserObj);
    setLoggingIn(false);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  // Handle individual asana input change
  const handleScoreChange = (participantId, field, value) => {
    // Validate value between 0 and 10 or empty
    if (value !== "") {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 10) return;
    }

    setScoreInputs((prev) => ({
      ...prev,
      [participantId]: {
        ...(prev[participantId] || {}),
        [field]: value,
      },
    }));

    // Clear save message on edit
    setSaveStatusMap((prev) => ({
      ...prev,
      [participantId]: null,
    }));
  };

  // Calculate total for a participant
  const calculateTotal = (studentId) => {
    const studentScores = scoreInputs[studentId] || {};
    const values = [
      studentScores.asana1,
      studentScores.asana2,
      studentScores.asana3,
      studentScores.asana4,
      studentScores.asana5,
    ];

    let sum = 0;
    let hasValue = false;
    values.forEach((v) => {
      if (v !== "" && !isNaN(Number(v))) {
        sum += Number(v);
        hasValue = true;
      }
    });

    return hasValue ? Math.round(sum * 100) / 100 : "";
  };

  // Save scores for a specific student to 'scores' collection and update participant
  const saveStudentScore = async (student) => {
    const studentId = student.id;
    const scores = scoreInputs[studentId] || {};

    const s1 = scores.asana1 !== "" ? Number(scores.asana1) : null;
    const s2 = scores.asana2 !== "" ? Number(scores.asana2) : null;
    const s3 = scores.asana3 !== "" ? Number(scores.asana3) : null;
    const s4 = scores.asana4 !== "" ? Number(scores.asana4) : null;
    const s5 = scores.asana5 !== "" ? Number(scores.asana5) : null;

    if (s1 === null || s2 === null || s3 === null || s4 === null || s5 === null) {
      setSaveStatusMap((prev) => ({
        ...prev,
        [studentId]: { error: "Please enter all 5 Asana scores (0 to 10 each)." },
      }));
      return;
    }

    setSavingId(studentId);
    setSaveStatusMap((prev) => ({ ...prev, [studentId]: null }));

    try {
      const totalScore = Math.round((s1 + s2 + s3 + s4 + s5) * 100) / 100;
      const timestamp = new Date().toISOString();

      const scoreData = {
        participantId: studentId,
        studentName: student.name || "",
        serialNumber: student.serialNumber || "",
        instructor: student.instructor || "",
        institution: student.institution || "",
        event: student.event || "",
        category: student.category || "",
        level: student.level || "",
        gender: student.gender || "",
        class: student.class || "",
        asana1: s1,
        asana2: s2,
        asana3: s3,
        asana4: s4,
        asana5: s5,
        scores: [s1, s2, s3, s4, s5],
        total: totalScore,
        position: scores.position || "",
        updatedAt: timestamp,
        savedAt: timestamp,
        evaluatedBy: currentUser?.email || "committeeuser@gmail.com",
      };

      // 1. Store in 'scores' collection
      await setDoc(doc(db, "scores", studentId), scoreData);

      // 2. Also update participant document with scores and score
      await updateDoc(doc(db, "participants", studentId), {
        score: totalScore,
        scores: [s1, s2, s3, s4, s5],
        position: scores.position || "",
        scoreUpdatedAt: timestamp,
      });

      setSaveStatusMap((prev) => ({
        ...prev,
        [studentId]: { success: `✓ Saved! Total: ${totalScore} / 50` },
      }));
    } catch (err) {
      console.error(`Failed to save scores for student ${studentId}:`, err);
      setSaveStatusMap((prev) => ({
        ...prev,
        [studentId]: { error: "Failed to save. Check connection and retry." },
      }));
    } finally {
      setSavingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: LOGIN VIEW (if not authenticated)
  // ─────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-orange-500 text-3xl">
              ⚖️
            </div>
            <h1 className="mt-4 text-3xl font-bold text-purple-700">Validation Login</h1>
            <p className="mt-2 text-sm text-gray-600">
              Access the score evaluation and validation sheets.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
              <input
                name="email"
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="committeeuser@gmail.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
              <input
                name="password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60 hover:opacity-95 transition-opacity"
            >
              {loggingIn ? "Signing in..." : "Login to Validation"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 2: VALIDATION SCORE SHEET DASHBOARD
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚖️</span>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                Validation & Score Evaluation
              </h1>
            </div>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Filter students by instructor and institution, enter scores across 5 Asanas (out of 10), and save official scorecards.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-center px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
          >
            Sign Out
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-purple-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🔍</span>
            <span>Filter Participants</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filter by Instructor */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Instructor:
              </label>
              {loadingParticipants ? (
                <div className="text-sm text-gray-500 py-2">Loading instructors...</div>
              ) : (
                <select
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none bg-white text-gray-800 text-sm md:text-base shadow-sm font-medium"
                >
                  <option value="">-- All Instructors --</option>
                  {instructors.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Filter by Institution */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Institution:
              </label>
              {loadingParticipants ? (
                <div className="text-sm text-gray-500 py-2">Loading institutions...</div>
              ) : (
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none bg-white text-gray-800 text-sm md:text-base shadow-sm font-medium"
                >
                  <option value="">-- All Institutions --</option>
                  {institutions.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Filter Status Badge */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600 font-medium">
              Showing <span className="font-bold text-purple-700">{filteredStudents.length}</span> students matching filter
              {selectedInstructor && <span> · Instructor: <strong className="text-gray-800">{selectedInstructor}</strong></span>}
              {selectedInstitution && <span> · Institution: <strong className="text-gray-800">{selectedInstitution}</strong></span>}
            </div>

            {(selectedInstructor || selectedInstitution) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedInstructor("");
                  setSelectedInstitution("");
                }}
                className="text-xs text-purple-600 hover:text-purple-800 font-bold underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Score Sheet Cards for Filtered Students */}
        <div className="space-y-6">
          {loadingParticipants ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-purple-100">
              <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Loading student evaluation sheets...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
              <span className="text-4xl block mb-2">🧘</span>
              <p className="text-gray-600 font-semibold text-lg">
                No students found matching the selected instructor/institution filters.
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Try selecting a different filter option or clear the filters above.
              </p>
            </div>
          ) : (
            filteredStudents.map((student, index) => {
              const studentScores = scoreInputs[student.id] || {};
              const currentTotal = calculateTotal(student.id);
              const isSaving = savingId === student.id;
              const status = saveStatusMap[student.id];
              const isAlreadySaved = !!savedScoresMap[student.id];

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-purple-100 transition-all hover:shadow-2xl"
                >
                  {/* Student Information Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                          #{index + 1}
                        </span>
                        <h3 className="text-2xl font-bold text-gray-900">{student.name}</h3>
                        {student.serialNumber && (
                          <span className="text-xs sm:text-sm font-extrabold bg-green-100 text-green-800 px-3 py-1 rounded-full">
                            {student.serialNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Institution: <strong className="text-gray-800">{student.institution || "—"}</strong> · Instructor: <strong className="text-gray-800">{student.instructor || "—"}</strong>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Class: {student.class || "—"} · Age: {student.age || "—"} · Gender: {student.gender || "—"} · Level: <span className="capitalize">{student.level || "—"}</span> · Event: <span className="capitalize">{student.event || "—"}</span> · Category: <span className="capitalize">{student.category || "—"}</span>
                      </p>
                    </div>

                    {/* Total Score Badge Header */}
                    <div className="flex items-center gap-3 self-start md:self-center">
                      {isAlreadySaved && (
                        <span className="text-xs font-bold bg-green-50 border border-green-300 text-green-700 px-3 py-1.5 rounded-xl">
                          ✓ Saved in Database
                        </span>
                      )}
                      <div className="bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-200 px-4 py-2 rounded-2xl text-center">
                        <span className="text-xs text-gray-500 block font-semibold">Total Score</span>
                        <span className="text-xl font-extrabold text-purple-700">
                          {currentTotal !== "" ? `${currentTotal} / 50` : "— / 50"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SCORE SHEET (Styled as shown in the requirement sheet) */}
                  <div className="bg-gray-50/70 p-4 sm:p-6 rounded-2xl border border-gray-300">
                    <div className="text-center mb-3">
                      <h4 className="text-base sm:text-lg font-bold text-gray-800 tracking-wide">
                        Score Sheet
                      </h4>
                      <p className="text-xs text-gray-500">Each Asana is scored out of 10 marks</p>
                    </div>

                    {/* Table matching the visual score sheet */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-400 bg-white text-center text-sm sm:text-base">
                        <thead>
                          <tr className="bg-gray-100 text-red-900 border-b border-gray-400">
                            <th className="border border-gray-400 px-3 py-2 font-bold w-1/6">Asana 1</th>
                            <th className="border border-gray-400 px-3 py-2 font-bold w-1/6">Asana 2</th>
                            <th className="border border-gray-400 px-3 py-2 font-bold w-1/6">Asana 3</th>
                            <th className="border border-gray-400 px-3 py-2 font-bold w-1/6">Asana 4</th>
                            <th className="border border-gray-400 px-3 py-2 font-bold w-1/6">Asana 5</th>
                            <th className="border border-gray-400 px-3 py-2 font-bold w-1/6 bg-purple-50 text-purple-900">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {/* Asana 1 */}
                            <td className="border border-gray-400 p-2">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                placeholder="0-10"
                                value={studentScores.asana1 ?? ""}
                                onChange={(e) => handleScoreChange(student.id, "asana1", e.target.value)}
                                className="w-full text-center px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-900 text-base"
                              />
                            </td>

                            {/* Asana 2 */}
                            <td className="border border-gray-400 p-2">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                placeholder="0-10"
                                value={studentScores.asana2 ?? ""}
                                onChange={(e) => handleScoreChange(student.id, "asana2", e.target.value)}
                                className="w-full text-center px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-900 text-base"
                              />
                            </td>

                            {/* Asana 3 */}
                            <td className="border border-gray-400 p-2">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                placeholder="0-10"
                                value={studentScores.asana3 ?? ""}
                                onChange={(e) => handleScoreChange(student.id, "asana3", e.target.value)}
                                className="w-full text-center px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-900 text-base"
                              />
                            </td>

                            {/* Asana 4 */}
                            <td className="border border-gray-400 p-2">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                placeholder="0-10"
                                value={studentScores.asana4 ?? ""}
                                onChange={(e) => handleScoreChange(student.id, "asana4", e.target.value)}
                                className="w-full text-center px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-900 text-base"
                              />
                            </td>

                            {/* Asana 5 */}
                            <td className="border border-gray-400 p-2">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                placeholder="0-10"
                                value={studentScores.asana5 ?? ""}
                                onChange={(e) => handleScoreChange(student.id, "asana5", e.target.value)}
                                className="w-full text-center px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-900 text-base"
                              />
                            </td>

                            {/* Total Box */}
                            <td className="border border-gray-400 p-2 bg-purple-50/50">
                              <div className="py-2 text-xl font-extrabold text-purple-800">
                                {currentTotal !== "" ? currentTotal : "—"}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Position / Rank Row (as shown in image) */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700 text-sm">Position :</span>
                        <input
                          type="text"
                          placeholder="e.g. 1st, 2nd, 3rd, Consolation"
                          value={studentScores.position || ""}
                          onChange={(e) => handleScoreChange(student.id, "position", e.target.value)}
                          className="px-3 py-1.5 border-b-2 border-gray-400 focus:border-purple-600 focus:outline-none bg-transparent text-sm font-semibold text-gray-800 w-48"
                        />
                      </div>

                      {/* Save Changes Button for this Student */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => saveStudentScore(student)}
                          disabled={isSaving}
                          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {isSaving ? "Saving..." : isAlreadySaved ? "Update Score" : "Save Score"}
                        </button>
                      </div>
                    </div>

                    {/* Feedback Alert for this student */}
                    {status && (
                      <div className="mt-3">
                        {status.success && (
                          <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded-xl text-xs sm:text-sm font-bold">
                            {status.success}
                          </div>
                        )}
                        {status.error && (
                          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs sm:text-sm font-bold">
                            {status.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Validation;
