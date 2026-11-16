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
  const [screenshotUrls, setScreenshotUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const retrySubmissionNotification = async (payment) => {
    setWorkingId(payment.id);
    setError("");
    setMessage("");
    try {
      const result = await adminRequest(
        `/api/admin/payments/${encodeURIComponent(payment.id)}/retry-submission-notification`,
        { method: "POST" }
      );
      setMessage(result.alreadySent
        ? "The admin notification was already sent."
        : "Verification request notification sent to the admin inbox.");
      await loadPayments();
    } catch (retryError) {
      const errorMessage = retryError.message;
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

  const loadScreenshot = async (paymentId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again as an administrator.");
      const response = await fetch(
        `${process.env.REACT_APP_UPI_API_BASE_URL || "http://localhost:5001"}/api/admin/payments/${encodeURIComponent(paymentId)}/screenshot`,
        { headers: { Authorization: `Bearer ${await getIdToken(user)}` } }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not load screenshot.");
      }
      const url = URL.createObjectURL(await response.blob());
      setScreenshotUrls((current) => ({ ...current, [paymentId]: url }));
    } catch (screenshotError) {
      setError(screenshotError.message);
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
              <article key={payment.id} className="rounded-2xl bg-white p-5 shadow-lg md:p-6">
                <div className="flex flex-col justify-between gap-3 border-b pb-4 md:flex-row">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Registration {payment.registrationId}</h2>
                    <p className="break-all text-xs text-gray-500">Payment record: {payment.id}</p>
                    {payment.paymentReference && (
                      <p className="mt-1 font-mono text-sm font-bold tracking-wider text-purple-700">
                        Payment code: {payment.paymentReference}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">{payment.participantCount} participant(s) · {formatRupees(payment.expectedAmountPaise)}</p>
                  </div>
                  <span className="h-fit rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-800">{payment.paymentStatus.replaceAll("_", " ")}</span>
                </div>

                <div className="grid gap-3 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <p><span className="font-semibold">UTR:</span> {payment.utr || "Not submitted"}</p>
                  <p><span className="font-semibold">Amount claimed:</span> {formatRupees(payment.amountPaise)}</p>
                  <p><span className="font-semibold">Payment date:</span> {payment.paymentDateTime ? new Date(payment.paymentDateTime).toLocaleString() : "—"}</p>
                  <p><span className="font-semibold">Submitted:</span> {payment.submittedAt ? new Date(payment.submittedAt).toLocaleString() : "—"}</p>
                  {payment.upiApp && <p><span className="font-semibold">UPI app:</span> {payment.upiApp}</p>}
                </div>
                {payment.paymentStatus === "SUBMITTED" && !payment.adminNotificationSent && (
                  <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    Admin notification email has not been confirmed. The participant can retry submission with the same UTR.
                  </p>
                )}

                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  {payment.participantSummary.map((participant) => (
                    <div key={participant.registrationId} className="rounded-xl bg-gray-50 p-3 text-sm">
                      <p className="font-semibold text-gray-900">{participant.name}</p>
                      <p className="text-gray-600">{participant.institution}</p>
                      <p className="text-gray-600">{participant.email} · {participant.phone}</p>
                      <p className="break-all text-xs text-gray-500">Registration ID: {participant.registrationId}</p>
                    </div>
                  ))}
                </div>

                {payment.rejectionReason && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"><strong>Rejection reason:</strong> {payment.rejectionReason}</p>}
                {payment.screenshotAvailable && (
                  <div className="mb-4">
                    {screenshotUrls[payment.id] ? (
                      <img src={screenshotUrls[payment.id]} alt="Participant's payment screenshot for reference" className="max-h-80 rounded-xl border object-contain" />
                    ) : (
                      <button type="button" onClick={() => loadScreenshot(payment.id)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">View screenshot (reference only)</button>
                    )}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Internal verification note
                    <textarea value={notes[payment.id] ?? payment.adminNotes} onChange={(event) => setField(setNotes, payment.id, event.target.value)} rows="2" maxLength="1000" className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2" />
                  </label>
                  {payment.paymentStatus !== "VERIFIED" && (
                    <label className="text-sm font-medium text-gray-700">
                      Rejection reason (required to reject)
                      <textarea value={reasons[payment.id] || ""} onChange={(event) => setField(setReasons, payment.id, event.target.value)} rows="2" maxLength="500" className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2" />
                    </label>
                  )}
                </div>

                {["SUBMITTED", "UNDER_REVIEW"].includes(payment.paymentStatus) && (
                  <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={bankConfirmed[payment.id] || false} onChange={(event) => setField(setBankConfirmed, payment.id, event.target.checked)} className="mt-1" />
                    I confirmed this UTR and exact amount in the organization’s actual bank transaction history.
                  </label>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {payment.paymentStatus === "SUBMITTED" && !payment.adminNotificationSent && (
                    <button disabled={workingId === payment.id} onClick={() => retrySubmissionNotification(payment)} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">Retry admin notification</button>
                  )}
                  {payment.paymentStatus === "SUBMITTED" && (
                    <button disabled={workingId === payment.id} onClick={() => updatePayment(payment, "UNDER_REVIEW")} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">Mark under review</button>
                  )}
                  {["SUBMITTED", "UNDER_REVIEW"].includes(payment.paymentStatus) && (
                    <>
                      <button disabled={workingId === payment.id || !bankConfirmed[payment.id]} onClick={() => updatePayment(payment, "VERIFIED")} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve verified payment</button>
                      <button disabled={workingId === payment.id || !(reasons[payment.id] || "").trim()} onClick={() => updatePayment(payment, "REJECTED")} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reject payment</button>
                    </>
                  )}
                  {payment.paymentStatus === "VERIFIED" && (
                    <>
                      {!payment.approvalEmailSent && (
                        <button disabled={workingId === payment.id} onClick={() => updatePayment(payment, "VERIFIED")} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">Retry serial email</button>
                      )}
                      <button disabled={workingId === payment.id} onClick={() => updatePayment(payment, "REFUND_PENDING")} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Mark refund pending</button>
                    </>
                  )}
                  {payment.paymentStatus === "REFUND_PENDING" && (
                    <button disabled={workingId === payment.id} onClick={() => updatePayment(payment, "REFUNDED")} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Confirm refunded</button>
                  )}
                  <button disabled={workingId === payment.id} onClick={() => updatePayment(payment, payment.paymentStatus)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Save note</button>
                  <button onClick={() => audit[payment.id] ? setAudit((current) => ({ ...current, [payment.id]: null })) : loadAudit(payment.id)} className="rounded-lg border border-purple-300 px-4 py-2 text-sm font-semibold text-purple-700">Audit history</button>
                </div>

                {audit[payment.id] && (
                  <ol className="mt-4 space-y-2 border-l-2 border-purple-200 pl-4 text-sm">
                    {audit[payment.id].map((entry) => (
                      <li key={entry.id}>
                        <span className="font-semibold">{entry.action.replaceAll("_", " ")}</span>
                        {entry.fromStatus && <> · {entry.fromStatus} → {entry.toStatus}</>}
                        {entry.reason && <> · {entry.reason}</>}
                        {entry.note && <> · {entry.note}</>}
                        {entry.bankRecordConfirmed && <> · Bank record confirmed by admin</>}
                        <span className="ml-2 text-xs text-gray-500">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}</span>
                      </li>
                    ))}
                    {audit[payment.id].length === 0 && <li>No audit events recorded.</li>}
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
