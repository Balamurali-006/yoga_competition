import React, { useEffect, useState, useRef } from "react";
import { subscribeToCollection, updateCollectionDocument, deleteCollectionDocument } from "../../firebase/firestore";
import { doc, collection, writeBatch, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import * as XLSX from "xlsx";

const ManageParticipants = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", institution: "", event: "", category: "", level: "" });

  // Excel Upload & Import States
  const fileInputRef = useRef(null);
  const [previewStudents, setPreviewStudents] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

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
      (p.institution || "").toLowerCase().includes(term) ||
      (p.instructor || "").toLowerCase().includes(term)
    );
  });

  // Map event or level to standard code: DT (District), ST (State), NT (National), SI (South India)
  const getEventCode = (eventOrLevel) => {
    const val = String(eventOrLevel || "").toLowerCase().trim();
    if (val.includes("state") || val === "st") return "ST";
    if (val.includes("nat") || val === "nt") return "NT";
    if (val.includes("south") || val === "si") return "SI";
    return "DT";
  };

  // Compute next available serial counter for current year across participants and serialCounters doc
  const getSerialCounters = async () => {
    const year = new Date().getFullYear();
    const counters = { DT: 0, ST: 0, NT: 0, SI: 0 };

    participants.forEach((p) => {
      const sn = p.serialNumber;
      if (sn && typeof sn === "string") {
        const match = sn.match(new RegExp(`^${year}-(DT|ST|NT|SI)-(\\d+)$`, "i"));
        if (match) {
          const code = match[1].toUpperCase();
          const num = parseInt(match[2], 10);
          if (!isNaN(num) && num > (counters[code] || 0)) {
            counters[code] = num;
          }
        }
      }
    });

    try {
      const snap = await getDoc(doc(db, "serialCounters", String(year)));
      if (snap.exists()) {
        const data = snap.data();
        ["DT", "ST", "NT", "SI"].forEach((code) => {
          if (data[code] && Number(data[code]) > (counters[code] || 0)) {
            counters[code] = Number(data[code]);
          }
        });
      }
    } catch (e) {
      console.warn("Could not read serialCounters:", e);
    }

    return counters;
  };

  // Helper to extract value irrespective of column naming variants
  const getVal = (row, keys) => {
    for (const k of keys) {
      for (const [key, val] of Object.entries(row)) {
        if (key.toLowerCase().replace(/[^a-z0-9]/g, "") === k.toLowerCase().replace(/[^a-z0-9]/g, "")) {
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            return String(val).trim();
          }
        }
      }
    }
    return "";
  };

  // 1. Download Sample Excel Template
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "Student Name": "Aarav Kumar",
        "Age": 12,
        "DOB": "2013-05-10",
        "Gender": "Male",
        "Class": "7th",
        "Institution": "Green Valley School",
        "Instructor": "Ravi Sharma",
        "Instructor Phone": "9876543210",
        "Email": "aarav.kumar@example.com",
        "Event": "district",
        "Category": "forward",
        "Level": "district",
      },
      {
        "Student Name": "Diya Patel",
        "Age": 14,
        "DOB": "2011-08-22",
        "Gender": "Female",
        "Class": "9th",
        "Institution": "Green Valley School",
        "Instructor": "Ravi Sharma",
        "Instructor Phone": "9876543210",
        "Email": "diya.patel@example.com",
        "Event": "state",
        "Category": "backward",
        "Level": "state",
      },
      {
        "Student Name": "Vihaan Nair",
        "Age": 11,
        "DOB": "2014-02-15",
        "Gender": "Male",
        "Class": "6th",
        "Institution": "Patanjali Yoga Academy",
        "Instructor": "Anitha Menon",
        "Instructor Phone": "9123456780",
        "Email": "vihaan.nair@example.com",
        "Event": "district",
        "Category": "twist",
        "Level": "district",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students_Template");
    XLSX.writeFile(workbook, "yoga_participants_upload_template.xlsx");
  };

  // 2. Handle Excel File Upload & Parse
  const handleFileUpload = (e) => {
    setError("");
    setUploadSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rows || rows.length === 0) {
          setError("The uploaded Excel file does not contain any student rows.");
          return;
        }

        const parsed = [];
        const timestamp = new Date().toISOString();
        const year = new Date().getFullYear();
        const runningCounters = await getSerialCounters();

        rows.forEach((row) => {
          const name = getVal(row, ["name", "studentname", "participantname", "fullname"]);
          if (!name) return; // Skip empty rows

          const dob = getVal(row, ["dob", "dateofbirth", "birthdate"]);
          let age = getVal(row, ["age"]);
          if (!age && dob) {
            const birthDate = new Date(dob);
            if (!isNaN(birthDate.getTime())) {
              const diff = new Date().getFullYear() - birthDate.getFullYear();
              age = String(diff);
            }
          }

          const institution = getVal(row, ["institution", "school", "schoolname", "academy", "institutionname"]);
          const instructor = getVal(row, ["instructor", "instructorname", "coach", "master", "teacher"]);
          const instructorPhone = getVal(row, ["instructorphone", "phone", "mobile", "phonenumber", "contact"]);
          const email = getVal(row, ["email", "emailaddress", "emailid"]);
          const gender = getVal(row, ["gender", "sex"]) || "Unspecified";
          const studentClass = getVal(row, ["class", "grade", "standard"]);
          const event = (getVal(row, ["event", "eventtype"]) || "district").toLowerCase();
          const category = (getVal(row, ["category", "asanacategory"]) || "forward").toLowerCase();
          const level = (getVal(row, ["level", "competitionlevel"]) || "district").toLowerCase();

          // Serial number logic: Year-EventCode(DT,ST,NT)-SequentialNumber (e.g. 2026-DT-001)
          const eventCode = getEventCode(event || level);
          runningCounters[eventCode] = (runningCounters[eventCode] || 0) + 1;
          const seq = String(runningCounters[eventCode]).padStart(3, "0");
          const generatedSerial = `${year}-${eventCode}-${seq}`;
          const serialNumber = getVal(row, ["serialnumber", "serial", "serialno"]) || generatedSerial;

          parsed.push({
            name,
            dob: dob || "",
            age: age ? Number(age) || age : "",
            gender,
            class: studentClass || "",
            institution: institution || "Unspecified School",
            instructor: instructor || "Unspecified Instructor",
            instructorPhone: instructorPhone || "",
            email: email || "",
            event,
            category,
            level,
            serialNumber,
            paymentStatus: "success",
            verificationStatus: "verified",
            visited: false,
            score: null,
            scores: null,
            registeredVia: "excel_upload",
            createdAt: timestamp,
          });
        });

        if (parsed.length === 0) {
          setError("Could not find any valid student rows. Please check that your file has a 'Student Name' or 'Name' column.");
          return;
        }

        setPreviewStudents(parsed);
        setShowImportModal(true);
      } catch (err) {
        console.error("Failed to parse Excel file:", err);
        setError("Could not parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 3. Confirm and Write Students to Firestore
  const confirmImport = async () => {
    if (!previewStudents || previewStudents.length === 0) return;

    setIsImporting(true);
    setError("");

    try {
      // Chunk writes into batches of 400 (Firestore limit is 500)
      const chunkSize = 400;
      for (let i = 0; i < previewStudents.length; i += chunkSize) {
        const chunk = previewStudents.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((student) => {
          const docRef = doc(collection(db, "participants"));
          batch.set(docRef, {
            ...student,
            id: docRef.id,
          });
        });

        await batch.commit();
      }

      // Update Firestore serialCounters document so upi-backend and subsequent imports stay synchronized
      try {
        const year = new Date().getFullYear();
        const updatedCounters = {};
        previewStudents.forEach((student) => {
          const match = (student.serialNumber || "").match(new RegExp(`^${year}-(DT|ST|NT|SI)-(\\d+)$`, "i"));
          if (match) {
            const code = match[1].toUpperCase();
            const num = parseInt(match[2], 10);
            if (num > (updatedCounters[code] || 0)) {
              updatedCounters[code] = num;
            }
          }
        });
        if (Object.keys(updatedCounters).length > 0) {
          await setDoc(doc(db, "serialCounters", String(year)), updatedCounters, { merge: true });
        }
      } catch (counterSyncErr) {
        console.warn("Could not sync serialCounters document:", counterSyncErr);
      }

      setUploadSuccess(`✓ Successfully imported ${previewStudents.length} students into the database! All serial numbers and records are now active.`);
      setShowImportModal(false);
      setPreviewStudents([]);
    } catch (err) {
      console.error("Batch import failed:", err);
      setError(`Failed to import students to Firestore: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

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
      Instructor: p.instructor || "",
      "Instructor Phone": p.instructorPhone || "",
      Age: p.age || "",
      Gender: p.gender || "",
      Class: p.class || "",
      Event: p.event || "",
      Category: p.category || "",
      Level: p.level || "",
      "Serial Number": p.serialNumber || "",
      "Payment Status": p.paymentStatus || "",
      Visited: p.visited ? "Yes" : "No",
      "Total Score": p.score ?? "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");
    XLSX.writeFile(workbook, "participants.xlsx");
  };

  const DetailField = ({ label, value }) => (
    <div>
      <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
      <p className="text-sm text-gray-800 font-medium">{value || "-"}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-purple-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
              Manage Participants
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              View, edit, export, and batch import school registrations from Excel sheets.
            </p>
          </div>

          {/* Action Buttons: Template Download + Excel Upload + Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs sm:text-sm border border-purple-200 transition-colors shadow-xs"
              title="Download Excel spreadsheet with sample student data"
            >
              <span>📥</span>
              <span>Sample Template</span>
            </button>

            {/* Hidden File Input for Excel Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
            >
              <span>📤</span>
              <span>Upload School Excel</span>
            </button>

            <button
              type="button"
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs sm:text-sm border border-gray-300 transition-colors"
            >
              <span>📊</span>
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-xs font-bold text-gray-500 hover:text-gray-800">✕</button>
          </div>
        )}

        {uploadSuccess && (
          <div role="status" className="mb-4 rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-bold text-green-800 flex items-center justify-between shadow-xs">
            <span>{uploadSuccess}</span>
            <button onClick={() => setUploadSuccess("")} className="text-xs font-bold text-gray-500 hover:text-gray-800">✕</button>
          </div>
        )}

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by student name, serial number, institution, or instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-gray-500 self-center">
            Total: <strong className="text-purple-700 text-base">{filtered.length}</strong> participants
          </div>
        </div>

        {/* Participants Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600 font-medium">Loading participants...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-600">
            {searchTerm ? "No participants match your search query." : "No participants found in the database."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-xs">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-purple-600 to-orange-500 text-white">
                  <th className="px-4 py-3 font-semibold">Serial</th>
                  <th className="px-4 py-3 font-semibold">Student Name</th>
                  <th className="px-4 py-3 font-semibold">Institution</th>
                  <th className="px-4 py-3 font-semibold">Instructor</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Visited</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((participant) => (
                  <React.Fragment key={participant.id}>
                    {/* Main row */}
                    <tr className="hover:bg-purple-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-purple-700">{participant.serialNumber || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{participant.name || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{participant.institution || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{participant.instructor || "-"}</td>
                      <td className="px-4 py-3 capitalize text-gray-700">{participant.category || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          participant.paymentStatus === "success" || participant.paymentStatus === "paid" || participant.paymentStatus === "VERIFIED"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {participant.paymentStatus || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          participant.visited ? "bg-green-200 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}>
                          {participant.visited ? "✓ Visited" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === participant.id ? null : participant.id)}
                            className="rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200"
                          >
                            {expandedId === participant.id ? "Hide" : "View"}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(participant)}
                            className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(participant.id, participant.name || participant.id)}
                            className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {expandedId === participant.id && (
                      <tr>
                        <td colSpan={8} className="px-5 py-4 bg-purple-50/70 border-y border-purple-200">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            <DetailField label="Full Name" value={participant.name} />
                            <DetailField label="Serial Number" value={participant.serialNumber} />
                            <DetailField label="Institution" value={participant.institution} />
                            <DetailField label="Instructor Name" value={participant.instructor} />
                            <DetailField label="Instructor Phone" value={participant.instructorPhone} />
                            <DetailField label="Email" value={participant.email} />
                            <DetailField label="Age / DOB" value={`${participant.age ? `${participant.age} yrs` : "-"} · ${participant.dob || "-"}`} />
                            <DetailField label="Gender" value={participant.gender} />
                            <DetailField label="Class" value={participant.class} />
                            <DetailField label="Event / Tier" value={`${participant.event || "-"} (${participant.level || "-"})`} />
                            <DetailField label="Asana Category" value={participant.category} />
                            <DetailField label="Visited Status" value={participant.visited ? "Yes (Marked Present)" : "No"} />
                            <DetailField label="Score / Prize" value={participant.score != null ? `${participant.score} / 50 (${participant.prize || "Rated"})` : "Not Scored Yet"} />
                            <DetailField label="Registration Source" value={participant.registeredVia === "excel_upload" ? "Excel Upload" : "Web Portal"} />
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Inline edit row */}
                    {editingId === participant.id && (
                      <tr>
                        <td colSpan={8} className="px-5 py-4 bg-blue-50/70 border-y border-blue-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
                              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Institution</label>
                              <input value={editForm.institution} onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Event</label>
                              <input value={editForm.event} onChange={(e) => setEditForm({ ...editForm, event: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                              <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Level</label>
                              <input value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button type="button" onClick={saveEdit} className="rounded-lg bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-2 text-sm font-bold text-white hover:opacity-90">Save Changes</button>
                            <button type="button" onClick={cancelEdit} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 bg-white">Cancel</button>
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

        {/* ─────────────────────────────────────────────────────────────
            MODAL: PREVIEW & CONFIRM EXCEL IMPORT
        ───────────────────────────────────────────────────────────── */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 md:p-8 max-h-[90vh] flex flex-col border border-purple-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <span>📤</span>
                    <span>Review Excel Student Data</span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    File: <strong className="text-purple-700">{importFileName}</strong> · Found{" "}
                    <span className="font-bold text-green-700">{previewStudents.length}</span> valid student records
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  disabled={isImporting}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content / Preview Table */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs sm:text-sm text-purple-900">
                  <p className="font-semibold mb-1">⚡ Automatic Participant Setup:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-700 text-xs">
                    <li>Unique official serial numbers will be generated automatically for every student.</li>
                    <li>Payment status will be marked as <strong className="text-green-700 font-bold">Confirmed / Paid</strong>.</li>
                    <li>Students will instantly be available in Committee Attendance, Validation Scoring, and Results.</li>
                  </ul>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-700 font-semibold">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Student Name</th>
                        <th className="p-2.5">Age</th>
                        <th className="p-2.5">Class</th>
                        <th className="p-2.5">Institution</th>
                        <th className="p-2.5">Instructor</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewStudents.slice(0, 8).map((st, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-2.5 text-gray-500 font-mono">{i + 1}</td>
                          <td className="p-2.5 font-bold text-gray-900">{st.name}</td>
                          <td className="p-2.5">{st.age || "-"}</td>
                          <td className="p-2.5">{st.class || "-"}</td>
                          <td className="p-2.5 text-gray-700">{st.institution}</td>
                          <td className="p-2.5 text-gray-700">{st.instructor}</td>
                          <td className="p-2.5 capitalize">{st.category}</td>
                          <td className="p-2.5 capitalize">{st.level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {previewStudents.length > 8 && (
                  <p className="text-center text-xs text-gray-500 font-medium italic">
                    ... and {previewStudents.length - 8} more students ready to import.
                  </p>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-end items-center">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  disabled={isImporting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmImport}
                  disabled={isImporting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-60"
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Importing to Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Import {previewStudents.length} Students</span>
                      <span>✓</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageParticipants;
