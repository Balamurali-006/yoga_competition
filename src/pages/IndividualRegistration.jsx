import React from "react";
import "../styles/form.css";
import RegistrationForm from "../components/participant/RegistrationForm";

const IndividualRegistration = () => {
  return (
    <div className="page-wrapper">

      <div className="card">
        <RegistrationForm />
      </div>
    </div>
  );
};

export default IndividualRegistration;
