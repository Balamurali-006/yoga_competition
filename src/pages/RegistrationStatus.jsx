import React, { useState } from "react";
import "../styles/form.css";

const RegistrationStatus = () => {
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState(null);

  const checkStatus = () => {
    setStatus({
      name: "Aarav",
      serialNumber: "DIST24-FWD-001",
      payment: "Success",
    });
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

        <button className="btn-primary" onClick={checkStatus}>
          Check Status
        </button>

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
