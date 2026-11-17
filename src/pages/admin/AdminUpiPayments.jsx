import React, { useCallback, useEffect, useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";
import { upiApiRequest } from "../../firebase/upiApi";

const FILTERS = ["ALL", "PENDING", "SUBMITTED", "UNDER_REVIEW", "VERIFIED", "REJECTED", "REFUND_PENDING", "REFUNDED"];

const formatRupees = (paise) => `₹${(Number(paise || 0) / 100).toFixed(2)}`;

const AdminUpiPayments = () => {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState({});
  const [reasons, setReasons] = useState({});
  const [bankConfirmed, setBankConfirmed] = useState({});
  const [audit, setAudit] = useState({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expandedStudents, setExpandedStudents] = useState({});

  const toggleStudent = (key) => {
    setExpandedStudents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const adminRequest = useCallback(async (path, options = {}) => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Please sign in with the real Firebase admin account. Local demo data is not used for payment verification.");
    }

    return upiApiRequest(path, {
      ...options,
      accessToken: await getIdToken(user),
    });
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status: filter, q: query });
      const result = await adminRequest(`/api/admin/payments?${params.toString()}`);
      setPayments(result.payments || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [adminRequest, filter, query]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const updatePayment = async (payment, status, extra = {}) => {
    setWorkingId(payment.id);
    setError("");
    setMessage("");
    try {
      const result = await adminRequest(`/api/admin/payments/${encodeURIComponent(payment.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          adminNotes: notes[payment.id] ?? payment.adminNotes,
          rejectionReason: reasons[payment.id] || "",
          bankRecordConfirmed: bankConfirmed[payment.id] === true,
          ...extra,
        }),
      });
      setMessage(result.paymentStatus === "VERIFIED" && result.approvalEmailSent
        ? "Payment verified and serial number email sent."
        : result.alreadyVerified
          ? "Payment was already verified; existing serial numbers were kept."
          : "Payment record updated.");
      await loadPayments();
      if (audit[payment.id]) await loadAudit(payment.id);
    } catch (updateError) {
      const errorMessage = updateError.message;
      await loadPayments();
      setError(errorMessage);
    } finally {
      setWorkingId("");
    }
  };

  const loadAudit = async (paymentId) => {
    try {
      const result = await adminRequest(`/api/admin/payments/${encodeURIComponent(paymentId)}/audit`);
      setAudit((current) => ({ ...current, [paymentId]: result.entries || [] }));
    } catch (auditError) {
      setError(auditError.message);
    }
  };

  const setField = (setter, paymentId, value) =>
    setter((current) => ({ ...current, [paymentId]: value }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-purple-700">UPI Payment Verification</h1>
          <p className="mt-1 text-gray-600">Confirm submitted UTRs against the organization’s trusted bank transaction records before approving.</p>
        </header>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}

        <section className="mb-6 rounded-2xl bg-white p-4 shadow-lg">
          <form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); }} className="flex flex-col gap-3 md:flex-row">
            <label className="flex-1 text-sm font-medium text-gray-700">
              Search six-digit payment code, registration ID or UTR
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Payment status
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3">
                {FILTERS.map((status) => <option key={status} value={status}>{status === "ALL" ? "All payments" : status.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <button className="self-end rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800">Search</button>
          </form>
        </section>

        {loading ? <p className="text-gray-600">Loading payments...</p> : payments.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-gray-600 shadow">No payment records match this filter.</div>
        ) : (
          <div className="space-y-5">
            {payments.map((payment) => (
              <article key={payment.id} className="rounded-2xl bg-white p-5 shadow-lg md:p-6 border border-purple-100">
                {/* Top Section: Payment Code (bigger), Participants & Amount, Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <div className="text-xl md:text-2xl font-black text-purple-700 tracking-wider font-mono">
                      Payment code: {payment.paymentReference || "—"}
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mt-1">
                      {payment.participantCount} participant(s) · {formatRupees(payment.expectedAmountPaise || payment.amountPaise)}
                    </p>
                  </div>
                  <span
                    className={`h-fit w-fit rounded-full px-4 py-1.5 text-xs md:text-sm font-extrabold uppercase tracking-wide ${
                      payment.paymentStatus === "VERIFIED"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : payment.paymentStatus === "REJECTED"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : payment.paymentStatus === "REFUND_PENDING" || payment.paymentStatus === "REFUNDED"
                        ? "bg-orange-100 text-orange-800 border border-orange-200"
                        : "bg-purple-100 text-purple-800 border border-purple-200"
                    }`}
                  >
                    {payment.paymentStatus.replaceAll("_", " ")}
                  </span>
                </div>

                {/* Essential Details Grid: UTR, Payment Date, Submitted */}
                <div className="grid gap-4 py-4 text-sm sm:grid-cols-3 bg-gray-50/70 p-4 rounded-xl mt-3 border border-gray-100">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">UTR</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5 break-all">
                      {payment.utr || "Not submitted"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Payment Date</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {payment.paymentDateTime ? new Date(payment.paymentDateTime).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Submitted</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {payment.submittedAt ? new Date(payment.submittedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>

                {/* Participant Students List */}
                <div className="my-4 space-y-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Students</h3>
                  {payment.participantSummary.map((participant, pIdx) => {
                    const studentKey = `${payment.id}_${participant.registrationId || pIdx}`;
                    const isExpanded = !!expandedStudents[studentKey];
                    return (
                      <div key={studentKey} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                        <button
                          type="button"
                          onClick={() => toggleStudent(studentKey)}
                          className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50/60 to-white hover:from-purple-100/70 text-left transition-colors"
                        >
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <span>👤 {participant.name}</span>
                              <span className="text-xs text-purple-600 font-medium">
                                ({isExpanded ? "▲ click to hide details" : "▼ click to view details"})
                              </span>
                            </div>
                            <div className="text-xs md:text-sm text-gray-600 font-medium mt-0.5">
                              Instructor: <span className="text-gray-900 font-semibold">{participant.instructor || "—"}</span>
                            </div>
                          </div>
                          <span className="text-purple-600 font-bold text-sm px-2 py-1 rounded-md bg-purple-100/60">
                            {isExpanded ? "Less ▲" : "More ▼"}
                          </span>
                        </button>

                        {/* Collapsible Details */}
                        {isExpanded && (
                          <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs sm:text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                              <span className="text-gray-500 font-medium block">School / Institution</span>
                              <span className="font-semibold text-gray-800">{participant.institution || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium block">Email</span>
                              <span className="font-semibold text-gray-800">{participant.email || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium block">Phone</span>
                              <span className="font-semibold text-gray-800">{participant.phone || participant.instructorPhone || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium block">Event & Level</span>
                              <span className="font-semibold text-gray-800">
                                {participant.event ? participant.event.toUpperCase() : "—"} / {participant.level ? participant.level.toUpperCase() : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium block">Category</span>
                              <span className="font-semibold text-gray-800">{participant.category || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium block">Class & Age</span>
                              <span className="font-semibold text-gray-800">
                                {participant.class || "—"} {participant.age ? `(${participant.age} yrs)` : ""}
                              </span>
                            </div>
                            {participant.serialNumber && (
                              <div className="sm:col-span-2 md:col-span-3">
                                <span className="text-gray-500 font-medium block">Official Serial Number</span>
                                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  {participant.serialNumber}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Rejection reason (if any) */}
                {payment.rejectionReason && (
                  <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                    <strong>Rejection reason:</strong> {payment.rejectionReason}
                  </p>
                )}

                {/* Internal Verification Note & Rejection Input for non-verified */}
                <div className="grid gap-3 md:grid-cols-2 pt-2 border-t border-gray-100">
                  <label className="text-xs font-semibold text-gray-700">
                    Internal verification note
                    <textarea
                      value={notes[payment.id] ?? payment.adminNotes}
                      onChange={(event) => setField(setNotes, payment.id, event.target.value)}
                      rows="2"
                      maxLength="1000"
                      placeholder="Add internal note..."
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    />
                  </label>
                  {payment.paymentStatus !== "VERIFIED" && (
                    <label className="text-xs font-semibold text-gray-700">
                      Rejection reason (required to reject)
                      <textarea
                        value={reasons[payment.id] || ""}
                        onChange={(event) => setField(setReasons, payment.id, event.target.value)}
                        rows="2"
                        maxLength="500"
                        placeholder="State reason for rejecting payment..."
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                      />
                    </label>
                  )}
                </div>

                {/* Bank confirmation checkbox */}
                {["SUBMITTED", "UNDER_REVIEW"].includes(payment.paymentStatus) && (
                  <label className="mt-3 flex items-start gap-2 text-xs md:text-sm text-gray-700 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                    <input
                      type="checkbox"
                      checked={bankConfirmed[payment.id] || false}
                      onChange={(event) => setField(setBankConfirmed, payment.id, event.target.checked)}
                      className="mt-0.5 rounded text-purple-600"
                    />
                    <span>I confirmed this UTR and exact amount in the organization’s actual bank transaction history.</span>
                  </label>
                )}

                {/* Actions Toolbar & Audit History */}
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                  {["SUBMITTED", "UNDER_REVIEW"].includes(payment.paymentStatus) && (
                    <>
                      <button
                        disabled={workingId === payment.id || !bankConfirmed[payment.id]}
                        onClick={() => updatePayment(payment, "VERIFIED")}
                        className="rounded-xl bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-xs transition-all disabled:opacity-50"
                      >
                        Approve verified payment
                      </button>
                      <button
                        disabled={workingId === payment.id || !(reasons[payment.id] || "").trim()}
                        onClick={() => updatePayment(payment, "REJECTED")}
                        className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-bold text-white shadow-xs transition-all disabled:opacity-50"
                      >
                        Reject payment
                      </button>
                      {payment.paymentStatus === "SUBMITTED" && (
                        <button
                          disabled={workingId === payment.id}
                          onClick={() => updatePayment(payment, "UNDER_REVIEW")}
                          className="rounded-xl border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                        >
                          Mark under review
                        </button>
                      )}
                    </>
                  )}

                  {payment.paymentStatus === "VERIFIED" && (
                    <button
                      disabled={workingId === payment.id}
                      onClick={() => updatePayment(payment, "REFUND_PENDING")}
                      className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Mark refund pending
                    </button>
                  )}

                  {payment.paymentStatus === "REFUND_PENDING" && (
                    <button
                      disabled={workingId === payment.id}
                      onClick={() => updatePayment(payment, "REFUNDED")}
                      className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Confirm refunded
                    </button>
                  )}

                  <button
                    disabled={workingId === payment.id}
                    onClick={() => updatePayment(payment, payment.paymentStatus)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Save note
                  </button>

                  <button
                    onClick={() =>
                      audit[payment.id]
                        ? setAudit((current) => ({ ...current, [payment.id]: null }))
                        : loadAudit(payment.id)
                    }
                    className="rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700 transition-colors"
                  >
                    {audit[payment.id] ? "Hide audit history" : "Audit history"}
                  </button>
                </div>

                {/* Audit history list */}
                {audit[payment.id] && (
                  <ol className="mt-4 space-y-2 border-l-2 border-purple-400 pl-4 text-xs md:text-sm bg-purple-50/40 p-3 rounded-r-xl">
                    <p className="font-bold text-purple-800 mb-1">Audit Trail:</p>
                    {audit[payment.id].map((entry) => (
                      <li key={entry.id} className="text-gray-700">
                        <span className="font-semibold text-gray-900">{entry.action.replaceAll("_", " ")}</span>
                        {entry.fromStatus && <> · {entry.fromStatus} → {entry.toStatus}</>}
                        {entry.reason && <> · Reason: {entry.reason}</>}
                        {entry.note && <> · Note: {entry.note}</>}
                        {entry.bankRecordConfirmed && <> · Bank record confirmed by admin</>}
                        <span className="ml-2 text-xs text-gray-400">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}
                        </span>
                      </li>
                    ))}
                    {audit[payment.id].length === 0 && <li className="text-gray-500">No audit events recorded.</li>}
                  </ol>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminUpiPayments;
