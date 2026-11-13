import React, { useState } from "react";
import "../styles/form.css";

const RegistrationStatus = () => {
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const checkStatus = async () => {
    const phone = mobile.replace(/\D/g, "");
    if (phone.length < 10) {
      setMessage("Enter the registered 10-digit phone number.");
      setStatus(null);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
      const response = await fetch(`${apiBaseUrl}/registration-status?phone=${encodeURIComponent(phone)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Status lookup failed.");

      const participant = result.participants?.[0];
      if (!participant) {
        setStatus(null);
        setMessage("No registration was found for that phone number.");
      } else {
        setStatus({
          name: participant.name || "",
          serialNumber: participant.serialNumber || "Not assigned",
          payment: participant.paymentStatus || "pending",
        });
      }
    } catch (error) {
      console.error("Registration status lookup failed:", error);
      setStatus(null);
      setMessage(error.message || "Could not check status right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Check Registration Status</h1>

      <div className="card">
        <div className="form-group">
          <label>Enter Mobile Number</label>
          <input
            type="text"
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Your registered mobile"
          />
        </div>

        <button className="btn-primary" onClick={checkStatus} disabled={loading}>
          {loading ? "Checking..." : "Check Status"}
        </button>

        {message && <p role="status">{message}</p>}

        {status && (
          <div className="status-box">
            <p><b>Name:</b> {status.name}</p>
            <p><b>Serial Number:</b> {status.serialNumber}</p>
            <p><b>Payment:</b> {status.payment}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationStatus;
