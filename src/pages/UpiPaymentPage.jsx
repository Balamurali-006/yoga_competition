import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  getRegistrationAccess,
  upiApiRequest,
} from "../firebase/upiApi";

const statusMessage = {
  PENDING: "Please complete your registration payment.",
  SUBMITTED: "Your payment details have been submitted.",
  UNDER_REVIEW: "Your payment is awaiting verification.",
  VERIFIED: "Payment verified! Your registration is confirmed.",
  REJECTED: "The submitted payment could not be verified. Review the reason and resubmit payment details.",
  REFUND_PENDING: "A refund has been initiated and is awaiting confirmation.",
  REFUNDED: "The refund has been confirmed.",
};

const formatRupees = (paise) => `₹${(Number(paise || 0) / 100).toFixed(2)}`;

const UpiPaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { paymentId, pid } = useParams();
  const paymentGroupId = paymentId || pid;
  const accessToken = getRegistrationAccess(paymentGroupId);
  const [config, setConfig] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [utr, setUtr] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDateTime, setPaymentDateTime] = useState("");
  const [upiApp, setUpiApp] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRegistration = useCallback(async () => {
    if (!accessToken) {
      setError("This registration was created in another browser session. Return to the registration device to continue.");
      setLoading(false);
      return;
    }

    try {
      const details = await upiApiRequest(`/api/registrations/${encodeURIComponent(paymentGroupId)}`, {
        accessToken,
      });
      setRegistration(details);
      setAmount((details.amountPaise / 100).toFixed(2));
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, paymentGroupId]);

  useEffect(() => {
    upiApiRequest("/api/payment/config")
      .then(setConfig)
      .catch((configLoadError) => setConfigError(configLoadError.message));
    loadRegistration();
  }, [loadRegistration]);

  // When payment is done (submitted, under review, or verified), clear saved drafts so new registrations start fresh
  useEffect(() => {
    if (registration && ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"].includes(registration.paymentStatus)) {
      try {
        localStorage.removeItem("yoga_individual_registration_draft");
        localStorage.removeItem("yoga_school_registration_draft");
        localStorage.removeItem("last_registration_type");
      } catch (_) {}
    }
  }, [registration]);

  const upiLink = useMemo(() => {
    if (!config || !registration) return "";
    const params = new URLSearchParams({
      pa: config.upiId,
      pn: config.payeeName,
      am: (registration.amountPaise / 100).toFixed(2),
      cu: "INR",
      tn: registration.paymentReference
        ? `Yoga registration ${registration.paymentReference}`
        : `Registration ${registration.registrationId}`,
    });
    if (registration.paymentReference) params.set("tr", registration.paymentReference);
    return `upi://pay?${params.toString()}`;
  }, [config, registration]);

  const canSubmit = registration && ["PENDING", "REJECTED"].includes(registration.paymentStatus);
  const submitPaymentDetails = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const localPaymentDate = new Date(paymentDateTime);
      if (Number.isNaN(localPaymentDate.getTime())) {
        throw new Error("Enter a valid payment date and time.");
      }
      await upiApiRequest(
        `/api/registrations/${encodeURIComponent(paymentGroupId)}/payment-submissions`,
        {
          method: "POST",
          accessToken,
          body: (() => {
            const formData = new FormData();
            formData.append("utr", utr);
            formData.append("amount", amount);
            formData.append("paymentDateTime", localPaymentDate.toISOString());
            formData.append("upiApp", upiApp);
            return formData;
          })(),
        }
      );
      setNotice("Payment details received. They will remain unverified until an admin checks the bank transaction.");
      setUtr("");
      try {
        localStorage.removeItem("yoga_individual_registration_draft");
        localStorage.removeItem("yoga_school_registration_draft");
        localStorage.removeItem("last_registration_type");
      } catch (_) {}
      await loadRegistration();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(config.upiId);
      setNotice("UPI ID copied.");
    } catch (copyError) {
      setError("Could not copy the UPI ID. Please select and copy it manually.");
    }
  };

  const isSchoolEntry = useMemo(() => {
    // 1. URL Query parameter ?type=school (highest priority, 100% persistent across reloads)
    const queryType = searchParams.get("type");
    if (queryType === "school") return true;
    if (queryType === "individual") return false;

    // 2. Navigation state from previous page
    if (location.state?.entryType === "school") return true;
    if (location.state?.entryType === "individual") return false;

    // 3. Session storage tag saved during registration submission
    const stored = sessionStorage.getItem("payment_entry_type_" + paymentGroupId);
    if (stored === "school") return true;
    if (stored === "individual") return false;

    // 4. Backend registration data
    if (registration?.entryType === "school") return true;
    if (registration?.entryType === "individual") return false;
    if (registration?.participantCount > 1) return true;

    // 5. Last registration type stored in localStorage
    const lastType = localStorage.getItem("last_registration_type");
    if (lastType === "school") return true;
    if (lastType === "individual") return false;

    // 6. Draft comparison fallback
    try {
      const schoolDraft = localStorage.getItem("yoga_school_registration_draft");
      if (schoolDraft) {
        const parsed = JSON.parse(schoolDraft);
        if (Array.isArray(parsed?.students) && parsed.students.length > 0) {
          if (parsed.students.some((s) => s.name && s.name.trim())) {
            return true;
          }
        }
      }
    } catch (_) {}

    return false;
  }, [searchParams, location.state, paymentGroupId, registration]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-purple-50 text-gray-700">Loading registration payment...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-xl md:p-8">
          {(!registration || registration.paymentStatus === "PENDING") && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  if (isSchoolEntry) {
                    navigate("/school-registration");
                  } else {
                    navigate("/register");
                  }
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
              >
                <span>←</span>
                <span>
                  {isSchoolEntry
                    ? "Back to School Registration (add/edit participants)"
                    : "Back to Individual Registration (edit details)"}
                </span>
              </button>
            </div>
          )}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-orange-500 text-3xl text-white">₹</div>
            <h1 className="text-3xl font-bold text-purple-700">Registration Payment</h1>
            <p className="mt-2 text-gray-600">Registration ID: <span className="font-semibold">{registration?.registrationId || paymentGroupId}</span></p>
            {registration?.paymentReference && (
              <p className="mt-2 text-gray-700">
                Six-digit payment reference: <span className="font-mono text-lg font-bold tracking-widest text-purple-700">{registration.paymentReference}</span>
              </p>
            )}
            {registration?.participantCount > 1 && (
              <p className="mt-1 text-sm text-gray-600">{registration.participantCount} school/group participants</p>
            )}
          </div>

          {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {configError && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Payment setup is unavailable: {configError}</p>}
          {notice && <p role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

          {registration && (
            <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-5 text-center">
              <p className="text-sm text-gray-600">Registration fee</p>
              <p className="mt-1 text-3xl font-extrabold text-purple-700">{formatRupees(registration.amountPaise)}</p>
              <div className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-purple-800">
                {registration.paymentStatus}
              </div>
              <p className="mt-3 text-sm text-gray-700">
                {statusMessage[registration.paymentStatus] || "Payment status is being updated."}
              </p>
            </div>
          )}

          {config && registration && canSubmit && (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-4 rounded-2xl border border-gray-200 p-5">
                <h2 className="text-lg font-bold text-gray-800">Pay using UPI</h2>
                <p className="text-sm text-gray-600">
                  Pay the exact amount below, then submit the transaction reference. A UPI ID, payment note, or screenshot alone does not confirm payment.
                </p>
                {registration.paymentReference && (
                  <p className="text-sm text-gray-700">
                    The six-digit code <strong>{registration.paymentReference}</strong> is prefilled as the UPI payment reference and note. Some UPI apps may not include the note in bank records, so the administrator will also check the UTR and amount.
                  </p>
                )}
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Organization UPI ID</p>
                  <p className="break-all font-semibold text-gray-900">{config.upiId}</p>
                  <button type="button" onClick={copyUpiId} className="mt-2 rounded-lg border border-purple-300 px-3 py-1.5 text-sm font-semibold text-purple-700 hover:bg-purple-50">
                    Copy UPI ID
                  </button>
                </div>

                {/* Direct Mobile UPI App Launchers */}
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Pay Directly from Your Phone
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={upiLink}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors shadow-sm"
                    >
                      <span>🔵</span>
                      <span>Google Pay</span>
                    </a>
                    <a
                      href={upiLink}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 font-bold text-xs hover:bg-purple-100 transition-colors shadow-sm"
                    >
                      <span>🟣</span>
                      <span>PhonePe</span>
                    </a>
                    <a
                      href={upiLink}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-700 font-bold text-xs hover:bg-sky-100 transition-colors shadow-sm"
                    >
                      <span>🔷</span>
                      <span>Paytm</span>
                    </a>
                    <a
                      href={upiLink}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 rounded-xl text-white font-bold text-xs hover:opacity-95 transition-opacity shadow-sm"
                    >
                      <span>📱</span>
                      <span>Any UPI App</span>
                    </a>
                  </div>
                </div>

                {config.qrCodeUrl && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">Organization payment QR</p>
                    <img src={config.qrCodeUrl} alt="Organization UPI payment QR code" className="mx-auto max-h-52 max-w-full rounded-lg border p-2" />
                  </div>
                )}
                <div className="text-center bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                  <p className="mb-1 text-sm font-bold text-gray-800">Scan QR with Any UPI App</p>
                  <p className="mb-3 text-xs text-gray-500">Scan via GPay, PhonePe, Paytm, or BHIM</p>
                  <div className="inline-block rounded-2xl border-2 border-purple-200 bg-white p-3 shadow-md">
                    <QRCodeSVG value={upiLink} size={180} level="M" includeMargin />
                  </div>
                </div>
              </div>

              <form onSubmit={submitPaymentDetails} className="space-y-4 rounded-2xl border border-gray-200 p-5">
                <h2 className="text-lg font-bold text-gray-800">Submit payment details</h2>
                <label className="block text-sm font-medium text-gray-700">
                  UPI transaction reference / UTR
                  <input value={utr} onChange={(event) => setUtr(event.target.value)} minLength="8" maxLength="35" autoComplete="off" className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 uppercase" required />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Amount paid (INR)
                  <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" required />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Payment date and approximate time
                  <input type="datetime-local" value={paymentDateTime} onChange={(event) => setPaymentDateTime(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" required />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  UPI app (optional)
                  <input value={upiApp} onChange={(event) => setUpiApp(event.target.value)} maxLength="80" placeholder="For example, BHIM or your bank app" className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                </label>
                <p className="text-xs text-gray-500">Submitting these details does not verify payment. An administrator will compare them with trusted bank transaction records.</p>
                <button disabled={submitting} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60">
                  {submitting ? "Submitting..." : "Submit for verification"}
                </button>
              </form>
            </div>
          )}

          {registration && ["SUBMITTED", "UNDER_REVIEW"].includes(registration.paymentStatus) && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-bold text-amber-900">Payment review in progress</h2>
              <p className="mt-1 text-sm text-amber-900">Submitted UTR: {registration.utr}</p>
              <p className="text-sm text-amber-900">Submitted at: {registration.submittedAt ? new Date(registration.submittedAt).toLocaleString() : "—"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={loadRegistration} className="rounded-xl border border-amber-400 bg-white px-3.5 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100/50">
                  🔄 Refresh status
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem("yoga_individual_registration_draft");
                      localStorage.removeItem("yoga_school_registration_draft");
                      localStorage.removeItem("last_registration_type");
                    } catch (_) {}
                    if (isSchoolEntry) {
                      navigate("/school-registration");
                    } else {
                      navigate("/register");
                    }
                  }}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
                >
                  ➕ Register Another Participant
                </button>
              </div>
            </div>
          )}

          {registration?.paymentStatus === "REJECTED" && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <h2 className="font-bold text-red-800">Payment details need attention</h2>
              <p className="mt-1 text-sm text-red-800">{registration.rejectionReason || "Contact the organizers before resubmitting."}</p>
            </div>
          )}

          {registration?.paymentStatus === "VERIFIED" && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center text-green-800">
                <h2 className="text-xl font-bold">Payment verified</h2>
                <p className="mt-1">Your registration is confirmed. Save or print your ticket for event check-in.</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 print:hidden">
                  <button type="button" onClick={() => window.print()} className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800">
                    Print / save ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem("yoga_individual_registration_draft");
                        localStorage.removeItem("yoga_school_registration_draft");
                        localStorage.removeItem("last_registration_type");
                      } catch (_) {}
                      if (isSchoolEntry) {
                        navigate("/school-registration");
                      } else {
                        navigate("/register");
                      }
                    }}
                    className="rounded-xl border-2 border-green-700 bg-white px-5 py-3 font-semibold text-green-800 hover:bg-green-50 shadow-sm"
                  >
                    ➕ Register Another Participant
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {registration.participants.map((participant) => (
                  <article key={participant.registrationId} className="rounded-2xl border bg-white p-5 text-center shadow-sm">
                    <p className="font-semibold text-gray-900">{participant.name}</p>
                    <p className="mt-1 text-sm text-gray-600">{participant.registrationId}</p>
                    <p className="my-3 text-lg font-extrabold text-purple-700">{participant.serialNumber}</p>
                    {participant.checkInToken && (
                      <div className="inline-block rounded-lg border bg-white p-2">
                        <QRCodeSVG value={participant.checkInToken} size={160} level="Q" includeMargin />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          {registration && ["REFUND_PENDING", "REFUNDED"].includes(registration.paymentStatus) && (
            <p className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">{statusMessage[registration.paymentStatus]}</p>
          )}
        </section>
      </div>
      <style>{`@media print { body * { visibility: hidden; } main, main * { visibility: visible; } main { position: absolute; inset: 0; background: white; } }`}</style>
    </main>
  );
};

export default UpiPaymentPage;
