import React from "react";
import "../styles/schoolRegistration.css";
import SchoolRegistrationTable from "../components/participant/SchoolRegistrationTable";

const SchoolRegistration = () => {
  return (
    <div className="school-wrapper">
      <div className="school-header">
        <h1 className="school-title">🏫 School / Group Registration</h1>
        <p className="school-subtitle">
          Register multiple participants at once for the Yoga Competition.
        </p>
      </div>

      <div className="school-card">
        <SchoolRegistrationTable />
      </div>
    </div>
  );
};

export default SchoolRegistration;
