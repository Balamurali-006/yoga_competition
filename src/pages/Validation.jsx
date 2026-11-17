import React, { useState, useEffect, useMemo } from "react";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { subscribeToCollection } from "../firebase/firestore";
import { login, logout } from "../firebase/auth";
import { getPrizeForScore } from "../utils/prize";

const Validation = ({ user }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Participants & Scores Data
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [savedScoresMap, setSavedScoresMap] = useState({});
  const [dataError, setDataError] = useState("");

  // Filter State
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  // In-memory score edits: { [participantId]: { asana1: "", asana2: "", asana3: "", asana4: "", asana5: "" } }
  const [scoreInputs, setScoreInputs] = useState({});
  const [saveStatusMap, setSaveStatusMap] = useState({});
  const [savingId, setSavingId] = useState(null);

  // When leaving/unmounting the Validation module, clear session so next visit requires login
  useEffect(() => {
    return () => {
      logout();
    };
  }, []);

  // Subscribe to participants and saved scorecards from Firestore.
  useEffect(() => {
    if (!currentUser || !auth.currentUser) {
      setParticipants([]);
      setSavedScoresMap({});
      setLoadingParticipants(false);
      return undefined;
    }

    setLoadingParticipants(true);
    setDataError("");
    const unsubscribeParticipants = subscribeToCollection(
      "participants",
      (items) => {
        setParticipants(items || []);
        setLoadingParticipants(false);
      },
      (err) => {
        console.error("Failed to load participants:", err);
        setDataError("Could not load participants. Confirm your Firebase staff role and Firestore rules.");
        setLoadingParticipants(false);
      }
    );
    const unsubscribeScores = subscribeToCollection(
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
        setDataError("Could not load saved scorecards. Confirm your Firebase staff role and Firestore rules.");
      }
    );
    return () => {
      unsubscribeParticipants();
      unsubscribeScores();
    };
  }, [currentUser]);

  // When saved scores or participants load, pre-fill score inputs with existing scores
  useEffect(() => {
    setScoreInputs((prev) => {
      const next = { ...prev };
      participants.forEach((p) => {
        const saved = savedScoresMap[p.id];
        if (saved) {
          const scoresArr = Array.isArray(saved.scores) ? saved.scores : [];
          const savedInputs = {
            asana1: saved.asana1 ?? scoresArr[0] ?? "",
            asana2: saved.asana2 ?? scoresArr[1] ?? "",
            asana3: saved.asana3 ?? scoresArr[2] ?? "",
            asana4: saved.asana4 ?? scoresArr[3] ?? "",
            asana5: saved.asana5 ?? scoresArr[4] ?? "",
          };
          const currentInputs = next[p.id] || {};
          next[p.id] = Object.fromEntries(
            Object.entries(savedInputs).map(([field, value]) => [
              field,
              currentInputs[field] === undefined || currentInputs[field] === ""
                ? value
                : currentInputs[field],
            ])
          );
        } else if (!next[p.id]) {
          const scoresArr = Array.isArray(p.scores) ? p.scores : [];
          next[p.id] = {
            asana1: scoresArr[0] ?? "",
            asana2: scoresArr[1] ?? "",
            asana3: scoresArr[2] ?? "",
            asana4: scoresArr[3] ?? "",
            asana5: scoresArr[4] ?? "",
          };
        }
      });
      return next;
    });
  }, [participants, savedScoresMap]);

  // Only students marked visited by the committee are eligible for evaluation
  const visitedParticipants = useMemo(() => {
    return participants.filter((p) => p.visited === true);
  }, [participants]);

  // Extract unique instructors from visited participants (with fallback if none visited yet)
  const instructors = useMemo(() => {
    const source = visitedParticipants.length > 0 ? visitedParticipants : participants;
    const set = new Set();
    source.forEach((p) => {
      if (p.instructor && typeof p.instructor === "string" && p.instructor.trim()) {
        set.add(p.instructor.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [visitedParticipants, participants]);

  // Extract unique institutions / schools from visited participants
  const institutions = useMemo(() => {
    const source = visitedParticipants.length > 0 ? visitedParticipants : participants;
    const set = new Set();
    source.forEach((p) => {
      const inst = p.institution || p.school;
      if (inst && typeof inst === "string" && inst.trim()) {
        set.add(inst.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [visitedParticipants, participants]);

  // Extract unique classes from visited participants
  const classes = useMemo(() => {
    const source = visitedParticipants.length > 0 ? visitedParticipants : participants;
    const set = new Set();
    source.forEach((p) => {
      if (p.class && typeof p.class === "string" && p.class.trim()) set.add(p.class.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [visitedParticipants, participants]);

  // Filter students by selected instructor, institution, and class
  // ONLY students who are visited can be evaluated and shown on the scoresheet
  const filteredStudents = useMemo(() => {
    return participants.filter((p) => {
      // Evaluation is only permitted for participants who are marked as visited
      if (!p.visited) {
        return false;
      }
      if (
        selectedInstructor &&
        (p.instructor || "").trim().toLowerCase() !== selectedInstructor.trim().toLowerCase()
      ) {
        return false;
      }
      const inst = (p.institution || p.school || "").trim().toLowerCase();
      if (selectedInstitution && inst !== selectedInstitution.trim().toLowerCase()) {
        return false;
      }
      if (
        selectedClass &&
        (p.class || "").trim().toLowerCase() !== selectedClass.trim().toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [participants, selectedInstructor, selectedInstitution, selectedClass]);

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const credential = await login(loginForm.email.trim(), loginForm.password);
      const signedInUser = credential?.user;
      if (!signedInUser) throw new Error("Firebase did not return a signed-in user.");

      const profile = await getDoc(doc(db, "users", signedInUser.uid));
      const role = profile.exists() ? profile.data().role : null;
      if (!["committee", "admin"].includes(role)) {
        await logout();
        throw new Error("This account needs a Firestore users/{uid} document with role 'committee' or 'admin'.");
      }

      setCurrentUser({ ...signedInUser, role });
    } catch (error) {
      console.error("Validation login error:", error);
      let msg = error.message || "Could not sign in to the validation page.";
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        msg = "Invalid email or password. Please verify your credentials.";
      }
      setLoginError(msg);
    } finally {
      setLoggingIn(false);
    }
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

    // Guard: Only visited students can be evaluated
    if (!student.visited) {
      setSaveStatusMap((prev) => ({
        ...prev,
        [studentId]: { error: "Evaluation can only be done for visited students. Student must be marked visited by committee first." },
      }));
      return;
    }

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

      const prize = getPrizeForScore(totalScore);
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
        prize,
        position: prize,
        updatedAt: timestamp,
        savedAt: timestamp,
        evaluatedBy: currentUser?.email || "committeeuser@gmail.com",
      };

      const batch = writeBatch(db);
      batch.set(doc(db, "scores", studentId), scoreData);
      batch.update(doc(db, "participants", studentId), {
        score: totalScore,
        scores: [s1, s2, s3, s4, s5],
        prize,
        position: prize,
        scoreUpdatedAt: timestamp,
      });
      await batch.commit();

      setSaveStatusMap((prev) => ({
        ...prev,
        [studentId]: { success: `✓ Saved! Total: ${totalScore} / 50 — ${prize}` },
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
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
              Filter students by class, enter scores across 5 Asanas (out of 10), and save official scorecards.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-center px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
          >
            Sign Out
          </button>
        </div>

        {dataError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {dataError}
          </p>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-purple-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🔍</span>
            <span>Filter Participants</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filter by Instructor */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Instructor:
              </label>
              {loadingParticipants ? (
                <div className="text-sm text-gray-500 py-2">Loading...</div>
              ) : (
                <select
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none bg-white text-gray-800 text-sm shadow-sm font-medium"
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
                <div className="text-sm text-gray-500 py-2">Loading...</div>
              ) : (
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none bg-white text-gray-800 text-sm shadow-sm font-medium"
                >
                  <option value="">-- All Institutions --</option>
                  {institutions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Filter by Class */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Class:
              </label>
              {loadingParticipants ? (
                <div className="text-sm text-gray-500 py-2">Loading...</div>
              ) : (
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none bg-white text-gray-800 text-sm shadow-sm font-medium"
                >
                  <option value="">-- All Classes --</option>
                  {classes.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Filter Status Badge */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600 font-medium flex flex-wrap items-center gap-2">
              <span>Showing <span className="font-bold text-green-700">{filteredStudents.length}</span> visited students eligible for evaluation</span>
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full font-semibold">
                ✓ Visited Only
              </span>
              {selectedInstructor && <span> · Instructor: <strong className="text-gray-800">{selectedInstructor}</strong></span>}
              {selectedInstitution && <span> · Institution: <strong className="text-gray-800">{selectedInstitution}</strong></span>}
              {selectedClass && <span> · Class: <strong className="text-gray-800">{selectedClass}</strong></span>}
            </div>

            {(selectedInstructor || selectedInstitution || selectedClass) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedInstructor("");
                  setSelectedInstitution("");
                  setSelectedClass("");
                }}
                className="text-xs text-purple-600 hover:text-purple-800 font-bold underline"
              >
                Clear All Filters
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
              <p className="text-gray-700 font-semibold text-lg">
                No visited students found matching the selected filters.
              </p>
              <p className="text-gray-500 text-sm mt-1 max-w-lg mx-auto">
                Evaluation can only be done for students who have arrived and been marked as <strong>"Visited"</strong> by the committee in attendance verification.
              </p>
            </div>
          ) : (
            filteredStudents.map((student, index) => {
              const studentScores = scoreInputs[student.id] || {};
              const currentTotal = calculateTotal(student.id);
              const isSaving = savingId === student.id;
              const status = saveStatusMap[student.id];
              const isAlreadySaved = !!savedScoresMap[student.id];
              const scoreValues = [
                studentScores.asana1,
                studentScores.asana2,
                studentScores.asana3,
                studentScores.asana4,
                studentScores.asana5,
              ];
              const currentPrize = scoreValues.every(
                (value) => value !== "" && Number.isFinite(Number(value))
              ) ? getPrizeForScore(currentTotal) : "";

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
                        <span className="mt-1 block text-sm font-bold text-orange-700">
                          {currentPrize || savedScoresMap[student.id]?.prize || savedScoresMap[student.id]?.position || "Prize pending"}
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

                    {/* Prize is assigned automatically from the completed total. */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700 text-sm">Prize:</span>
                        <span className="text-sm font-bold text-purple-700">
                          {currentPrize || savedScoresMap[student.id]?.prize || savedScoresMap[student.id]?.position || "Enter all five scores"}
                        </span>
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
